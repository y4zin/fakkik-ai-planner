import { describe, expect, it } from "vitest";
import { durationFromText } from "./plannerStore";

describe("تحليل مدد خطوات الخطة", () => {
  it("يفهم الثواني والدقائق والساعات ضمن حدود جلسة التركيز", () => {
    expect(durationFromText("93 ثانية")).toBe(93);
    expect(durationFromText("1 ثانية")).toBe(60);
    expect(durationFromText("38 دقيقة")).toBe(2_280);
    expect(durationFromText("3 ساعات")).toBe(10_800);
  });
});
