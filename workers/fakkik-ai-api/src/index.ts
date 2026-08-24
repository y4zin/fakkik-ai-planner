export interface WorkerEnv {
  GEMINI_API_KEY: string;
}

type DialogueTurn = { role?: unknown; content?: unknown };
type PlanInput = { message?: unknown; memories?: unknown; messages?: unknown };
type PlannerStep = { title: string; detail: string; durationMinutes: number };
type PlannerReply = { message: string; needsClarification: boolean; plan: { title: string; summary: string; steps: PlannerStep[] } | null };
type ConversationTurn = { role: "user" | "assistant"; content: string };
type WalkingPreference = { label: string; effort: string; talkTest: string; breakMinutes: number | null };

const allowedOrigins = new Set(["https://y4zin.github.io", "http://localhost:3000"]);
const maxSessionMinutes = 20;

function normalizeArabicDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function requestedDurationMinutes(message: string): number | null {
  const normalized = normalizeArabicDigits(message);
  const minuteMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:دقيقة|دقائق|د\b|minutes?\b)/i);
  if (minuteMatch) return Math.max(1, Math.round(Number(minuteMatch[1])));
  const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:ساعة|ساعات|hours?\b)/i);
  if (hourMatch) return Math.max(1, Math.round(Number(hourMatch[1]) * 60));
  return null;
}

function isWalkingRequest(message: string) {
  return /(?:مشي|أمشي|امشي|walking|walk\b)/i.test(message);
}

export function ambiguousShortReplyNeedsClarification(message: string, messages: ConversationTurn[] = []) {
  const normalized = normalizeArabicDigits(message).trim().replace(/[.،!؟?]/g, "");
  if (!/^(?:مريح|مريحة|عادي|عادية|نعم|لا|سريع|سريعة|هادئ|هادئة)$/i.test(normalized)) return false;
  const lastAssistantQuestion = [...messages].reverse().find((turn) => turn.role === "assistant")?.content ?? "";
  return !/(?:شدة|إيقاع|وتيرة|سرعة|مريح|هادئ|سريع|كيف تفضل المشي)/i.test(lastAssistantQuestion);
}

function ambiguousReplyClarification(): PlannerReply {
  return { message: "كلمة «مريح» وحدها لا تكفي لبناء تعديل مؤكد. هل تقصد إيقاع المشي، مدة الجلسة، أم مدة الفواصل؟", needsClarification: true, plan: null };
}

export function walkingPreferenceFromDialogue(message: string, messages: ConversationTurn[] = []): WalkingPreference {
  const userDialogue = [message, ...messages.filter((turn) => turn.role === "user").map((turn) => turn.content)].join(" ");
  const normalized = normalizeArabicDigits(userDialogue);
  const breakMatch = normalized.match(/(?:فاصل|فواصل|استراحة|راحة)[^0-9]{0,12}(\d+)\s*(?:دقيقة|دقائق|د\b)/i)
    ?? normalized.match(/(\d+)\s*(?:دقيقة|دقائق|د\b)[^\n]{0,18}(?:فاصل|فواصل|استراحة|راحة)/i);
  const breakMinutes = breakMatch ? Math.min(10, Math.max(1, Number(breakMatch[1]))) : null;
  if (/(?:مريح|هادئ|خفيف|ببطء|سهل|low.?intensity)/i.test(normalized)) {
    return { label: "مريح", effort: "خفيف ومريح", talkTest: "يمكنك التحدث بجمل كاملة من دون لهاث", breakMinutes };
  }
  if (/(?:سريع|قوي|نشط|مرتفع|brisk|intense)/i.test(normalized)) {
    return { label: "نشط", effort: "نشط لكن مسيطر عليه", talkTest: "يمكنك قول جملة قصيرة، ثم خفف الإيقاع إن صعُب التنفس", breakMinutes };
  }
  return { label: "آمن للمبتدئ", effort: "معتدل وآمن للمبتدئ", talkTest: "يمكنك التحدث بجمل قصيرة براحة", breakMinutes };
}

function hasAny(steps: PlannerStep[], expression: RegExp) {
  return steps.some((step) => expression.test(`${step.title} ${step.detail}`));
}

