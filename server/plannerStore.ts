import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { plannerConversations, plannerFocusSessions, plannerMemories } from "../drizzle/schema";

export type StoredMessage = { role: "user" | "assistant"; content: string };
type BlockingSession = { stepTitle: string; status: "running" | "awaiting_reflection" | "completed" | "needs_replan" | "cancelled" };

export function focusStartBlocker(active: BlockingSession | undefined) {
  if (!active) return null;
  if (active.status === "running") return `أنهِ جلسة «${active.stepTitle}» أولًا؛ لا يمكن تشغيل مؤقتين معًا.`;
  if (active.status === "awaiting_reflection") return `أجب عن نتيجة جلسة «${active.stepTitle}» أولًا قبل بدء جلسة جديدة.`;
  return null;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("التخزين الدائم غير متاح حاليًا.");
  return db;
}

export async function createConversation(workspaceId: string, firstMessage: string) {
  const db = await requireDb();
  const id = nanoid();
  const title = firstMessage.trim().slice(0, 92) || "محادثة تخطيط جديدة";
  const messages: StoredMessage[] = [];
  await db.insert(plannerConversations).values({ id, workspaceId, title, messagesJson: JSON.stringify(messages) });
  return { id, workspaceId, title, messages, plan: null as unknown };
}

export async function getConversation(workspaceId: string, id: string) {
  const db = await requireDb();
  const [row] = await db.select().from(plannerConversations).where(and(eq(plannerConversations.id, id), eq(plannerConversations.workspaceId, workspaceId))).limit(1);
  if (!row) return null;
  return { ...row, messages: parseJson<StoredMessage[]>(row.messagesJson, []), plan: parseJson<unknown>(row.planJson, null) };
}

export async function saveConversation(input: { workspaceId: string; id: string; title?: string; messages: StoredMessage[]; plan?: unknown; status?: "draft" | "planned" | "archived" }) {
  const db = await requireDb();
  await db.update(plannerConversations).set({
    ...(input.title ? { title: input.title.slice(0, 400) } : {}),
    messagesJson: JSON.stringify(input.messages),
    ...(input.plan !== undefined ? { planJson: JSON.stringify(input.plan) } : {}),
    ...(input.status ? { status: input.status } : {}),
    updatedAt: new Date(),
  }).where(and(eq(plannerConversations.id, input.id), eq(plannerConversations.workspaceId, input.workspaceId)));
}

export async function listConversations(workspaceId: string) {
  const db = await requireDb();
  return db.select({ id: plannerConversations.id, title: plannerConversations.title, status: plannerConversations.status, updatedAt: plannerConversations.updatedAt, createdAt: plannerConversations.createdAt })
    .from(plannerConversations).where(eq(plannerConversations.workspaceId, workspaceId)).orderBy(desc(plannerConversations.updatedAt)).limit(60);
}

export async function listMemories(workspaceId: string) {
  const db = await requireDb();
  return db.select().from(plannerMemories).where(and(eq(plannerMemories.workspaceId, workspaceId), eq(plannerMemories.isActive, true))).orderBy(desc(plannerMemories.updatedAt)).limit(18);
}

export async function saveMemories(workspaceId: string, conversationId: string, memories: { kind: "preference" | "constraint" | "obstacle" | "success_pattern"; content: string }[]) {
  if (!memories.length) return;
  const db = await requireDb();
  const unique = Array.from(new Map(memories.map((item) => [`${item.kind}:${item.content.trim().toLowerCase()}`, item])).values()).slice(0, 5);
  for (const memory of unique) {
    const content = memory.content.trim().slice(0, 900);
    if (!content) continue;
    await db.insert(plannerMemories).values({ id: nanoid(), workspaceId, conversationId, kind: memory.kind, content });
  }
}

export async function deactivateMemory(workspaceId: string, id: string) {
  const db = await requireDb();
  await db.update(plannerMemories).set({ isActive: false, updatedAt: new Date() }).where(and(eq(plannerMemories.workspaceId, workspaceId), eq(plannerMemories.id, id)));
}

