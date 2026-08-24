import { describe, expect, it } from "vitest";
import { userFacingErrorMessage } from "../shared/userFacingError";

describe("رسائل أخطاء الواجهة", () => {
  it("يبقي الرسالة العربية المفيدة ويخفي تفاصيل التحقق التقنية", () => {
    expect(userFacingErrorMessage(new Error("الوضع الصارم نشط؛ لا يمكن إلغاء الجلسة."), "تعذر الإجراء.")).toContain("الوضع الصارم");
    expect(userFacingErrorMessage(new Error("ZodError: Expected number"), "تعذر الإجراء.")).toBe("تعذر الإجراء.");
  });
});
