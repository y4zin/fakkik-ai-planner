import { describe, expect, it } from "vitest";
import { persistUserTurnBeforePlanning } from "./chatTurn";

describe("الحفظ الفوري لرسالة التخطيط", () => {
  it("يحفظ رسالة المستخدم قبل أي مرحلة استدلال لاحقة", async () => {
    const persisted: unknown[] = [];
    const messages = await persistUserTurnBeforePlanning({
      workspaceId: "workspace-test",
      message: "نفّذ خطة مراجعة الآن",
      conversation: { id: "conversation-test", title: "خطة مراجعة", messages: [{ role: "assistant", content: "ابدأ متى تريد." }], plan: null },
      saveConversation: async (input) => { persisted.push(input); },
    });
    expect(messages.at(-1)).toEqual({ role: "user", content: "نفّذ خطة مراجعة الآن" });
    expect(persisted).toHaveLength(1);
    expect((persisted[0] as { messages: unknown[] }).messages).toEqual(messages);
  });
});
