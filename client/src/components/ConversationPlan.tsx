import { useState } from "react";
import { CalendarDays, Check, Circle, Clock3, MapPin, Sparkles } from "lucide-react";

export type ConversationPlanData = {
  title: string;
  summary: string;
  scheduleMode: "today" | "date_specific" | "days_of_week" | "flexible";
  scheduleNote: string;
  steps: { order: number; when: string; action: string; guidance: string; quantity: string }[];
};

const modeLabel = {
  today: "تنفيذ اليوم",
  date_specific: "موعد محدد",
  days_of_week: "أيام مختارة",
  flexible: "بدون موعد",
};

export default function ConversationPlan({ plan }: { plan: ConversationPlanData }) {
  const [done, setDone] = useState<number[]>([]);
  const toggle = (order: number) => setDone((current) => current.includes(order) ? current.filter((item) => item !== order) : [...current, order]);
  const complete = Math.round((done.length / plan.steps.length) * 100);
  return <section className="conversation-plan">
    <header className="conversation-plan-head">
      <span className="plan-spark"><Sparkles size={18} /></span>
      <div><span>خطة من المحادثة</span><h2>{plan.title}</h2><p>{plan.summary}</p></div>
    </header>
    <div className="schedule-lockup"><CalendarDays size={16} /><div><strong>{modeLabel[plan.scheduleMode]}</strong><span>{plan.scheduleNote}</span></div></div>
    <div className="chat-plan-progress"><div><span>التقدم</span><b>{done.length}/{plan.steps.length}</b></div><i><em style={{ width: `${complete}%` }} /></i><strong>{complete}%</strong></div>
    <div className="chat-steps">{plan.steps.map((step) => {
      const checked = done.includes(step.order);
      return <article key={step.order} className={checked ? "is-complete" : ""}>
        <button onClick={() => toggle(step.order)} aria-label={checked ? `إلغاء إنجاز ${step.action}` : `إنهاء ${step.action}`}>{checked ? <Check size={14} strokeWidth={3} /> : <Circle size={15} />}</button>
        <div className="chat-step-copy"><span className="chat-step-number">{String(step.order).padStart(2, "0")}</span><h3>{step.action}</h3><p>{step.guidance}</p><div><span><Clock3 size={12} />{step.quantity}</span><span><MapPin size={12} />{step.when}</span></div></div>
      </article>;
    })}</div>
  </section>;
}

