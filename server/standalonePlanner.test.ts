import { describe, expect, it, vi } from "vitest";
import { normalizeStandalonePlan, requestStandalonePlan } from "../client/src/lib/standalonePlanner";

describe("ربط الواجهة العامة بـWorker فكّك", () => {
  it("يحوّل الخطة المنظمة إلى خطوات معروضة قابلة للتأشير", () => {
    expect(normalizeStandalonePlan({
      title: "قراءة اليوم",
      summary: "خطة قصيرة",
      steps: [{ title: "اقرأ الصفحات 1–12", detail: "دوّن فكرة واحدة", durationMinutes: 30 }],
    })).toMatchObject({
      scheduleMode: "flexible",
      steps: [{ order: 1, quantity: "30 دقيقة", action: "اقرأ الصفحات 1–12" }],
    });
  });

  it("يرسل الرسالة إلى Worker ولا يمرر أي مفتاح من المتصفح", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ message: "تم", needsClarification: false, plan: null }));
    await expect(requestStandalonePlan("https://fakkik-ai-api.example.workers.dev", "نفّذ المهمة")).resolves.toMatchObject({ message: "تم" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://fakkik-ai-api.example.workers.dev/v1/plan");
    expect(JSON.stringify(fetchMock.mock.calls[0]?.[1])).not.toContain("GEMINI_API_KEY");
    fetchMock.mockRestore();
  });
});
