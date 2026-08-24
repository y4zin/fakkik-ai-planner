import type { ConversationPlanData } from "@/components/ConversationPlan";

export type StandaloneMessage = { role: "user" | "assistant"; content: string };
export type StandaloneConversation = {
  id: string;
  title: string;
  messages: StandaloneMessage[];
  plan: ConversationPlanData | null;
  updatedAt: number;
};

export type StandalonePlannerReply = {
  message: string;
  needsClarification: boolean;
  plan: {
    title: string;
    summary: string;
    steps: Array<{ title: string; detail: string; durationMinutes: number }>;
  } | null;
};

export function standaloneConversationTitle(messages: StandaloneMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user")?.content.trim();
  return firstUserMessage ? firstUserMessage.slice(0, 54) : "محادثة جديدة";
}

export function upsertStandaloneConversation(conversations: StandaloneConversation[], next: StandaloneConversation) {
  return [next, ...conversations.filter((conversation) => conversation.id !== next.id)].sort((first, second) => second.updatedAt - first.updatedAt);
}

export function normalizeStandalonePlan(plan: NonNullable<StandalonePlannerReply["plan"]>): ConversationPlanData {
  return {
    title: plan.title,
    summary: plan.summary,
    scheduleMode: "flexible",
    scheduleNote: "خطة مرنة؛ ابدأ بالخطوة التي تناسبك الآن.",
    completedStepOrders: [],
    steps: plan.steps.map((step, index) => ({
      order: index + 1,
      when: "عند البدء",
      action: step.title,
      guidance: step.detail,
      quantity: `${Math.max(1, step.durationMinutes)} دقيقة`,
    })),
  };
}

export async function requestStandalonePlan(endpoint: string, message: string, memories: string[] = [], messages: StandaloneMessage[] = []) {
  const response = await fetch(`${endpoint.replace(/\/$/, "")}/v1/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, memories, messages }),
  });

  const payload = (await response.json().catch(() => null)) as StandalonePlannerReply | { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload && "error" in payload ? payload.error ?? "تعذّر الوصول إلى محرّك التخطيط." : "تعذّر الوصول إلى محرّك التخطيط.");
  }

  return payload as StandalonePlannerReply;
}
