export interface WorkerEnv {
  GEMINI_API_KEY: string;
}

type DialogueTurn = { role?: unknown; content?: unknown };
type PlanInput = { message?: unknown; memories?: unknown; messages?: unknown };
type PlannerStep = { title: string; detail: string; durationMinutes: number };
type PlannerReply = { message: string; needsClarification: boolean; plan: { title: string; summary: string; steps: PlannerStep[] } | null };

const allowedOrigins = new Set(["https://y4zin.github.io", "http://localhost:3000"]);
const maxSessionMinutes = 20;

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
              durationMinutes: { type: "integer", minimum: 1, maximum: maxSessionMinutes },
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
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
}

function response(body: unknown, status: number, origin: string | null) {
  return Response.json(body, { status, headers: { ...corsHeaders(origin), "Cache-Control": "no-store" } });
}

function isValidTurn(value: unknown): value is { role: "user" | "assistant"; content: string } {
  return Boolean(value && typeof value === "object" && ((value as DialogueTurn).role === "user" || (value as DialogueTurn).role === "assistant") && typeof (value as DialogueTurn).content === "string");
}

function isValidInput(value: PlanInput): value is { message: string; memories: string[]; messages: Array<{ role: "user" | "assistant"; content: string }> } {
  return typeof value.message === "string" && value.message.trim().length > 0 && value.message.length <= 8_000
    && (value.memories === undefined || (Array.isArray(value.memories) && value.memories.every((item) => typeof item === "string")))
    && (value.messages === undefined || (Array.isArray(value.messages) && value.messages.every(isValidTurn)));
}

function clarificationQuestion(message: string, priorUserTurns: number) {
  const text = message.toLowerCase();
  if (/(مشي|أمشي|جري|رياض)/.test(text)) {
    return priorUserTurns === 0
      ? "قبل أن أبني الخطة: ما هدفك من المشي تحديدًا—صحة عامة، تحسين لياقة، تخفيف وزن، أم مشي مريح؟"
      : "سؤال أخير للدقة: ما مستواك الآن، وهل تفضّل مشيًا متصلًا أم فواصل قصيرة مع إحماء وتهدئة؟";
  }
  if (/(كتاب|قراءة|صفحة)/.test(text)) {
    return priorUserTurns === 0
      ? "قبل أن أقسم القراءة: كم صفحة أو فصلًا تريد إنهاءه، وهل تريد الإنجاز اليوم أم على فترة؟"
      : "سؤال أخير للدقة: هل هدفك فهم عميق مع تدوين أم قراءة أسرع، وكم دقيقة تستطيع التركيز في الجلسة الواحدة؟";
  }
  if (/(حلقة|مسلسل|مشاهدة)/.test(text)) {
    return priorUserTurns === 0
      ? "قبل تنظيم المشاهدة: كم حلقة وكم مدة الحلقة، ومتى تريد أن تنهيها؟"
      : "سؤال أخير للدقة: هل تريد فواصل بين الحلقات أم مشاهدة متتابعة، وما الوقت المتاح لديك؟";
  }
  return priorUserTurns === 0
    ? "قبل أن أبني الخطة: ما النتيجة المحددة التي تريد الوصول إليها، ومتى تريد إتمامها؟"
    : "سؤال أخير للدقة: كم وقت لديك في كل جلسة، وما العائق أو التفضيل الذي يجب أن أبني الخطة حوله؟";
}

function planningInstruction(message: string, memories: string[], messages: Array<{ role: "user" | "assistant"; content: string }>) {
  const rememberedContext = memories.length > 0 ? `\nذاكرة مفيدة سابقة:\n- ${memories.join("\n- ")}` : "";
  const dialogue = messages.length > 0 ? `\nسياق الحوار السابق:\n${messages.map((turn) => `${turn.role === "user" ? "المستخدم" : "فكّك"}: ${turn.content}`).join("\n")}` : "";
  return `أنت محرك التخطيط العربي لتطبيق «فكّك». مهمتك ليست إعطاء نصيحة عامة؛ بل بناء خطة دقيقة قابلة للتأشير. افهم القراءة والمشاهدة والتصفح والدراسة والمهام المركبة.

قد طُرحت على المستخدم بالفعل مرحلتا استيضاح أساسيتان. استعمل الإجابات والسياق، ولا تكرر سؤالًا أجيب عنه. إن بقيت معلومة حاسمة ناقصة فقط، أعد needsClarification=true واسأل سؤالًا واحدًا قصيرًا مع plan=null. وإلا أنشئ الخطة الآن.

قواعد الخطة الإلزامية: لا توجد خطوة أطول من ${maxSessionMinutes} دقيقة. فكك كل نشاط مدته أطول إلى جلسات متتابعة صغيرة، وأضف عند الحاجة إحماءً أو استراحة أو مراجعة. كل خطوة لها فعل واضح، ناتج أو إرشاد عملي، ومدة واقعية. لا تضف تاريخًا أو أيامًا لم يذكرها المستخدم.

طلب المستخدم الحالي:\n${message}${dialogue}${rememberedContext}`;
}

