/**
 * فلسفة فكّك: القياس قبل التحفيز. هذا المحرك محلي بالكامل ويحوّل الأنماط
 * الرقمية الواضحة في النص إلى خطوات صغيرة قابلة للتنفيذ والتحقق.
 */
export type TaskKind = "reading" | "running" | "general";

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

function firstNumber(value: string, expression: RegExp, fallback: number) {
  const match = value.match(expression);
  return match ? Number(match[1]) : fallback;
}

function createReadingPlan(task: string): TaskPlan {
  const normalized = toLatinNumbers(task);
  const pagesPerPart = firstNumber(normalized, /(\d+)\s*(?:صفحة|صفحات|page|pages)/i, 340);
  const partMatch = normalized.match(/(?:من\s*)?(\d+)\s*(?:أجزاء|اجزاء|جزء|parts?)/i);
  const parts = partMatch ? Math.max(1, Number(partMatch[1])) : 1;
  const sessionsPerPart = 4;
  const pagesPerSession = Math.ceil(pagesPerPart / sessionsPerPart);
  const totalPages = pagesPerPart * parts;
  const sessions: Session[] = [];

  for (let part = 1; part <= parts; part += 1) {
    for (let session = 1; session <= sessionsPerPart; session += 1) {
      const localStart = (session - 1) * pagesPerSession + 1;
      const localEnd = Math.min(session * pagesPerSession, pagesPerPart);
      const globalDay = (part - 1) * sessionsPerPart + session;
      const effectivePages = localEnd - localStart + 1;

      sessions.push({
        id: uid(),
        title: parts > 1 ? `الجزء ${part} — الجلسة ${session}` : `الجلسة ${session}`,
        label: `اليوم ${globalDay}`,
        metric: `${effectivePages} صفحة`,
        subtasks: [
          {
            id: uid(),
            title: `اقرأ الصفحات ${localStart}–${localEnd}`,
            guidance: `اقرأ من الجزء ${part} فقط. ضع علامة عند الصفحة ${localEnd} حتى تبدأ منها الجلسة التالية دون تخمين.`,
            metric: `${effectivePages} صفحة`,
            done: false,
          },
          {
            id: uid(),
            title: "دوّن خلاصة قصيرة من 3 أسطر",
            guidance: "اكتب الفكرة الأساسية أو الدعاء/المعنى الذي توقف عنده ذهنك؛ لا تتجاوز 5 دقائق.",
            metric: "5 دقائق",
            done: false,
          },
          {
            id: uid(),
            title: "ثبّت نقطة البداية القادمة",
            guidance: `ضع علامة واضحة قبل الصفحة ${Math.min(localEnd + 1, pagesPerPart)} أو اكتبها في ملاحظتك قبل إغلاق الكتاب.`,
            metric: "دقيقة واحدة",
            done: false,
          },
        ],
      });
    }
  }

  return {
    id: uid(),
    title: task,
    kind: "reading",
    icon: "book",
    summary: `${parts > 1 ? `${parts} أجزاء × ` : ""}${pagesPerPart} صفحة = ${totalPages} صفحة · ${sessions.length} جلسة`,
    detail: `تقسيم واقعي إلى ${pagesPerSession} صفحة تقريبًا في الجلسة الواحدة، مع نقطة توقف موثقة بعد كل جلسة.`,
    sessions,
  };
}

