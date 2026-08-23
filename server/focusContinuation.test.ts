import { describe, expect, it } from "vitest";
import { nextIncompleteStep } from "./plannerStore";

describe("الاستمرار المتسلسل", () => {
  const steps = [
    { order: 1, action: "الخطوة الأولى", quantity: "5 دقائق" },
    { order: 2, action: "الخطوة الثانية", quantity: "10 دقائق" },
    { order: 3, action: "الخطوة الثالثة", quantity: "4 دقائق" },
  ];

  it("يختار أول خطوة غير مكتملة بالترتيب", () => {
    expect(nextIncompleteStep(steps, [1])?.order).toBe(2);
    expect(nextIncompleteStep(steps, [1, 2])?.order).toBe(3);
  });

  it("يتوقف عند اكتمال كل الخطة", () => {
    expect(nextIncompleteStep(steps, [1, 2, 3])).toBeNull();
  });
});
