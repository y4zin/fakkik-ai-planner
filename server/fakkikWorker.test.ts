import { describe, expect, it, vi } from "vitest";
import worker from "../workers/fakkik-ai-api/src/index";

describe("Worker الذكاء الاصطناعي المستقل لفكّك", () => {
  it("يرد على preflight من رابط Pages ولا يفتح الوصول لمصدر مجهول", async () => {
    const preflight = await worker.fetch(
      new Request("https://fakkik-ai-api.workers.dev/v1/plan", {
        method: "OPTIONS",
        headers: { Origin: "https://y4zin.github.io" },
      }),
      { GEMINI_API_KEY: "test" },
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("https://y4zin.github.io");

    const denied = await worker.fetch(
      new Request("https://fakkik-ai-api.workers.dev/v1/plan", {
        method: "POST",
        headers: { Origin: "https://unknown.example", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "رتّب هذه المهمة" }),
      }),
      { GEMINI_API_KEY: "test" },
    );
    expect(denied.status).toBe(403);
  });

  it("يرسل طلبًا منظمًا إلى Gemini ولا يعيد المفتاح للعميل", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ message: "تم", needsClarification: false, plan: null }) }] } }],
      }),
    );

    const response = await worker.fetch(
      new Request("https://fakkik-ai-api.workers.dev/v1/plan", {
        method: "POST",
        headers: { Origin: "https://y4zin.github.io", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "نفّذ قراءة 12 صفحة", memories: ["يفضل جلسات قصيرة"] }),
      }),
      { GEMINI_API_KEY: "secret-value" },
    );

    expect(response.status).toBe(200);
    const publicBody = await response.clone().text();
    expect(await response.json()).toEqual({ message: "تم", needsClarification: false, plan: null });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("gemini-2.5-flash:generateContent");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("secret-value");
    expect(publicBody).not.toContain("secret-value");
    const upstreamBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      generationConfig: { responseSchema: { properties: { plan: { type: string; nullable: boolean } } } };
    };
    expect(upstreamBody.generationConfig.responseSchema.properties.plan).toEqual({
      type: "object",
      nullable: true,
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              detail: { type: "string" },
              durationMinutes: { type: "integer" },
            },
            required: ["title", "detail", "durationMinutes"],
          },
        },
      },
      required: ["title", "summary", "steps"],
    });
    fetchMock.mockRestore();
  });
});
