/**
 * ورشة التفكير الهادئة — صفحة التطبيق الرئيسية.
 * تظهر النية الكبيرة، ثم تعطيها محرك التفكيك وخطوات يومية ذات قياس واضح.
 */
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, BookOpen, ChevronLeft, ClipboardList, Dumbbell, Lightbulb, Menu, Plus, Sparkles, Target, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import TaskTree from "@/components/TaskTree";
import { createDraftPlan, defaultPlan, decomposeTask, type TaskPlan } from "@/lib/taskPlanner";

const storageKey = "fakkik-current-plan-v1";

const promptExamples = [
  { label: "قراءة", text: "كتاب 340 صفحة شرح دعاء يوم عرفة، كل جزء 340 صفحة، مكوّن من 4 أجزاء", icon: BookOpen },
  { label: "جري", text: "جري لمسافة 500 متر", icon: Dumbbell },
  { label: "مشروع", text: "إعداد عرض تعريفي لمشروعي", icon: ClipboardList },
];

function loadPlan(): TaskPlan {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : defaultPlan();
  } catch {
    return defaultPlan();
  }
}

export default function Home() {
  const [plan, setPlan] = useState<TaskPlan>(loadPlan);
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(plan));
  }, [plan]);

  const totalTasks = useMemo(() => plan.sessions.reduce((count, session) => count + session.subtasks.length, 0), [plan]);
  const doneTasks = useMemo(() => plan.sessions.reduce((count, session) => count + session.subtasks.filter((task) => task.done).length, 0), [plan]);

  const addTask = () => {
    const value = input.trim();
    if (!value) {
      toast.error("اكتب المهمة أولًا، ولو بجملة قصيرة.");
      return;
    }
    setPlan(createDraftPlan(value));
    setInput("");
    toast.success("أُضيفت المهمة. اضغط قلم التفكيك الأخضر لتوليد الخطة.");
  };

  const decomposeCurrentTask = () => {
    setIsAnalyzing(true);
    window.setTimeout(() => {
      setPlan((current) => decomposeTask(current.title));
      setIsAnalyzing(false);
      toast.success("تم تفكيك المهمة إلى خطوات قابلة للإنجاز.");
    }, 620);
  };

  const toggleTask = (sessionId: string, taskId: string) => {
    setPlan((current) => ({
      ...current,
      sessions: current.sessions.map((session) => session.id !== sessionId ? session : {
        ...session,
        subtasks: session.subtasks.map((task) => task.id !== taskId ? task : { ...task, done: !task.done }),
      }),
    }));
  };

  const useExample = (text: string) => {
    setInput(text);
    toast.message("تم وضع المثال في خانة المهمة.");
  };

  return (
    <div className="app-shell" dir="rtl">
      <aside className={`sidebar ${isSidebarOpen ? "is-open" : ""}`}>
        <div className="brand-lockup">
          <img src="/manus-storage/fakkik-symbol-logo_819d919f.png" alt="رمز فكّك" className="brand-mark" />
          <div><strong>فكّك</strong><span>مخطط الخطوات</span></div>
        </div>

        <nav className="side-nav" aria-label="التنقل الرئيسي">
          <button className="nav-item active"><Target size={19} /><span>خطة اليوم</span></button>
          <button className="nav-item"><ClipboardList size={19} /><span>مهامي</span><em>1</em></button>
          <button className="nav-item"><BadgeCheck size={19} /><span>المكتمل</span></button>
        </nav>

        <section className="side-tip">
          <div className="tip-icon"><Lightbulb size={18} /></div>
          <p>كل مهمة جيدة تبدأ<br />بوحدة يمكن إنجازها اليوم.</p>
          <span>فكّك يعمل محليًا</span>
        </section>
        <footer className="side-footer">صنع من قبل نور</footer>
      </aside>

      <main className="workspace">
        <header className="workspace-topbar">
          <button className="mobile-menu" onClick={() => setIsSidebarOpen((open) => !open)} aria-label="فتح القائمة"><Menu size={22} /></button>
          <div className="crumb"><span>مساحتك</span><ChevronLeft size={15} /><strong>خطة اليوم</strong></div>
          <div className="top-status"><span className="status-dot" />محفوظ محليًا</div>
        </header>

        <section className="intro-layout">
          <div className="intro-copy">
            <span className="section-kicker"><Sparkles size={15} /> مخطّط الذكاء المحلي</span>
            <h1><span>340 صفحة</span> ليست مهمة<br /><i>واحدة.</i></h1>
            <p>اكتب هدفك كما هو. فكّك يلتقط العدد والمسافة والزمن، ثم يبني خطة صغيرة واضحة بدل تعليمات عامة.</p>
            <div className="precision-points">
              <span>أرقام واقعية</span><b />
              <span>إرشاد لكل خطوة</span><b />
              <span>متابعة بلا تسجيل</span>
            </div>
            <div className="decomposition-proof" aria-label="مثال: 340 صفحة تتحول إلى 4 أجزاء و16 جلسة و48 خطوة">
              <span>مثال تفكيك ملموس</span>
              <div><strong>340 صفحة</strong><i>←</i><b>4 أجزاء</b><i>←</i><b>16 جلسة</b><i>←</i><b>48 خطوة</b></div>
            </div>
          </div>
          <div className="hero-art" aria-label="تصور لفكرة تفكيك المهمة">
            <img src="/manus-storage/fakkik-hero-planning-workshop_247bd740.png" alt="مهمة كبيرة تتفرع إلى بطاقات مهام أصغر" />
            <div className="hero-art-stamp"><WandSparkles size={16} /> فكّك</div>
          </div>
        </section>

        <section className="composer" aria-label="إضافة مهمة جديدة">
          <div className="composer-label"><span className="composer-number">01</span><strong>ما المهمة التي تريد تفكيكها؟</strong></div>
          <div className="composer-row">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") addTask(); }}
              placeholder="مثال: كتاب 340 صفحة مكوّن من 4 أجزاء"
              aria-label="اكتب المهمة"
            />
            <button onClick={addTask} className="add-button" aria-label="إضافة المهمة"><Plus size={28} /></button>
          </div>
          <div className="example-row"><span>جرّب:</span>{promptExamples.map((example) => { const Icon = example.icon; return <button key={example.label} onClick={() => useExample(example.text)}><Icon size={14} />{example.label}</button>; })}</div>
        </section>

        <section className="plan-header-row">
          <div><span className="section-kicker muted"><span className="mini-green-dot" /> مسار التنفيذ</span><h2>خطة قابلة للتأشير</h2></div>
          <div className="session-summary"><span>{doneTasks}/{totalTasks || 0}</span> مهمة منجزة</div>
        </section>

        <TaskTree plan={plan} onToggleTask={toggleTask} onEdit={decomposeCurrentTask} isAnalyzing={isAnalyzing} />

        <section className="use-cases">
          <div className="use-case-content"><span className="section-kicker muted">يناسب أكثر من القراءة</span><h3>أي هدف قابل للتجزئة.</h3><p>من كتاب طويل إلى مسافة جري أو مشروع شخصي؛ ضع التفاصيل التي تعرفها، وسيبني فكّك ما يمكن إنجازه فعليًا.</p></div>
          <article className="use-card reading-case"><img src="/manus-storage/fakkik-reading-plan_b0ccd940.png" alt="كتاب وخطة قراءة متدرجة" /><span>قراءة منظمة</span></article>
          <article className="use-card running-case"><img src="/manus-storage/fakkik-running-plan_68714f70.png" alt="حذاء جري ومسار مقسم" /><span>جري محسوب</span></article>
        </section>
      </main>
    </div>
  );
}
