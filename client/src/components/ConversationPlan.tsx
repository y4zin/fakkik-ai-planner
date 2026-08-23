import { BookOpenCheck, Check, Circle, Clock3, Play, Sparkles } from "lucide-react";

export type ConversationPlanData = {
  title: string;
  summary: string;
  scheduleMode: "today" | "date_specific" | "days_of_week" | "flexible";
  scheduleNote: string;
  steps: { order: number; when: string; action: string; guidance: string; quantity: string }[];
  completedStepOrders?: number[];
};

export type FocusState = { stepOrder: number; status: "running" | "awaiting_reflection" | "completed" | "needs_replan" | "cancelled"; endsAt: number; durationSeconds: number };
const modeLabel = { today: "تنفيذ اليوم", date_specific: "موعد محدد", days_of_week: "أيام مختارة", flexible: "بدون موعد" };

export default function ConversationPlan({ plan, sessions, onStart, onToggle }: { plan: ConversationPlanData; sessions: FocusState[]; onStart: (step: ConversationPlanData["steps"][number]) => void; onToggle: (order: number) => void }) {
  const done = plan.completedStepOrders ?? [];
  const progress = Math.round((done.length / plan.steps.length) * 100);
  return <section className="conversation-plan">
    <header className="conversation-plan-head"><span className="plan-spark"><Sparkles size={18} /></span><div><span>خطة محفوظة من المحادثة</span><h2>{plan.title}</h2><p>{plan.summary}</p></div></header>
    <div className="schedule-lockup"><BookOpenCheck size={16} /><div><strong>{modeLabel[plan.scheduleMode]}</strong><span>{plan.scheduleNote}</span></div></div>
    <div className="chat-plan-progress"><div><span>التقدم</span><b>{done.length}/{plan.steps.length}</b></div><i><em style={{ width: `${progress}%` }} /></i><strong>{progress}%</strong></div>
    <div className="chat-steps">{plan.steps.map((step) => {
      const checked = done.includes(step.order);
      const session = sessions.find((item) => item.stepOrder === step.order && ["running", "awaiting_reflection", "needs_replan"].includes(item.status));
      return <article key={step.order} className={checked ? "is-complete" : ""}>
        <button className="step-check" onClick={() => onToggle(step.order)} aria-label={checked ? `إلغاء إنجاز ${step.action}` : `تأشير إنجاز ${step.action}`}>{checked ? <Check size={14} strokeWidth={3} /> : <Circle size={15} />}</button>
        <div className="chat-step-copy"><span className="chat-step-number">{String(step.order).padStart(2, "0")}</span><h3>{step.action}</h3><p>{step.guidance}</p><div className="step-meta"><span><Clock3 size={12} />{step.quantity}</span><span>{step.when}</span></div>{!checked && <button className={`start-now ${session ? "active-session" : ""}`} onClick={() => !session && onStart(step)} disabled={Boolean(session)}>{session?.status === "awaiting_reflection" ? "ينتظر إجابتك" : session?.status === "needs_replan" ? "قيد التعديل" : session ? "الجلسة تعمل" : <><Play size={13} fill="currentColor" /> ابدأ الآن</>}</button>}</div>
      </article>;
    })}</div>
  </section>;
}
