/**
 * عرض هاتف فكّك: كل جلسة تفتح وتغلق، وكل مربع إنجاز يحدّث التقدم المحفوظ محليًا.
 */
import { useState } from "react";
import { BookOpen, Check, ChevronDown, ChevronUp, Dumbbell, ListChecks, PencilLine, Target, Timer } from "lucide-react";
import { answerChips, type Session, type TaskPlan } from "@/lib/taskPlanner";

type TaskTreeProps = { plan: TaskPlan; onToggleTask: (sessionId: string, taskId: string) => void; onRebuild: () => void; };

function PlanIcon({ kind }: { kind: TaskPlan["icon"] }) { if (kind === "book") return <BookOpen size={20} />; if (kind === "run") return <Dumbbell size={20} />; return <Target size={20} />; }

function SessionCard({ session, number, onToggleTask }: { session: Session; number: number; onToggleTask: (taskId: string) => void }) {
  const [open, setOpen] = useState(number === 1);
  const completed = session.subtasks.filter((item) => item.done).length;
  return <section className={`session-card ${completed === session.subtasks.length ? "is-complete" : ""}`}>
    <button className="session-head" onClick={() => setOpen((state) => !state)} aria-expanded={open}>
      <span className="session-index">{String(number).padStart(2, "0")}</span>
      <span className="session-copy"><small>{session.label}</small><strong>{session.title}</strong></span>
      <span className="session-metric">{session.metric}</span>{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
    {open && <div className="session-tasks">{session.subtasks.map((item) => <article className={`subtask ${item.done ? "is-done" : ""}`} key={item.id}>
      <button className="task-check" onClick={() => onToggleTask(item.id)} aria-label={item.done ? `إلغاء إنجاز ${item.title}` : `إنهاء ${item.title}`}>{item.done && <Check size={14} strokeWidth={3} />}</button>
      <div><h4>{item.title}</h4><p>{item.guidance}</p><span><Timer size={12} />{item.metric}</span></div>
    </article>)}</div>}
  </section>;
}

export default function TaskTree({ plan, onToggleTask, onRebuild }: TaskTreeProps) {
  const total = plan.sessions.reduce((sum, session) => sum + session.subtasks.length, 0);
  const completed = plan.sessions.reduce((sum, session) => sum + session.subtasks.filter((item) => item.done).length, 0);
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const [showAll, setShowAll] = useState(false);
  const shownSessions = showAll ? plan.sessions : plan.sessions.slice(0, 3);
  return <section className="task-plan">
    <header className="plan-heading"><span className="plan-kind"><PlanIcon kind={plan.icon} /></span><div><span>خطة مبنية على إجاباتك</span><h2>{plan.title}</h2><p>{plan.summary}</p></div><button className="rebuild-button" onClick={onRebuild} aria-label="تعديل الإجابات وإعادة بناء الخطة"><PencilLine size={17} /></button></header>
    <div className="answer-chip-row">{answerChips(plan).map((chip) => <span key={chip}>{chip}</span>)}</div>
    <div className="plan-insight">{plan.detail}</div>
    <div className="progress-block"><div><span>الإنجاز</span><b>{completed}/{total}</b></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div><strong>{progress}%</strong></div>
    <div className="timeline-label"><ListChecks size={17} /> مسار التنفيذ</div>
    <div className="session-list">{shownSessions.map((session, index) => <SessionCard key={session.id} session={session} number={index + 1} onToggleTask={(taskId) => onToggleTask(session.id, taskId)} />)}</div>
    {plan.sessions.length > 3 && <button className="show-more" onClick={() => setShowAll((value) => !value)}>{showAll ? "إظهار أول 3 جلسات فقط" : `إظهار كل الجلسات (${plan.sessions.length})`}{showAll ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>}
  </section>;
}