export function splitLongSteps(steps: PlannerStep[]): PlannerStep[] {
  return steps.flatMap((step) => {
    const duration = Math.max(1, Math.round(step.durationMinutes));
    if (duration <= maxSessionMinutes) return [{ ...step, durationMinutes: duration }];
    const parts = Math.ceil(duration / maxSessionMinutes);
    return Array.from({ length: parts }, (_, index) => {
      const remaining = duration - index * maxSessionMinutes;
      return {
        title: `${step.title} — الجزء ${index + 1}/${parts}`,
        detail: `${step.detail} ركّز على الجزء ${index + 1} ثم قيّم استعدادك للجزء التالي.`,
        durationMinutes: Math.min(maxSessionMinutes, remaining),
      };
    });
  });
}

export function applyPlanningPolicy(raw: unknown, message: string, priorUserTurns: number): PlannerReply {
  if (priorUserTurns <= 2) return { message: clarificationQuestion(message, Math.max(0, priorUserTurns - 1)), needsClarification: true, plan: null };
  const reply = raw as Partial<PlannerReply>;
  const rawPlan = reply.plan;
  if (!rawPlan || typeof rawPlan !== "object" || !Array.isArray((rawPlan as { steps?: unknown }).steps)) {
    return { message: typeof reply.message === "string" ? reply.message : "أحتاج تفصيلًا أخيرًا كي أبني خطة دقيقة.", needsClarification: true, plan: null };
  }
  const plan = rawPlan as { title?: unknown; summary?: unknown; steps: Array<Partial<PlannerStep>> };
  const steps = splitLongSteps(plan.steps.filter((step): step is PlannerStep => typeof step.title === "string" && typeof step.detail === "string" && typeof step.durationMinutes === "number"));
  if (steps.length === 0) return { message: "أحتاج تفصيلًا أخيرًا كي أبني خطوات قابلة للتنفيذ.", needsClarification: true, plan: null };
  return {
    message: typeof reply.message === "string" ? reply.message : "كوّنت لك خطة مفصلة قابلة للتأشير.",
    needsClarification: false,
    plan: { title: typeof plan.title === "string" ? plan.title : "خطة فكّك", summary: typeof plan.summary === "string" ? plan.summary : "خطة مقسمة إلى جلسات صغيرة.", steps },
  };
}

async function createPlan(input: { message: string; memories: string[]; messages: Array<{ role: "user" | "assistant"; content: string }> }, apiKey: string) {
  const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: planningInstruction(input.message, input.memories, input.messages) }] }], generationConfig: { responseMimeType: "application/json", responseSchema: planSchema, temperature: 0.25 } }),
  });
  if (!geminiResponse.ok) throw new Error(`Gemini upstream returned ${geminiResponse.status}`);
  const upstream = (await geminiResponse.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = upstream.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no structured plan");
  return JSON.parse(text) as unknown;
}

const worker = {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const origin = request.headers.get("Origin");
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (url.pathname !== "/v1/plan") return response({ error: "المسار غير موجود." }, 404, origin);
    if (request.method !== "POST") return response({ error: "استخدم POST لإرسال طلب التخطيط." }, 405, origin);
    if (origin && !allowedOrigins.has(origin)) return response({ error: "مصدر الطلب غير مسموح." }, 403, origin);
    let input: PlanInput;
    try { input = await request.json(); } catch { return response({ error: "أرسل طلب التخطيط بصيغة JSON صحيحة." }, 400, origin); }
    if (!isValidInput(input)) return response({ error: "اكتب رسالة واضحة لا تتجاوز 8000 حرف." }, 400, origin);
    const messages = input.messages ?? [];
    const priorUserTurns = messages.filter((turn) => turn.role === "user").length;
    if (priorUserTurns <= 2) return response(applyPlanningPolicy(null, input.message.trim(), priorUserTurns), 200, origin);
    try {
      const raw = await createPlan({ message: input.message.trim(), memories: input.memories ?? [], messages }, env.GEMINI_API_KEY);
      return response(applyPlanningPolicy(raw, input.message.trim(), priorUserTurns), 200, origin);
    } catch (error) {
      console.error("[fakkik-ai-api] Gemini planning failed", error);
      return response({ error: "تعذّر الوصول إلى محرّك التخطيط الآن. أعد المحاولة بعد قليل." }, 503, origin);
    }
  },
};

export default worker;
