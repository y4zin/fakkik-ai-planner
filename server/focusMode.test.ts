import { describe, expect, it } from "vitest";
import { strictDurationFor } from "../client/src/lib/strictMode";
import { strictCancelBlocker, strictModeChangeBlocker } from "./plannerStore";

describe("قواعد الوضع الصارم", () => {
  it("يفهم صيغ المدة العربية المرنة", () => {
    expect(strictDurationFor("10 ساعات")).toBe(36_000);
    expect(strictDurationFor("٣٨ دقيقة")).toBe(2_280);
    expect(strictDurationFor("10 أيام")).toBe(864_000);
    expect(strictDurationFor("93 ثانية")).toBe(93);
  });

  it("يمنع إلغاء الجلسة فقط قبل انتهاء القفل", () => {
    expect(strictCancelBlocker(5_000, 4_999)).toContain("الوضع الصارم");
    expect(strictCancelBlocker(5_000, 5_000)).toBeNull();
    expect(strictCancelBlocker(null, 4_000)).toBeNull();
  });

  it("لا يسمح بتقصير أو تعطيل القفل من أي واجهة قبل انتهاء وقته", () => {
    expect(strictModeChangeBlocker(5_000, 60, 4_999)).toContain("لا يمكن تعديل");
    expect(strictModeChangeBlocker(5_000, null, 4_999)).toContain("لا يمكن تعديل");
    expect(strictModeChangeBlocker(5_000, undefined, 4_999)).toBeNull();
    expect(strictModeChangeBlocker(5_000, null, 5_000)).toBeNull();
  });
});