function walkingFallback(durationMinutes: number, preference: WalkingPreference): PlannerStep[] {
  const warmup = durationMinutes <= 12 ? 3 : 5;
  const cooldown = durationMinutes <= 12 ? 3 : 5;
  const activeBudget = Math.max(1, durationMinutes - warmup - cooldown);
  const blockCount = Math.max(1, Math.ceil(activeBudget / 16));
  const breakCount = Math.max(0, blockCount - 1);
  const breakMinutes = breakCount > 0 ? preference.breakMinutes ?? Math.min(2, Math.max(1, Math.floor(activeBudget / (blockCount * 5)))) : 0;
  const walkingMinutes = Math.max(1, durationMinutes - warmup - cooldown - breakCount * breakMinutes);
  const baseBlock = Math.floor(walkingMinutes / blockCount);
  const remainder = walkingMinutes % blockCount;
  const steps: PlannerStep[] = [{ title: "إحماء مشي هادئ", detail: "امشِ بهدوء وحرك الكاحلين والكتفين. اجعل النفس مريحًا قبل رفع الإيقاع.", durationMinutes: warmup }];
  for (let index = 0; index < blockCount; index += 1) {
    steps.push({
      title: `مشي ${preference.label} — الجولة ${index + 1}/${blockCount}`,
      detail: `حافظ على إيقاع ${preference.effort}: ${preference.talkTest}. خفف الإيقاع إذا ظهر ألم أو دوار.`,
      durationMinutes: baseBlock + (index < remainder ? 1 : 0),
    });
    if (index < breakCount) steps.push({ title: "فاصل استعادة", detail: "خفف السرعة أو قف قليلًا، اشرب ماءً عند الحاجة ثم ابدأ الجولة التالية بهدوء.", durationMinutes: breakMinutes });
  }
  steps.push({ title: "تهدئة", detail: "خفف المشي تدريجيًا حتى يعود النفس طبيعيًا، ثم مدّد الساقين برفق.", durationMinutes: cooldown });
  return steps;
}

function fitDurationsToTarget(steps: PlannerStep[], target: number): PlannerStep[] {
  const total = steps.reduce((sum, step) => sum + step.durationMinutes, 0);
  if (total === target) return steps;
  const scaled = steps.map((step) => ({ ...step, durationMinutes: Math.max(1, Math.round((step.durationMinutes / total) * target)) }));
  let difference = target - scaled.reduce((sum, step) => sum + step.durationMinutes, 0);
  let cursor = scaled.length - 1;
  while (difference !== 0 && scaled.length > 0) {
    const step = scaled[cursor];
    if (difference > 0 && step.durationMinutes < maxSessionMinutes) {
      step.durationMinutes += 1;
      difference -= 1;
    } else if (difference < 0 && step.durationMinutes > 1) {
      step.durationMinutes -= 1;
      difference += 1;
    }
    cursor = cursor === 0 ? scaled.length - 1 : cursor - 1;
  }
  return splitLongSteps(scaled);
}

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

