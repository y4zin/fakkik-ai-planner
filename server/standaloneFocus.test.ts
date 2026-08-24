import { describe, expect, it } from "vitest";
import { advanceStandaloneFocusState, createStandaloneFocusSession, emptyStandaloneFocusState, isStandaloneStrictActive, readStandaloneFocusState } from "../client/src/lib/standaloneFocus";

describe("جلسات فكّك المحلية لنسخة Pages", () => {
  it("ينشئ جلسة بوقت نهاية حقيقي ويحوّلها إلى سؤال إكمال بعد انتهائها", () => {
    const session = createStandaloneFocusSession({ stepOrder: 2, stepTitle: "جلسة مشي", durationSeconds: 90, now: 1_000 });
    expect(session.endsAt).toBe(91_000);
    expect(advanceStandaloneFocusState({ ...emptyStandaloneFocusState, session }, 91_000).session?.status).toBe("awaiting_reflection");
  });

  it("يحفظ القفل الصارم ويزيله تلقائيًا عند انتهاء وقته", () => {
    const state = { ...emptyStandaloneFocusState, strictEndsAt: 10_000 };
    expect(isStandaloneStrictActive(state, 9_999)).toBe(true);
    expect(advanceStandaloneFocusState(state, 10_000).strictEndsAt).toBeNull();
    expect(readStandaloneFocusState("not-json")).toEqual(emptyStandaloneFocusState);
  });
});
