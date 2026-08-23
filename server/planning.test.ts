import { describe, expect, it } from "vitest";
import { generatedPlanSchema, planningChatInputSchema, planningSystemPrompt } from "./planning";

describe("مساعد فكّك الحواري", () => {
  it("يقبل محادثة قصيرة ويحافظ على ترتيب الأدوار", () => {
    const input = planningChatInputSchema.parse({ messages: [
      { role: "assistant", content: "ما المهمة؟" },
      { role: "user", content: "أريد قراءة كتاب اليوم." },
    ] });
    expect(input.messages).toHaveLength(2);
  });

  it("يفرض ظهور خيارات الجدولة بدل افتراض التوزيع اليومي", () => {
    const prompt = planningSystemPrompt("الأحد، 23 أغسطس 2026");
    expect(prompt).toContain("هل تريد إنجازها اليوم، في تواريخ/أيام محددة، أم بدون مواعيد مرنة؟");
    expect(prompt).toContain("لا تفترض أن المستخدم يريد توزيعًا يوميًا");
  });

  it("يتحقق من خطوات خطة ذات موعد أو بدون موعد", () => {
    const plan = generatedPlanSchema.parse({
      title: "قراءة كتاب", summary: "جلسة واحدة اليوم", scheduleMode: "today", scheduleNote: "تنفذ اليوم",
      steps: [{ order: 1, when: "اليوم", action: "اقرأ الصفحات 1–20", guidance: "توقف عند الصفحة 20.", quantity: "20 صفحة" }],
    });
    expect(plan.steps[0]?.when).toBe("اليوم");
  });
});