export async function startFocusSession(input: { workspaceId: string; conversationId: string; stepOrder: number; stepTitle: string; durationSeconds: number }) {
  const db = await requireDb();
  const now = Date.now();
  const expired = await db.select({ id: plannerFocusSessions.id }).from(plannerFocusSessions)
    .where(and(eq(plannerFocusSessions.workspaceId, input.workspaceId), eq(plannerFocusSessions.status, "running"), lte(plannerFocusSessions.endsAt, now))).limit(10);
  if (expired.length) await db.update(plannerFocusSessions).set({ status: "awaiting_reflection", updatedAt: new Date() }).where(inArray(plannerFocusSessions.id, expired.map((session) => session.id)));
  const active = await db.select({ id: plannerFocusSessions.id, stepTitle: plannerFocusSessions.stepTitle, status: plannerFocusSessions.status }).from(plannerFocusSessions)
    .where(and(eq(plannerFocusSessions.workspaceId, input.workspaceId), inArray(plannerFocusSessions.status, ["running", "awaiting_reflection"]))).limit(1);
  const blocker = focusStartBlocker(active[0]);
  if (blocker) throw new Error(blocker);
  const durationSeconds = Math.max(60, Math.min(input.durationSeconds, 86_400));
  const endsAt = now + durationSeconds * 1000;
  const id = nanoid();
  await db.insert(plannerFocusSessions).values({ id, workspaceId: input.workspaceId, conversationId: input.conversationId, stepOrder: input.stepOrder, stepTitle: input.stepTitle.slice(0, 400), durationSeconds, startedAt: now, endsAt, status: "running" });
  return { id, endsAt, durationSeconds, status: "running" as const, stepOrder: input.stepOrder, stepTitle: input.stepTitle };
}

export async function getActionableSessions(workspaceId: string) {
  const db = await requireDb();
  const now = Date.now();
  const expired = await db.select({ id: plannerFocusSessions.id }).from(plannerFocusSessions)
    .where(and(eq(plannerFocusSessions.workspaceId, workspaceId), eq(plannerFocusSessions.status, "running"), lte(plannerFocusSessions.endsAt, now))).limit(10);
  if (expired.length) await db.update(plannerFocusSessions).set({ status: "awaiting_reflection", updatedAt: new Date() }).where(inArray(plannerFocusSessions.id, expired.map((session) => session.id)));
  return db.select().from(plannerFocusSessions).where(and(eq(plannerFocusSessions.workspaceId, workspaceId), inArray(plannerFocusSessions.status, ["running", "awaiting_reflection", "needs_replan"]))).orderBy(desc(plannerFocusSessions.updatedAt)).limit(10);
}

export async function getConversationSessions(workspaceId: string, conversationId: string) {
  const db = await requireDb();
  const now = Date.now();
  const expired = await db.select({ id: plannerFocusSessions.id }).from(plannerFocusSessions)
    .where(and(eq(plannerFocusSessions.workspaceId, workspaceId), eq(plannerFocusSessions.conversationId, conversationId), eq(plannerFocusSessions.status, "running"), lte(plannerFocusSessions.endsAt, now))).limit(10);
  if (expired.length) await db.update(plannerFocusSessions).set({ status: "awaiting_reflection", updatedAt: new Date() }).where(inArray(plannerFocusSessions.id, expired.map((session) => session.id)));
  return db.select().from(plannerFocusSessions).where(and(eq(plannerFocusSessions.workspaceId, workspaceId), eq(plannerFocusSessions.conversationId, conversationId))).orderBy(desc(plannerFocusSessions.updatedAt)).limit(80);
}

export async function listWorkspaceSessions(workspaceId: string) {
  const db = await requireDb();
  const now = Date.now();
  const expired = await db.select({ id: plannerFocusSessions.id }).from(plannerFocusSessions)
    .where(and(eq(plannerFocusSessions.workspaceId, workspaceId), eq(plannerFocusSessions.status, "running"), lte(plannerFocusSessions.endsAt, now))).limit(10);
  if (expired.length) await db.update(plannerFocusSessions).set({ status: "awaiting_reflection", updatedAt: new Date() }).where(inArray(plannerFocusSessions.id, expired.map((session) => session.id)));
  return db.select().from(plannerFocusSessions).where(eq(plannerFocusSessions.workspaceId, workspaceId)).orderBy(desc(plannerFocusSessions.updatedAt)).limit(80);
}

export async function getFocusSession(workspaceId: string, sessionId: string) {
  const db = await requireDb();
  const [session] = await db.select().from(plannerFocusSessions).where(and(eq(plannerFocusSessions.workspaceId, workspaceId), eq(plannerFocusSessions.id, sessionId))).limit(1);
  return session ?? null;
}

export async function resolveFocusSession(input: { workspaceId: string; sessionId: string; outcome: "completed" | "needs_replan"; obstacle?: string }) {
  const db = await requireDb();
  const [session] = await db.select().from(plannerFocusSessions).where(and(eq(plannerFocusSessions.workspaceId, input.workspaceId), eq(plannerFocusSessions.id, input.sessionId))).limit(1);
  if (!session) throw new Error("الجلسة المطلوبة لم تعد موجودة.");
  await db.update(plannerFocusSessions).set({ status: input.outcome, obstacle: input.obstacle?.slice(0, 1500) ?? null, updatedAt: new Date() })
    .where(and(eq(plannerFocusSessions.workspaceId, input.workspaceId), eq(plannerFocusSessions.id, input.sessionId)));
  return session;
}
