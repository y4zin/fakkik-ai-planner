import { describe, expect, it } from "vitest";

describe("مفتاح Gemini لخادم فكّك", () => {
  it("يتحقق من المفتاح عبر قائمة النماذج الرسمية دون توليد محتوى", async () => {
    const apiKey = process.env.GEMINI_API_KEY;

    expect(apiKey, "مفتاح GEMINI_API_KEY يجب أن يكون محفوظًا").toBeTruthy();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey ?? "")}`,
    );

    expect(response.ok, `تعذر التحقق من مفتاح Gemini: ${response.status}`).toBe(true);
    const payload = (await response.json()) as { models?: unknown[] };
    expect(Array.isArray(payload.models)).toBe(true);
  }, 20_000);
});
