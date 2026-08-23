import { CheckCircle2, CircleDashed, Clock3, Play, RotateCcw } from "lucide-react";
import type { ConversationPlanData } from "@/components/ConversationPlan";
import type { FocusSessionView } from "@/components/FocusSession";

type Session = FocusSessionView & { startedAt?: number };

const statusLabel = (status: Session["status"]) => {
  if (status === "completed") return "مكتملة";
  if (status === "running") return "تعمل الآن";
  if (status === "awaiting_reflection") return "بانتظار جوابك";
  if (status === "needs_replan") return "عُدّلت بعد عائق";
  return "ملغاة";
};

export default function ExecutionBoard({ plan, conversationId, sessions, onStart, onReview }: { plan: ConversationPlanData | null; conversationId: string | null; sessions: Session[]; onStart: (step: ConversationPlanData["steps"][number]) => void; onReview: () => void }) {
  const completed = sessions.filter((item) => item.status === "completed").slice(0, 4);
  const incomplete = sessions.filter((item) => ["running", "awaiting_reflection", "needs_replan"].includes(item.status)).slice(0, 4);
  const planSessions = sessions.filter((item) => item.conversationId === conversationId);
  const completedOrders = plan?.completedStepOrders ?? [];
  const later = plan?.steps.filter((step) => !completedOrders.includes(step.order) && !planSessions.some((item) => item.stepOrder === step.order && ["running", "awaiting_reflection"].includes(item.status))).slice(0, 4) ?? [];

  return <section className="execution-board" aria-label="لوحة التنفيذ">
    <div className="execution-board-head"><span>لوحة التنفيذ</span><h1>اعرف موضعك الآن</h1><p>يفصل فكّك ما اكتمل، وما يحتاج جوابك، والخطوات التي تنتظر دورها.</p></div>
    <div className="execution-stats"><div><CheckCircle2 size={17} /><strong>{completed.length}</strong><span>مكتمل</span></div><div><CircleDashed size={17} /><strong>{incomplete.length}</strong><span>قيد المتابعة</span></div><div><Clock3 size={17} /><strong>{later.length}</strong><span>لاحق</span></div></div>
    <div className="execution-columns">
      <section><header><CheckCircle2 size={16} /><strong>الإنجازات</strong></header>{completed.length ? completed.map((item) => <article key={item.id}><b>{item.stepTitle}</b><span>{statusLabel(item.status)}</span></article>) : <p>ستظهر هنا الجلسات التي أجبت عنها بـ«نعم».</p>}</section>
      <section><header><CircleDashed size={16} /><strong>جلسات غير مكتملة</strong></header>{incomplete.length ? incomplete.map((item) => <article key={item.id}><b>{item.stepTitle}</b><span>{statusLabel(item.status)}</span>{item.status === "awaiting_reflection" && <button onClick={onReview}>أجب الآن</button>}</article>) : <p>لا توجد جلسة معلّقة الآن.</p>}</section>
      <section><header><Clock3 size={16} /><strong>الجلسات اللاحقة</strong></header>{later.length ? later.map((step) => <article key={step.order}><b>{step.action}</b><span>{step.quantity} · {step.when}</span><button onClick={() => onStart(step)}><Play size={12} /> ابدأ عند دورها</button></article>) : <p>{plan ? "أنهيت الخطوات الظاهرة في هذه الخطة." : "افتح محادثة أو أنشئ خطة لتظهر الخطوات التالية."}</p>}</section>
    </div>
    <button className="execution-refresh" onClick={onReview}><RotateCcw size={14} /> راجع الجلسة المعلقة</button>
  </section>;
}
