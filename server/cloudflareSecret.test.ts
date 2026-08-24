import { describe, expect, it } from "vitest";

describe("رمز Cloudflare لخادم فكّك", () => {
  it("يتحقق من صلاحية الرمز عبر نقطة التحقق الرسمية دون تعديل أي مورد", async () => {
    const token = process.env.CLOUDFLARE_API_TOKEN;
    expect(token, "رمز CLOUDFLARE_API_TOKEN يجب أن يكون محفوظًا").toBeTruthy();

    const response = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.ok, `تعذر التحقق من رمز Cloudflare: ${response.status}`).toBe(true);
    const payload = (await response.json()) as { success?: boolean };
    expect(payload.success).toBe(true);
  }, 20_000);
});
