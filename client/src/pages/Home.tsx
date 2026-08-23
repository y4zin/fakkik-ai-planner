/**
 * هاتف فكّك: شاشة واحدة، رحلة أسئلة إجبارية، وتنقل سفلي يعمل لكل قسم.
 */
import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, ClipboardList, Dumbbell, Plus, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import QuestionSheet from "@/components/QuestionSheet";
import TaskTree from "@/components/TaskTree";
import { buildPlan, createDefaultAnswers, type PlanAnswers, type TaskPlan } from "@/lib/taskPlanner";

type View = "today" | "tasks" | "completed";
const storageKey = "fakkik-mobile-plan-v2";
const examples = [
  { label: "قراءة", value: "كتاب 340 صفحة شرح دعاء يوم عرفة، مكوّن من 4 أجزاء", icon: BookOpen },
  { label: "جري", value: "جري لمسافة 500 متر", icon: Dumbbell },
];

function loadPlan(): TaskPlan | null { try { const saved = window.localStorage.getItem(storageKey); return saved ? JSON.parse(saved) as TaskPlan : null; } catch { return null; } }

export default function Home() {
  const [plan, setPlan] = useState<TaskPlan | null>(loadPlan);
  const [view, setView] = useState<View>("today");
  const [quickTask, setQuickTask] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSeed, setSheetSeed] = useState<{ task: string; answers?: PlanAnswers }>({ task: "" });

  useEffect(() => { if (plan) window.localStorage.setItem(storageKey, JSON.stringify(plan)); else window.localStorage.removeItem(storageKey); }, [plan]);
  const doneCount = useMemo(() => plan?.sessions.reduce((sum, session) => sum + session.subtasks.filter((item) => item.done).length, 0) ?? 0, [plan]);
  const totalCount = useMemo(() => plan?.sessions.reduce((sum, session) => sum + session.subtasks.length, 0) ?? 0, [plan]);

  const openQuestions = (task = quickTask, answers?: PlanAnswers) => { setSheetSeed({ task: task.trim(), answers: answers ?? createDefaultAnswers(task) }); setSheetOpen(true); };
  const buildFromAnswers = (task: string, answers: PlanAnswers) => { setPlan(buildPlan(task, answers)); setQuickTask(""); setSheetOpen(false); setView("today"); toast.success("تم بناء الخطة من إجاباتك."); };
  const toggleTask = (sessionId: string, taskId: string) => setPlan((current) => current ? ({ ...current, sessions: current.sessions.map((session) => session.id !== sessionId ? session : ({ ...session, subtasks: session.subtasks.map((item) => item.id !== taskId ? item : ({ ...item, done: !item.done })) })) }) : current);

  const content = () => {
    if (view === "today") return plan ? <TaskTree plan={plan} onToggleTask={toggleTask} onRebuild={() => openQuestions(plan.title, plan.answers)} /> : <EmptyToday onOpen={() => openQuestions()} />;
    if (view === "tasks") return plan ? <section className="library-card"><span>مهمتي المحفوظة</span><h2>{plan.title}</h2><p>{plan.summary}</p><div><button onClick={() => setView("today")}>فتح الخطة</button><button className="secondary-action" onClick={() => openQuestions(plan.title, plan.answers)}>تعديل الإجابات</button></div></section> : <EmptyToday onOpen={() => openQuestions()} />;
    const completedItems = plan?.sessions.flatMap((session) => session.subtasks.filter((item) => item.done).map((item) => ({ ...item, label: session.label }))) ?? [];
    return <section className="completed-view"><span className="view-eyebrow"><CheckCircle2 size={16} /> المنجز</span><h2>{completedItems.length ? `أنجزت ${completedItems.length} خطوة` : "لا توجد خطوة مكتملة بعد"}</h2><p>{completedItems.length ? "هذه الخطوات محفوظة على جهازك ويمكنك إلغاء تأشير أي منها من الخطة." : "عند وضع علامة على أي خطوة، ستظهر هنا تلقائيًا."}</p>{completedItems.map((item) => <article key={item.id}><CheckCircle2 size={17} /><div><strong>{item.title}</strong><span>{item.label}</span></div></article>)}</section>;
  };

  return <div className="phone-page" dir="rtl"><main className="phone-shell">
    <header className="mobile-header"><div className="brand-mini"><span className="brand-symbol-frame"><img src="/manus-storage/fakkik-symbol-logo_819d919f.png" alt="رمز فكّك" /></span><div><strong className="brand-wordmark">فكّك</strong><span>خطة محلية دقيقة</span></div></div><span className="saved-state"><i />محفوظ</span></header>
    <section className="mobile-hero"><span><Sparkles size={15} /> خطّط بعد أن تجيب</span><h1>المهمة لا تُفكّك<br />قبل أن <em>توضحها.</em></h1><p>أجب عن أسئلة قصيرة، ثم نكتب حجم العمل، عدد الجلسات، وإرشاد كل خطوة بدقة.</p><div className="mobile-proof" aria-label="مثال تفكيك: 340 صفحة إلى 16 جلسة و48 خطوة"><span className="proof-label">مثال قياس حقيقي</span><div><b>340 صفحة</b><i /><b>16 جلسة</b><i /><b>48 خطوة</b></div></div></section>
    <section className="quick-entry"><label>اكتب المهمة أولًا</label><div><input value={quickTask} onChange={(event) => setQuickTask(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") openQuestions(); }} placeholder="مثال: جري لمسافة 500 متر" /><button onClick={() => openQuestions()} aria-label="متابعة إلى الأسئلة"><Plus size={22} /></button></div><div className="example-buttons">{examples.map((example) => { const Icon = example.icon; return <button key={example.label} onClick={() => { setQuickTask(example.value); openQuestions(example.value); }}><Icon size={14} />{example.label}</button>; })}</div></section>
    <section className="mobile-content">{content()}</section>
    <nav className="bottom-nav" aria-label="أقسام التطبيق"><button className={view === "today" ? "active" : ""} onClick={() => setView("today")}><Target size={19} /><span>اليوم</span></button><button className={view === "tasks" ? "active" : ""} onClick={() => setView("tasks")}><ClipboardList size={19} /><span>مهامي</span></button><button className={view === "completed" ? "active" : ""} onClick={() => setView("completed")}><CheckCircle2 size={19} /><span>المنجز</span>{doneCount > 0 && <i>{doneCount}</i>}</button></nav>
    <button className="floating-add" onClick={() => openQuestions()} aria-label="إضافة مهمة جديدة"><Plus size={23} /></button>
    <QuestionSheet open={sheetOpen} initialTask={sheetSeed.task} initialAnswers={sheetSeed.answers} onClose={() => setSheetOpen(false)} onSubmit={buildFromAnswers} />
  </main></div>;
}

function EmptyToday({ onOpen }: { onOpen: () => void }) { return <section className="empty-today"><img src="/manus-storage/fakkik-hero-planning-workshop_247bd740.png" alt="بطاقات مهمة تتفرع إلى خطوات صغيرة" /><div className="empty-copy"><span>لا توجد خطة بعد</span><h2>ابدأ بمهمة واحدة،<br />ثم أجب بوضوح.</h2><p>لا ينشئ فكّك الخطة من كلام عام. سنسألك عن الحجم والوقت وقدرتك أولًا.</p><button onClick={onOpen}>ابدأ الأسئلة الإلزامية <Plus size={17} /></button></div><div className="empty-flow" aria-label="النية ثم الأسئلة ثم الجلسات ثم الإنجاز"><span className="flow-node active">النية</span><i /><span className="flow-node">أسئلة</span><i /><span className="flow-node">جلسات</span><i /><span className="flow-node end">إنجاز</span></div></section>; }