function createRunningPlan(task: string): TaskPlan {
  const normalized = toLatinNumbers(task);
  const distanceMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(كيلومتر|كم|km|متر|م\b|meter|meters)/i);
  const originalDistance = distanceMatch ? Number(distanceMatch[1]) : 500;
  const isKilometres = distanceMatch ? /كيلومتر|كم|km/i.test(distanceMatch[2]) : false;
  const metres = Math.round(isKilometres ? originalDistance * 1000 : originalDistance);
  const intervals = metres >= 1000 ? 5 : 5;
  const metresPerInterval = Math.ceil(metres / intervals);
  const sessions: Session[] = Array.from({ length: intervals }, (_, index) => {
    const start = index * metresPerInterval + 1;
    const end = Math.min((index + 1) * metresPerInterval, metres);
    const effectiveDistance = end - start + 1;
    return {
      id: uid(),
      title: `المرحلة ${index + 1}`,
      label: index === 0 ? "بعد الإحماء" : `فاصل ${index + 1}`,
      metric: `${effectiveDistance} م`,
      subtasks: [
        {
          id: uid(),
          title: index === 0 ? "إحماء خفيف قبل الانطلاق" : "استعد للانطلاقة التالية",
          guidance: index === 0 ? "امشِ بخفة 5 دقائق ثم حرّك الكاحلين والركبتين. الإحماء لا يدخل ضمن مسافة الجري الأساسية." : "امشِ 60 ثانية، راقب التنفس، ثم ابدأ الفاصل التالي بوتيرة تستطيع الحفاظ عليها.",
          metric: index === 0 ? "5 دقائق" : "60 ثانية",
          done: false,
        },
        {
          id: uid(),
          title: `اجرِ من العلامة ${start} إلى ${end}`,
          guidance: "حافظ على وتيرة حديث مريح؛ المطلوب إكمال المسافة المحددة لا السرعة القصوى.",
          metric: `${effectiveDistance} م`,
          done: false,
        },
        {
          id: uid(),
          title: "سجّل حالتك قبل المتابعة",
          guidance: "قيّم التنفس من 1 إلى 5. إذا وصل إلى 4 أو 5، مدّد الاستراحة بدقيقتين قبل الخطوة التالية.",
          metric: "30 ثانية",
          done: false,
        },
      ],
    };
  });

  return {
    id: uid(),
    title: task,
    kind: "running",
    icon: "run",
    summary: `${metres} م جري أساسي · ${intervals} فواصل × ${metresPerInterval} م تقريبًا`,
    detail: "تتضمن الخطة إحماءً واستراحات قصيرة لضمان إكمال المسافة بجودة وسلامة، من دون خلط الإحماء مع المسافة الأساسية.",
    sessions,
  };
}

function createGeneralPlan(task: string): TaskPlan {
  const steps = [
    ["عرّف نتيجة قابلة للقياس", "اكتب ما الذي سيُعدّ منجزًا في جملة واحدة، وحدد المقياس أو الموعد أو العدد الذي يثبت ذلك."],
    ["جهّز ما تحتاجه قبل البداية", "اجمع الأدوات والملفات والمعلومات المطلوبة في مكان واحد. إذا كان هناك عائق، سجّله بدل تجاوزه."],
    ["نفّذ أول وحدة صغيرة", "اختر أصغر جزء يمكن إتمامه خلال جلسة تركيز واحدة، ثم ابدأ به قبل التفكير في بقية المهمة."],
    ["راجع النتيجة وحدد الخطوة التالية", "تحقق مما أنجزته، ثم اكتب نقطة البدء المحددة للجلسة القادمة كي لا يعود الهدف غامضًا."],
  ];

  return {
    id: uid(),
    title: task,
    kind: "general",
    icon: "plan",
    summary: "4 محطات عملية · خطوة واحدة واضحة في كل مرة",
    detail: "عندما لا يحتوي الوصف على رقم أو مسافة أو مدة، تبدأ الخطة بتثبيت النتيجة ثم تحويلها إلى وحدات تنفيذ قابلة للمراجعة.",
    sessions: steps.map(([title, guidance], index) => ({
      id: uid(),
      title: `المحطة ${index + 1}`,
      label: `خطوة ${index + 1}`,
      metric: "جلسة تركيز",
      subtasks: [
        { id: uid(), title, guidance, metric: "10–25 دقيقة", done: false },
      ],
    })),
  };
}

export function decomposeTask(task: string): TaskPlan {
  const normalized = toLatinNumbers(task);
  if (/(?:كتاب|قراءة|صفحة|صفحات|read|book|pages?)/i.test(normalized)) return createReadingPlan(task);
  if (/(?:جري|ركض|اركض|run|running|كيلومتر|كم|km|متر|meters?)/i.test(normalized)) return createRunningPlan(task);
  return createGeneralPlan(task);
}

export function createDraftPlan(task: string): TaskPlan {
  return {
    id: uid(),
    title: task,
    kind: "general",
    icon: "plan",
    summary: "مهمة بانتظار التفكيك",
    detail: "اضغط زر القلم الأخضر ليفهم فكّك المهمة ويحوّلها إلى خطوات قابلة للتأشير.",
    sessions: [],
  };
}

export function defaultPlan() {
  return decomposeTask("كتاب 340 صفحة شرح دعاء يوم عرفة، كل جزء 340 صفحة، مكوّن من 4 أجزاء");
}

