/**
 * تصميم فكّك: شجرة خطوات عربية تبين المسار من الهدف الكبير إلى الإجراء الصغير.
 * يستخدم الخط المتقطع والأختام الكمية لإبقاء التقدم مرئيًا وعمليًا.
 */
import { useState } from "react";
import { BookOpen, Check, ChevronDown, ChevronUp, CircleDot, Dumbbell, ListTree, MoreHorizontal, PencilLine, Timer } from "lucide-react";
import type { Session, TaskPlan } from "@/lib/taskPlanner";

type TaskTreeProps = {
  plan: TaskPlan;
  onToggleTask: (sessionId: string, taskId: string) => void;
  onEdit: () => void;
  isAnalyzing: boolean;
};

function PlanIcon({ kind }: { kind: TaskPlan["icon"] }) {
  if (kind === "book") return <BookOpen size={20} strokeWidth={1.9} />;
  if (kind === "run") return <Dumbbell size={20} strokeWidth={1.9} />;
  return <ListTree size={20} strokeWidth={1.9} />;
}

function StepCard({ session, onToggleTask, number }: { session: Session; onToggleTask: (taskId: string) => void; number: number }) {
  const [open, setOpen] = useState(number === 1);
  const complete = session.subtasks.every((task) => task.done);
  const doneCount = session.subtasks.filter((task) => task.done).length;

  return (
    <section className={`session-card ${complete ? "is-complete" : ""}`}>
      <button className="session-head" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="session-ordinal">{String(number).padStart(2, "0")}</span>
        <span className="session-marker" aria-hidden="true">{complete ? <Check size={15} /> : <CircleDot size={16} />}</span>
        <span className="session-title-wrap">
          <span className="session-eyebrow">{session.label}</span>
          <strong>{session.title}</strong>
        </span>
        <span className="metric-chip">{session.metric}</span>
        <span className="session-chevron">{open ? <ChevronUp size={19} /> : <ChevronDown size={19} />}</span>
      </button>

      {open && (
        <div className="session-tasks">
          {session.subtasks.map((task) => (
            <article className={`subtask-row ${task.done ? "is-done" : ""}`} key={task.id}>
              <button
                className="task-check"
                onClick={() => onToggleTask(task.id)}
                aria-label={task.done ? `إلغاء إنجاز ${task.title}` : `إنهاء ${task.title}`}
                aria-pressed={task.done}
              >
                {task.done && <Check size={15} strokeWidth={3} />}
              </button>
              <div className="subtask-copy">
                <h4>{task.title}</h4>
                <p>{task.guidance}</p>
              </div>
              <div className="subtask-meta">
                <span><Timer size={13} /> {task.metric}</span>
                <button className="quiet-icon" aria-label={`خيارات ${task.title}`}><MoreHorizontal size={18} /></button>
              </div>
            </article>
          ))}
          <div className="session-footer">{doneCount}/{session.subtasks.length} مهام مكتملة</div>
        </div>
      )}
    </section>
  );
}

export default function TaskTree({ plan, onToggleTask, onEdit, isAnalyzing }: TaskTreeProps) {
  const [expanded, setExpanded] = useState(true);
  const total = plan.sessions.reduce((count, session) => count + session.subtasks.length, 0);
  const done = plan.sessions.reduce((count, session) => count + session.subtasks.filter((task) => task.done).length, 0);
  const progress = total ? Math.round((done / total) * 100) : 0;

  return (
    <section className="plan-card">
      <header className="plan-card-head">
        <div className="goal-icon"><PlanIcon kind={plan.icon} /></div>
        <div className="goal-copy">
          <span className="eyebrow">الهدف الرئيسي</span>
          <h2>{plan.title}</h2>
          <p>{plan.summary}</p>
        </div>
        <div className="goal-actions">
          <button className="ai-pencil" onClick={onEdit} disabled={isAnalyzing} aria-label="تفكيك المهمة بدقة">
            {isAnalyzing ? <span className="mini-spinner" /> : <PencilLine size={19} />}
          </button>
          <button className="quiet-icon goal-more" aria-label="خيارات المهمة"><MoreHorizontal size={21} /></button>
        </div>
      </header>

      <div className="plan-insight">
        <span className="insight-mark">✦</span>
        <p>{plan.detail}</p>
      </div>

      {plan.sessions.length > 0 ? (
        <>
          <div className="plan-progress-row">
            <div><span>تقدّم الخطة</span><strong>{progress}%</strong></div>
            <div className="linear-progress" aria-label={`نسبة التقدم ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
            <span className="progress-count">{done}/{total}</span>
          </div>
          <button className="tree-toggle" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
            <span><ListTree size={17} /> {expanded ? "إخفاء تفاصيل الخطة" : "إظهار تفاصيل الخطة"}</span>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {expanded && <div className="task-tree"><div className="thread-origin"><span>النية</span><i /></div>{plan.sessions.map((session, index) => <StepCard key={session.id} session={session} number={index + 1} onToggleTask={(taskId) => onToggleTask(session.id, taskId)} />)}<div className="thread-end">نقطة الإنجاز</div></div>}
        </>
      ) : (
        <div className="empty-plan">
          <PencilLine size={22} />
          <div><strong>هذه المهمة أُضيفت.</strong><span>اضغط قلم التفكيك لتوليد خطة واضحة بأرقام وإرشادات.</span></div>
        </div>
      )}
    </section>
  );
}
