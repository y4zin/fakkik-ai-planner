export type ExecutionPlan = {
  steps: { order: number; action: string; guidance: string; quantity: string; when: string }[];
  completedStepOrders?: number[];
};

export type ExecutionSession = {
  id: string;
  conversationId?: string;
  stepOrder: number;
  stepTitle: string;
  status: "running" | "awaiting_reflection" | "completed" | "needs_replan" | "cancelled";
};

/** حالة لوحة التنفيذ تعتمد على مربعات الخطة المؤشرة، لا على المؤقتات وحدها. */
export function deriveExecutionState(plan: ExecutionPlan | null, sessions: ExecutionSession[], conversationId: string | null) {
  const completedOrders = new Set(plan?.completedStepOrders ?? []);
  const planSessions = sessions.filter((item) => item.conversationId === conversationId);
  const completed = plan?.steps.filter((step) => completedOrders.has(step.order)) ?? [];
  const active = planSessions.filter((item) => ["running", "awaiting_reflection"].includes(item.status));
  const later = plan?.steps.filter((step) => !completedOrders.has(step.order) && !active.some((item) => item.stepOrder === step.order)) ?? [];
  return { completed, active, later };
}
