import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { generatedPlanSchema, planningChatInputSchema, planConversation, visibleAssistantContent } from "./planning";
import { createConversation, deactivateMemory, getActionableSessions, getConversation, getConversationSessions, getFocusSession, listConversations, listMemories, listWorkspaceSessions, resolveFocusSession, saveConversation, saveMemories, startFocusSession, type StoredMessage } from "./plannerStore";
import { persistUserTurnBeforePlanning } from "./chatTurn";

const workspaceSchema = z.object({ workspaceId: z.string().min(12).max(64) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const options = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...options, maxAge: -1 }); return { success: true } as const; }),
  }),
  planning: router({
    chat: publicProcedure.input(planningChatInputSchema).mutation(async ({ input }) => {
      const conversation = input.conversationId ? await getConversation(input.workspaceId, input.conversationId) : await createConversation(input.workspaceId, input.message);
      if (!conversation) throw new Error("هذه المحادثة غير موجودة.");
      const memories = await listMemories(input.workspaceId);
      const history = conversation.messages as StoredMessage[];
      const updatedHistory = await persistUserTurnBeforePlanning({ workspaceId: input.workspaceId, message: input.message, conversation: { id: conversation.id, title: conversation.title, messages: history, plan: conversation.plan }, saveConversation });
      const reply = await planConversation(updatedHistory, memories.map((item) => ({ kind: item.kind, content: item.content })));
      const assistantContent = visibleAssistantContent(reply);
      const messages = [...updatedHistory, { role: "assistant" as const, content: assistantContent }];
      await saveConversation({ workspaceId: input.workspaceId, id: conversation.id, title: conversation.title === "محادثة تخطيط جديدة" ? input.message : undefined, messages, plan: reply.plan ?? conversation.plan, status: reply.plan ? "planned" : "draft" });
      await saveMemories(input.workspaceId, conversation.id, reply.memories);
      return { ...reply, conversationId: conversation.id, messages };
    }),
    list: publicProcedure.input(workspaceSchema).query(({ input }) => listConversations(input.workspaceId)),
    get: publicProcedure.input(workspaceSchema.extend({ conversationId: z.string().min(6).max(64) })).query(async ({ input }) => getConversation(input.workspaceId, input.conversationId)),
    updatePlan: publicProcedure.input(workspaceSchema.extend({ conversationId: z.string().min(6).max(64), plan: generatedPlanSchema.extend({ completedStepOrders: z.array(z.number().int().min(1)).max(40).optional() }) })).mutation(async ({ input }) => {
      const conversation = await getConversation(input.workspaceId, input.conversationId);
      if (!conversation) throw new Error("لا يمكن تعديل خطة غير موجودة.");
      await saveConversation({ workspaceId: input.workspaceId, id: input.conversationId, messages: conversation.messages as StoredMessage[], plan: input.plan, status: "planned" });
      return { success: true } as const;
    }),
    memories: publicProcedure.input(workspaceSchema).query(({ input }) => listMemories(input.workspaceId)),
    forgetMemory: publicProcedure.input(workspaceSchema.extend({ memoryId: z.string().min(6).max(64) })).mutation(async ({ input }) => { await deactivateMemory(input.workspaceId, input.memoryId); return { success: true } as const; }),
    repair: publicProcedure.input(workspaceSchema.extend({ conversationId: z.string().min(6).max(64).optional(), sessionId: z.string().min(6).max(64), stepTitle: z.string().min(1).max(400), obstacle: z.string().min(3).max(1500) })).mutation(async ({ input }) => {
      const session = await getFocusSession(input.workspaceId, input.sessionId);
      const conversationId = input.conversationId ?? session?.conversationId;
      if (!conversationId) throw new Error("تعذر العثور على المحادثة المرتبطة بهذه الجلسة.");
      const conversation = await getConversation(input.workspaceId, conversationId);
      if (!conversation) throw new Error("تعذر العثور على سياق الخطوة.");
      await resolveFocusSession({ workspaceId: input.workspaceId, sessionId: input.sessionId, outcome: "needs_replan", obstacle: input.obstacle });
      await saveMemories(input.workspaceId, conversationId, [{ kind: "obstacle", content: `عائق في خطوة «${input.stepTitle}»: ${input.obstacle}` }]);
      const memories = await listMemories(input.workspaceId);
      const history = conversation.messages as StoredMessage[];
      const repairMessage = `لم أُكمل خطوة «${input.stepTitle}». العائق: ${input.obstacle}. أعد تخطيط ما يلزم بصورة واقعية.`;
      const updatedHistory = [...history, { role: "user" as const, content: repairMessage }];
      const storedPlan = conversation.plan as { title?: string; scheduleNote?: string; summary?: string; completedStepOrders?: number[] } | null;
      const repairContext = `الخطة الحالية: ${storedPlan?.title ?? "خطة المستخدم"}. ${storedPlan?.scheduleNote ?? ""} ${storedPlan?.summary ?? ""}. الخطوة التي تحتاج تعديلًا: «${input.stepTitle}». حافظ على ما اكتمل (${storedPlan?.completedStepOrders?.join(", ") || "لا شيء"})، واجعل الفواصل التالية اختيارية/أبسط ما لم تتعارض مع هدف المستخدم.`;
      const reply = await planConversation(updatedHistory, memories.map((item) => ({ kind: item.kind, content: item.content })), repairContext, "low");
      const assistantContent = visibleAssistantContent(reply);
      const messages = [...updatedHistory, { role: "assistant" as const, content: assistantContent }];
      await saveConversation({ workspaceId: input.workspaceId, id: conversation.id, messages, plan: reply.plan ?? conversation.plan, status: reply.plan ? "planned" : "draft" });
      await saveMemories(input.workspaceId, conversationId, reply.memories);
      return { ...reply, conversationId: conversation.id, messages };
    }),
  }),
  focus: router({
    start: publicProcedure.input(workspaceSchema.extend({ conversationId: z.string().min(6).max(64), stepOrder: z.number().int().min(1), stepTitle: z.string().min(1).max(400), durationSeconds: z.number().int().min(60).max(86_400) })).mutation(({ input }) => startFocusSession(input)),
    actionable: publicProcedure.input(workspaceSchema).query(({ input }) => getActionableSessions(input.workspaceId)),
    listWorkspace: publicProcedure.input(workspaceSchema).query(({ input }) => listWorkspaceSessions(input.workspaceId)),
    listForConversation: publicProcedure.input(workspaceSchema.extend({ conversationId: z.string().min(6).max(64) })).query(({ input }) => getConversationSessions(input.workspaceId, input.conversationId)),
    resolve: publicProcedure.input(workspaceSchema.extend({ sessionId: z.string().min(6).max(64), outcome: z.enum(["completed", "needs_replan"]), obstacle: z.string().max(1500).optional() })).mutation(async ({ input }) => {
      const session = await resolveFocusSession(input);
      if (input.outcome === "completed" && session) {
        const conversation = await getConversation(input.workspaceId, session.conversationId);
        const storedPlan = conversation?.plan as { completedStepOrders?: number[] } | null;
        if (conversation && storedPlan) {
          const completed = storedPlan.completedStepOrders ?? [];
          const plan = { ...storedPlan, completedStepOrders: completed.includes(session.stepOrder) ? completed : [...completed, session.stepOrder] };
          await saveConversation({ workspaceId: input.workspaceId, id: conversation.id, messages: conversation.messages as StoredMessage[], plan, status: "planned" });
        }
      }
      return { success: true, conversationId: session?.conversationId ?? null } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
