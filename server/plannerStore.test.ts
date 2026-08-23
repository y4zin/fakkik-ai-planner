import { describe, expect, it } from "vitest";
import { focusStartBlocker } from "./plannerStore";

describe("تسلسل جلسات التركيز", () => {
  it("يسمح ببدء جلسة عندما لا توجد جلسة معلقة", () => {
    expect(focusStartBlocker(undefined)).toBeNull();
  });

  it("يمنع تشغيل مؤقت ثانٍ أثناء عمل المؤقت الأول", () => {
    expect(focusStartBlocker({ status: "running", stepTitle: "قراءة 20 صفحة" })).toContain("لا يمكن تشغيل مؤقتين");
  });

  it("يتطلب الإجابة عن الجلسة المنتهية قبل بدء التالية", () => {
    expect(focusStartBlocker({ status: "awaiting_reflection", stepTitle: "حلقة المساء" })).toContain("أجب عن نتيجة");
  });
});
