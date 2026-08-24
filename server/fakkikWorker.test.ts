import { describe, expect, it, vi } from "vitest";
import worker, { ambiguousShortReplyNeedsClarification, applyPlanningPolicy, planningInstruction, requestedDurationMinutes, splitLongSteps, walkingPreferenceFromDialogue } from "../workers/fakkik-ai-api/src/index";

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

  it("يعيد سؤالًا محددًا من النموذج عندما تتغير الخطة بمعلومة ناقصة ولا يفرض سؤالين قالبين", async () => {
    expect(planningInstruction("أريد أمشي 45 دقيقة", [], [])).toContain("لا تسأل سؤالًا إلا إذا كانت إجابته ستغيّر");
    expect(planningInstruction("مريح", [], [])).toContain("لا تحوّل ردًا قصيرًا مثل «مريح»");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ message: "هل هذه جلسة واحدة اليوم أم برنامج متكرر؟", needsClarification: true, plan: null }) }] } }] }));
    const response = await worker.fetch(
      new Request("https://fakkik-ai-api.workers.dev/v1/plan", { method: "POST", headers: { Origin: "https://y4zin.github.io", "Content-Type": "application/json" }, body: JSON.stringify({ message: "أريد أمشي 54 دقيقة", messages: [] }) }),
      { GEMINI_API_KEY: "secret-value" },
    );
    expect(await response.json()).toEqual({ message: "هل هذه جلسة واحدة اليوم أم برنامج متكرر؟", needsClarification: true, plan: null });
    expect(fetchMock).toHaveBeenCalledOnce();
    fetchMock.mockRestore();
  });

  it("يفكك المدة الطويلة إلى جلسات لا تتجاوز عشرين دقيقة", () => {
    expect(splitLongSteps([{ title: "المشي", detail: "امشِ بإيقاع مريح.", durationMinutes: 54 }])).toEqual([
      expect.objectContaining({ title: "المشي — الجزء 1/3", durationMinutes: 20 }),
      expect.objectContaining({ title: "المشي — الجزء 2/3", durationMinutes: 20 }),
      expect.objectContaining({ title: "المشي — الجزء 3/3", durationMinutes: 14 }),
    ]);
  });

  it("يضبط خطة المشي المحددة زمنيًا لتشمل إحماء وفواصل وتهدئة بمجموع المدة المطلوبة", () => {
    expect(requestedDurationMinutes("أمشي ٥٤ دقيقة اليوم")).toBe(54);
    const reply = applyPlanningPolicy({
      message: "هذه خطة عامة.",
      needsClarification: false,
      plan: { title: "مشي", summary: "مشي", steps: [{ title: "امشِ", detail: "امشِ براحة.", durationMinutes: 54 }] },
    }, "أريد المشي 54 دقيقة اليوم، وأنا مبتدئ. أريدها مريحة مع فواصل 3 دقائق. نفّذ خطة واحدة متصلة فيها إحماء وفواصل وتهدئة.", []);
    expect(reply.needsClarification).toBe(false);
    expect(reply.plan?.steps.reduce((sum, step) => sum + step.durationMinutes, 0)).toBe(54);
    expect(reply.plan?.steps.every((step) => step.durationMinutes <= 20)).toBe(true);
    expect(reply.plan?.steps.some((step) => /إحماء/.test(step.title))).toBe(true);
    expect(reply.plan?.steps.some((step) => /فاصل/.test(step.title))).toBe(true);
    expect(reply.plan?.steps.some((step) => /تهدئة/.test(step.title))).toBe(true);
    expect(reply.plan?.steps.some((step) => step.durationMinutes === 3 && /فاصل/.test(step.title))).toBe(true);
    expect(reply.plan?.steps.some((step) => /مريح/.test(step.title))).toBe(true);
  });

  it("يستخرج شدة المشي وفاصل الراحة من الردود السابقة في الحوار", () => {
    expect(walkingPreferenceFromDialogue("نفّذ الخطة", [{ role: "user", content: "أريدها مريحة مع راحة 4 دقائق بين الجولات" }])).toMatchObject({
      label: "مريح",
      breakMinutes: 4,
    });
  });

  it("لا يسمح للرد القصير الملتبس بأن يتحول إلى خطة من دون سؤال سابق يفسره", () => {
    const rawPlan = { message: "خطة", needsClarification: false, plan: { title: "خطة", summary: "ملخص", steps: [{ title: "خطوة", detail: "تفصيل", durationMinutes: 10 }] } };
    expect(ambiguousShortReplyNeedsClarification("مريح", [])).toBe(true);
    expect(applyPlanningPolicy(rawPlan, "مريح", [])).toMatchObject({ needsClarification: true, plan: null });
    expect(ambiguousShortReplyNeedsClarification("مريح", [{ role: "assistant", content: "هل تريد الإيقاع مريحًا أم سريعًا؟" }])).toBe(false);
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
        body: JSON.stringify({ message: "أريد فهمًا عميقًا في جلسات 15 دقيقة", memories: ["يفضل جلسات قصيرة"], messages: [{ role: "user", content: "أريد القراءة اليوم" }, { role: "assistant", content: "كم صفحة؟" }, { role: "user", content: "12 صفحة" }, { role: "assistant", content: "هل تريد فهمًا عميقًا؟" }, { role: "user", content: "أريد فهمًا عميقًا في جلسات 15 دقيقة" }] }),
      }),
      { GEMINI_API_KEY: "secret-value" },
    );

    expect(response.status).toBe(200);
    const publicBody = await response.clone().text();
    expect(await response.json()).toEqual({ message: "تم", needsClarification: true, plan: null });
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
              durationMinutes: { type: "integer", minimum: 1, maximum: 20 },
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
