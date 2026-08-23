import { describe, expect, it } from "vitest";
import { generatedPlanSchema, planningChatInputSchema, planningSystemPrompt } from "./planning";

describe("مساعد فكّك الحواري", () => {
  it("يقبل رسالة حرة داخل مساحة عمل ومحادثة اختيارية", () => {
    const input = planningChatInputSchema.parse({ workspaceId: "workspace-example-123", conversationId: "conversation-123", message: "أريد قراءة كتاب اليوم." });
    expect(input.message).toContain("قراءة");
  });

  it("يفرض سؤال طريقة الجدولة ولا يفترض توزيعًا يوميًا", () => {
    const prompt = planningSystemPrompt("الأحد، 23 أغسطس 2026");
    expect(prompt).toContain("لا تفترض توزيعًا يوميًا");
    expect(prompt).toContain("تواريخ/أيام محددة");
  });

  it("يعامل المسلسل والتصفح كمهمات قابلة للتخطيط ولهما قياسات", () => {
    const prompt = planningSystemPrompt("الأحد، 23 أغسطس 2026", [{ kind: "preference", content: "يفضل جلسات قصيرة" }]);
    expect(prompt).toContain("المسلسلات");
    expect(prompt).toContain("التصفح");
  });

  it("يتحقق من خطوات خطة ذات موعد أو بدون موعد", () => {
    const plan = generatedPlanSchema.parse({ title: "قراءة كتاب", summary: "جلسة واحدة اليوم", scheduleMode: "today", scheduleNote: "تنفذ اليوم", steps: [{ order: 1, when: "اليوم", action: "اقرأ الصفحات 1–20", guidance: "توقف عند الصفحة 20.", quantity: "20 صفحة" }] });
    expect(plan.steps[0]?.when).toBe("اليوم");
  });
});