export function planningInstruction(message: string, memories: string[], messages: Array<{ role: "user" | "assistant"; content: string }>) {
  const rememberedContext = memories.length > 0 ? `\nذاكرة مفيدة سابقة:\n- ${memories.join("\n- ")}` : "";
  const dialogue = messages.length > 0 ? `\nسياق الحوار السابق:\n${messages.map((turn) => `${turn.role === "user" ? "المستخدم" : "فكّك"}: ${turn.content}`).join("\n")}` : "";
  return `أنت محرك التخطيط العربي لتطبيق «فكّك». مهمتك ليست نصيحة عامة ولا محادثة شكلية؛ بل تحويل نية المستخدم إلى خطة دقيقة قابلة للتأشير.

اتخذ قرارًا أولًا: لا تسأل سؤالًا إلا إذا كانت إجابته ستغيّر واحدًا من الآتي: عدد الجلسات، توزيع المدة، مستوى السلامة، شدة النشاط، أو موعد الإنجاز. لا تسأل عن «الهدف» بصيغة قائمة عامة عندما تكون النية واضحة من كلام المستخدم. لا تكرر معلومة قالها المستخدم، ولا تطلب سؤالين لمجرد العدد. لا تحوّل ردًا قصيرًا مثل «مريح» أو «عادي» أو «نعم» إلى هدف أو كمية من تلقاء نفسك: اربطه فقط بآخر سؤال إذا كان يجيب عنه بوضوح، وإلا اسأل سؤالًا واحدًا يحدد المقصود. إذا كان الطلب كافيًا لبناء خطة آمنة، أنشئها فورًا. إذا احتجت استيضاحًا، اسأل سؤالًا واحدًا محددًا يشرح ضمنيًا القرار الذي سيغيّره، واجعل needsClarification=true وplan=null.

أمثلة قرار صحيحة: في مشي محدد المدة، اسأل فقط عن هل هي جلسة واحدة أم برنامج متكرر، وعن وجود ألم/إصابة أو شدة مطلوبة إذا لم تُذكر؛ هذا يغيّر توزيع الجلسات والسلامة. في القراءة، اسأل فقط عن عدد الصفحات/الموعد/نوع القراءة إذا غاب أحدها. في المشاهدة، اسأل فقط عن عدد الحلقات ومدتها وموعد النهاية إذا غابت.

قواعد الخطة الإلزامية: لا توجد خطوة أطول من ${maxSessionMinutes} دقيقة. فكك النشاط الطويل إلى جلسات متتابعة واضحة، واجعل مجموع مدد الخطوات يطابق المدة التي ذكرها المستخدم عندما يحدد مدة. لا تضف تاريخًا أو أيامًا لم يذكرها المستخدم. لا تستخدم عناوين تجميلية غامضة مثل «خطة مريحة»؛ سمِّ الخطة بالمدة والنتيجة الفعلية. كل خطوة تحتاج فعلًا محددًا وإرشادًا قابلًا للتطبيق.

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

export function applyPlanningPolicy(raw: unknown, message: string, messages: ConversationTurn[] = []): PlannerReply {
  if (ambiguousShortReplyNeedsClarification(message, messages)) {
    return ambiguousReplyClarification();
  }
  const reply = raw as Partial<PlannerReply>;
  if (reply.needsClarification === true) {
    return { message: typeof reply.message === "string" ? reply.message : "ما المعلومة التي تريد أن أبني عليها التقسيم؟", needsClarification: true, plan: null };
  }
  const rawPlan = reply.plan;
  if (!rawPlan || typeof rawPlan !== "object" || !Array.isArray((rawPlan as { steps?: unknown }).steps)) {
    return { message: typeof reply.message === "string" ? reply.message : "أحتاج تفصيلًا أخيرًا كي أبني خطة دقيقة.", needsClarification: true, plan: null };
  }
  const plan = rawPlan as { title?: unknown; summary?: unknown; steps: Array<Partial<PlannerStep>> };
  let steps = splitLongSteps(plan.steps.filter((step): step is PlannerStep => typeof step.title === "string" && typeof step.detail === "string" && typeof step.durationMinutes === "number"));
  if (steps.length === 0) return { message: "أحتاج تفصيلًا أخيرًا كي أبني خطوات قابلة للتنفيذ.", needsClarification: true, plan: null };
  const requestedMinutes = requestedDurationMinutes(message);
  if (requestedMinutes && isWalkingRequest(message)) {
    const missingWarmup = !hasAny(steps, /إحماء|تسخين|warm.?up/i);
    const missingCooldown = !hasAny(steps, /تهدئة|تبريد|cool.?down/i);
    const missingBreak = requestedMinutes >= 30 && !hasAny(steps, /فاصل|استراحة|راحة|break/i);
    if (missingWarmup || missingCooldown || missingBreak) steps = walkingFallback(requestedMinutes, walkingPreferenceFromDialogue(message, messages));
  }
  if (requestedMinutes) steps = fitDurationsToTarget(steps, requestedMinutes);
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
    if (ambiguousShortReplyNeedsClarification(input.message.trim(), messages)) return response(ambiguousReplyClarification(), 200, origin);
    try {
      const raw = await createPlan({ message: input.message.trim(), memories: input.memories ?? [], messages }, env.GEMINI_API_KEY);
      return response(applyPlanningPolicy(raw, input.message.trim(), messages), 200, origin);
    } catch (error) {
      console.error("[fakkik-ai-api] Gemini planning failed", error);
      return response({ error: "تعذّر الوصول إلى محرّك التخطيط الآن. أعد المحاولة بعد قليل." }, 503, origin);
    }
  },
};

export default worker;
