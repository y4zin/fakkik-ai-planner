export interface WorkerEnv {
  GEMINI_API_KEY: string;
}

type PlanInput = {
  message?: unknown;
  memories?: unknown;
};

const allowedOrigins = new Set([
  "https://y4zin.github.io",
  "http://localhost:3000",
]);

const planSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
    needsClarification: { type: "boolean" },
    plan: {
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
    },
  },
  required: ["message", "needsClarification", "plan"],
} as const;

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !allowedOrigins.has(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function response(body: unknown, status: number, origin: string | null) {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders(origin),
      "Cache-Control": "no-store",
    },
  });
}

function isValidInput(value: PlanInput): value is { message: string; memories: string[] } {
  return (
    typeof value.message === "string" &&
    value.message.trim().length > 0 &&
    value.message.length <= 8_000 &&
    (value.memories === undefined ||
      (Array.isArray(value.memories) && value.memories.every((item) => typeof item === "string")))
  );
}

function planningInstruction(message: string, memories: string[]) {
  const rememberedContext = memories.length > 0 ? `\nذاكرة مفيدة سابقة:\n- ${memories.join("\n- ")}` : "";

  return `أنت محرك التخطيط العربي لتطبيق «فكّك». حوّل طلب المستخدم إلى خطة عملية دقيقة، ولا تخترع معلومات غير موجودة. افهم القراءة والمشاهدة والتصفح والدراسة والمهام المركبة. إذا نقصت معلومة تؤثر فعلاً في الخطة، ضع needsClarification=true واسأل سؤالًا واحدًا قصيرًا بالعربية في message، مع plan=null. إذا طلب المستخدم «نفّذ» أو قدّم قياسًا واضحًا، أنشئ الخطة مباشرة. كل خطوة يجب أن تكون قابلة للإنجاز، وتذكر المدة بالدقائق بصورة واقعية.\n\nطلب المستخدم:\n${message}${rememberedContext}`;
}

async function createPlan(input: { message: string; memories: string[] }, apiKey: string) {
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: planningInstruction(input.message, input.memories) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: planSchema,
          temperature: 0.35,
        },
      }),
    },
  );

  if (!geminiResponse.ok) {
    throw new Error(`Gemini upstream returned ${geminiResponse.status}`);
  }

  const upstream = (await geminiResponse.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = upstream.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no structured plan");

  return JSON.parse(text) as unknown;
}

const worker = {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const origin = request.headers.get("Origin");
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname !== "/v1/plan") {
      return response({ error: "المسار غير موجود." }, 404, origin);
    }

    if (request.method !== "POST") {
      return response({ error: "استخدم POST لإرسال طلب التخطيط." }, 405, origin);
    }

    if (origin && !allowedOrigins.has(origin)) {
      return response({ error: "مصدر الطلب غير مسموح." }, 403, origin);
    }

    let input: PlanInput;
    try {
      input = await request.json();
    } catch {
      return response({ error: "أرسل طلب التخطيط بصيغة JSON صحيحة." }, 400, origin);
    }

    if (!isValidInput(input)) {
      return response({ error: "اكتب رسالة واضحة لا تتجاوز 8000 حرف." }, 400, origin);
    }

    try {
      const plan = await createPlan({ message: input.message.trim(), memories: input.memories ?? [] }, env.GEMINI_API_KEY);
      return response(plan, 200, origin);
    } catch (error) {
      console.error("[fakkik-ai-api] Gemini planning failed", error);
      return response(
        { error: "تعذّر الوصول إلى محرّك التخطيط الآن. أعد المحاولة بعد قليل." },
        503,
        origin,
      );
    }
  },
};

export default worker;
