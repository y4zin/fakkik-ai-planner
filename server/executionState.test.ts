import { describe, expect, it } from "vitest";
import { deriveExecutionState } from "../client/src/lib/executionState";

describe("احتساب لوحة التنفيذ", () => {
  const plan = { steps: [{ order: 1, action: "جهّز", quantity: "دقيقتان", when: "الآن" }, { order: 2, action: "راجع", quantity: "10 دقائق", when: "بعدها" }, { order: 3, action: "حلّ", quantity: "5 أسئلة", when: "بعدها" }], completedStepOrders: [1, 2] };

  it("يحسب كل مربع مؤشّر يدويًا ضمن الإنجازات", () => {
    const state = deriveExecutionState(plan, [], "conversation-1");
    expect(state.completed.map((step) => step.order)).toEqual([1, 2]);
    expect(state.later.map((step) => step.order)).toEqual([3]);
  });

  it("لا يعد جلسة عولج عائقها جلسة نشطة ولا يمنع الخطوة التالية", () => {
    const state = deriveExecutionState({ ...plan, completedStepOrders: [1] }, [{ id: "session-1", conversationId: "conversation-1", stepOrder: 2, stepTitle: "راجع", status: "needs_replan" }], "conversation-1");
    expect(state.active).toHaveLength(0);
    expect(state.later.map((step) => step.order)).toEqual([2, 3]);
  });
});
