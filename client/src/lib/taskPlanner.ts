/**
 * فكّك للهاتف: لا يبني خطة من التخمين. يجمع حقولًا إلزامية بحسب نوع المهمة،
 * ثم يحول الإجابات نفسها إلى مقاييس وجلسات وتعليمات قابلة للتأشير.
 */
export type TaskKind = "reading" | "running" | "general";

export type PlanAnswers = Record<string, string>;

export type PlannerQuestion = {
  id: string;
  label: string;
  hint: string;
  type: "number" | "text" | "select";
  suffix?: string;
  min?: number;
  options?: { value: string; label: string }[];
};

export type Subtask = {
  id: string;
  title: string;
  guidance: string;
  metric: string;
  done: boolean;
};

export type Session = {
  id: string;
  title: string;
  label: string;
  metric: string;
  subtasks: Subtask[];
};

export type TaskPlan = {
  id: string;
  title: string;
  kind: TaskKind;
  icon: "book" | "run" | "plan";
  summary: string;
  detail: string;
  answers: PlanAnswers;
  sessions: Session[];
};

const uid = () => Math.random().toString(36).slice(2, 10);

function toLatinNumbers(value: string) {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  return value
    .replace(/[٠-٩]/g, (digit) => String(arabic.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(persian.indexOf(digit)));
}

function numberFrom(value: string, fallback: number) {
  const parsed = Number(toLatinNumbers(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function extractedNumber(text: string, expression: RegExp, fallback: number) {
  const found = toLatinNumbers(text).match(expression);
  return found ? numberFrom(found[1], fallback) : fallback;
}

export function detectTaskKind(task: string): TaskKind {
  const normalized = toLatinNumbers(task);
  if (/(?:كتاب|قراءة|صفحة|صفحات|read|book|pages?)/i.test(normalized)) return "reading";
  if (/(?:جري|ركض|اركض|run|running|كيلومتر|كم|km|متر|meters?)/i.test(normalized)) return "running";
  return "general";
}

export function createDefaultAnswers(task: string): PlanAnswers {
  const kind = detectTaskKind(task);
  if (kind === "reading") {
    const pages = extractedNumber(task, /(\d+)\s*(?:صفحة|صفحات|page|pages)/i, 120);
    const parts = extractedNumber(task, /(?:من\s*)?(\d+)\s*(?:أجزاء|اجزاء|جزء|parts?)/i, 1);
    return { pagesPerPart: String(pages), parts: String(parts), pagesPerSession: "20", sessionsPerWeek: "5" };
  }
  if (kind === "running") {
    const normalized = toLatinNumbers(task);
    const match = normalized.match(/(\d+(?:\.\d+)?)\s*(كيلومتر|كم|km|متر|م\b|meter|meters)/i);
    const rawDistance = match ? numberFrom(match[1], 500) : 500;
    const isKm = match ? /كيلومتر|كم|km/i.test(match[2]) : false;
    return { distance: String(Math.round(isKm ? rawDistance * 1000 : rawDistance)), currentLevel: "new", trainingDays: "3", sessionMinutes: "25" };
  }
  return { outcome: "", deadlineDays: "7", focusMinutes: "30" };
}

export function createQuestions(task: string): PlannerQuestion[] {
  const kind = detectTaskKind(task);
  if (kind === "reading") {
    return [
      { id: "pagesPerPart", label: "كم صفحة في الجزء الواحد؟", hint: "نستخدمها لحساب النطاق الحقيقي لكل جلسة.", type: "number", suffix: "صفحة", min: 1 },
      { id: "parts", label: "كم عدد الأجزاء؟", hint: "مثال: 4 أجزاء، وكل جزء مستقل في الخطة.", type: "number", suffix: "أجزاء", min: 1 },
      { id: "pagesPerSession", label: "ما عدد الصفحات المريح لك في الجلسة؟", hint: "اختر قدرة واقعية لكي تلتزم بالخطة يوميًا.", type: "number", suffix: "صفحة/جلسة", min: 1 },
      { id: "sessionsPerWeek", label: "كم جلسة تستطيع إنجازها أسبوعيًا؟", hint: "نحسب منها مدة الإكمال المتوقعة.", type: "select", options: [
        { value: "3", label: "3 جلسات" }, { value: "4", label: "4 جلسات" }, { value: "5", label: "5 جلسات" }, { value: "6", label: "6 جلسات" }, { value: "7", label: "7 جلسات" },
      ] },
    ];
  }
  if (kind === "running") {
    return [
      { id: "distance", label: "ما المسافة المستهدفة؟", hint: "اكتبها بالمتر؛ مثال: 500.", type: "number", suffix: "متر", min: 50 },
      { id: "currentLevel", label: "ما مستواك الحالي؟", hint: "حتى لا تكون الفواصل أقوى من قدرتك الحالية.", type: "select", options: [
        { value: "new", label: "أبدأ من الصفر" }, { value: "some", label: "أستطيع الركض قليلًا" }, { value: "ready", label: "أستطيع الجري دون توقف" },
      ] },
      { id: "trainingDays", label: "كم يوم تدريب متاح كل أسبوع؟", hint: "الخطة تضع حصصًا ضمن الأيام المتاحة فقط.", type: "select", options: [
        { value: "2", label: "يومان" }, { value: "3", label: "3 أيام" }, { value: "4", label: "4 أيام" }, { value: "5", label: "5 أيام" },
      ] },
      { id: "sessionMinutes", label: "كم دقيقة تستطيع تخصيصها للحصة؟", hint: "يشمل ذلك الإحماء وفواصل المشي.", type: "select", options: [
        { value: "15", label: "15 دقيقة" }, { value: "25", label: "25 دقيقة" }, { value: "35", label: "35 دقيقة" }, { value: "45", label: "45 دقيقة" },
      ] },
    ];
  }
  return [
    { id: "outcome", label: "ما النتيجة النهائية الدقيقة؟", hint: "صف ما سيُعد منجزًا، لا اسم المشروع فقط.", type: "text" },
    { id: "deadlineDays", label: "خلال كم يوم تريد الإكمال؟", hint: "سنوزع العمل على عدد الأيام الذي تختاره.", type: "number", suffix: "يومًا", min: 1 },
    { id: "focusMinutes", label: "كم دقيقة متاحة يوميًا؟", hint: "لا نضع في الخطة أكثر من وقتك المتاح.", type: "number", suffix: "دقيقة", min: 5 },
  ];
}

function task(title: string, guidance: string, metric: string): Subtask {
  return { id: uid(), title, guidance, metric, done: false };
}

function buildReadingPlan(title: string, answers: PlanAnswers): TaskPlan {
  const pagesPerPart = numberFrom(answers.pagesPerPart, 120);
  const parts = numberFrom(answers.parts, 1);
  const pagesPerSession = numberFrom(answers.pagesPerSession, 20);
  const sessionsPerWeek = numberFrom(answers.sessionsPerWeek, 5);
  const sessionsForPart = Math.ceil(pagesPerPart / pagesPerSession);
  const totalSessions = sessionsForPart * parts;
  const totalPages = pagesPerPart * parts;
  const weeks = Math.ceil(totalSessions / sessionsPerWeek);
  const sessions: Session[] = Array.from({ length: totalSessions }, (_, index) => {
    const part = Math.floor(index / sessionsForPart) + 1;
    const sessionInsidePart = index % sessionsForPart;
    const start = sessionInsidePart * pagesPerSession + 1;
    const end = Math.min(start + pagesPerSession - 1, pagesPerPart);
    const pageCount = end - start + 1;
    const week = Math.floor(index / sessionsPerWeek) + 1;
    const sessionOfWeek = (index % sessionsPerWeek) + 1;
    return {
      id: uid(),
      title: `الجزء ${part} · الصفحات ${start}–${end}`,
      label: `الأسبوع ${week} · جلسة ${sessionOfWeek}`,
      metric: `${pageCount} صفحة`,
      subtasks: [
        task(`اقرأ الصفحات ${start}–${end}`, `ابدأ من الجزء ${part} فقط. توقف بعد الصفحة ${end} حتى يبقى حجم العمل مطابقًا لقدرتك التي اخترتها.`, `${pageCount} صفحة`),
        task("سجّل نقطة التوقف", `ضع علامة على الصفحة ${Math.min(end + 1, pagesPerPart)} أو اكتبها قبل إغلاق الكتاب، كي تبدأ منها مباشرة في الجلسة القادمة.`, "دقيقة واحدة"),
      ],
    };
  });
  return {
    id: uid(), title, kind: "reading", icon: "book", answers,
    summary: `${totalPages} صفحة · ${totalSessions} جلسة · ${weeks} أسابيع تقريبًا`,
    detail: `الخطة مبنية على ${pagesPerSession} صفحة في الجلسة و${sessionsPerWeek} جلسات أسبوعيًا، وفق إجاباتك أنت.`,
    sessions,
  };
}

function buildRunningPlan(title: string, answers: PlanAnswers): TaskPlan {
  const distance = numberFrom(answers.distance, 500);
  const days = numberFrom(answers.trainingDays, 3);
  const minutes = numberFrom(answers.sessionMinutes, 25);
  const level = answers.currentLevel || "new";
  const weeks = level === "new" ? 2 : 1;
  const totalWorkouts = days * weeks;
  const sessions: Session[] = Array.from({ length: totalWorkouts }, (_, index) => {
    const progressStart = level === "new" ? 0.35 : level === "some" ? 0.55 : 0.75;
    const target = Math.min(distance, Math.ceil(distance * (progressStart + ((1 - progressStart) * (index + 1)) / totalWorkouts)));
    const intervals = level === "new" ? Math.max(3, Math.ceil(target / 100)) : Math.max(2, Math.ceil(target / 200));
    const runSegment = Math.ceil(target / intervals);
    return {
      id: uid(),
      title: `حصة ${index + 1} · هدف ${target} م`,
      label: `الأسبوع ${Math.floor(index / days) + 1} · يوم تدريب ${(index % days) + 1}`,
      metric: `${minutes} دقيقة`,
      subtasks: [
        task("إحماء قبل الجري", "امشِ بخفة وحرك الكاحلين والركبتين. لا تحسب الإحماء ضمن مسافة الجري المستهدفة.", "5 دقائق"),
        task(`${intervals} فواصل × ${runSegment} م`, `اركض ${runSegment} م، ثم امشِ 60–90 ثانية. المطلوب إكمال ${target} م بهدوء، لا تحقيق سرعة قصوى.`, `${target} م`),
        task("تهدئة وتسجيل الإحساس", "امشِ ببطء ثم سجّل إن كان النفس مريحًا. إن كان الجهد عاليًا، أعد الحصة نفسها بدل الانتقال للحصة التالية.", "3 دقائق"),
      ],
    };
  });
  const levelLabel = level === "new" ? "مبتدئ" : level === "some" ? "متوسط البداية" : "جاهز للجري";
  return {
    id: uid(), title, kind: "running", icon: "run", answers,
    summary: `${distance} م · ${totalWorkouts} حصص · ${days} أيام أسبوعيًا`,
    detail: `الخطة تناسب مستوى «${levelLabel}» وتخصص ${minutes} دقيقة لكل حصة، مع تدرّج ينتهي بالمسافة المستهدفة.`,
    sessions,
  };
}

function buildGeneralPlan(title: string, answers: PlanAnswers): TaskPlan {
  const outcome = answers.outcome?.trim() || title;
  const days = Math.min(numberFrom(answers.deadlineDays, 7), 30);
  const minutes = numberFrom(answers.focusMinutes, 30);
  const sessions: Session[] = Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const isFirst = day === 1;
    const isLast = day === days;
    const mainTitle = isFirst ? "ثبّت معيار الإنجاز" : isLast ? "راجع النتيجة وأغلق المهمة" : `دفعة التنفيذ ${day - 1}`;
    const mainGuidance = isFirst
      ? `اكتب في سطر واحد: «يُعد منجزًا عندما ${outcome}». لا تبدأ التنفيذ قبل أن يكون هذا الوصف واضحًا.`
      : isLast
        ? `قارن ما أنجزته بالنتيجة المطلوبة: ${outcome}. أصلح النقص المحدد فقط، ثم وثّق أن المهمة انتهت.`
        : `خصص ${minutes} دقيقة لجزء واحد من «${outcome}». ابدأ من آخر نقطة توقفت عندها ولا توسع نطاق العمل اليوم.`;
    return {
      id: uid(),
      title: mainTitle,
      label: `اليوم ${day}`,
      metric: `${minutes} دقيقة`,
      subtasks: [
        task(mainTitle, mainGuidance, `${minutes} دقيقة`),
        task("سجّل الخطوة التالية", "قبل إنهاء الجلسة، اكتب الإجراء التالي في 7 كلمات أو أقل. هذا يمنع العودة للمهمة من نقطة غامضة.", "دقيقة واحدة"),
      ],
    };
  });
  return {
    id: uid(), title, kind: "general", icon: "plan", answers,
    summary: `${days} أيام · ${minutes} دقيقة يوميًا · نتيجة محددة`,
    detail: `بنيت الخطة على النتيجة التي حددتها: «${outcome}». كل يوم له نطاق زمني ثابت وخطوة تالية موثقة.`,
    sessions,
  };
}

export function buildPlan(taskTitle: string, answers: PlanAnswers): TaskPlan {
  const kind = detectTaskKind(taskTitle);
  if (kind === "reading") return buildReadingPlan(taskTitle, answers);
  if (kind === "running") return buildRunningPlan(taskTitle, answers);
  return buildGeneralPlan(taskTitle, answers);
}

export function answerChips(plan: TaskPlan) {
  if (plan.kind === "reading") return [`${plan.answers.pagesPerPart} صفحة/جزء`, `${plan.answers.parts} أجزاء`, `${plan.answers.pagesPerSession} صفحة/جلسة`, `${plan.answers.sessionsPerWeek} جلسات/أسبوع`];
  if (plan.kind === "running") return [`${plan.answers.distance} م`, plan.answers.currentLevel === "new" ? "مبتدئ" : plan.answers.currentLevel === "some" ? "قدرة مبدئية" : "جاهز", `${plan.answers.trainingDays} أيام/أسبوع`, `${plan.answers.sessionMinutes} دقيقة/حصة`];
  return [`${plan.answers.deadlineDays} أيام`, `${plan.answers.focusMinutes} دقيقة/يوم`, plan.answers.outcome];
}

