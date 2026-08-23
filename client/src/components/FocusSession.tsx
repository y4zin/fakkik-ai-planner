import { useEffect, useState } from "react";
import { AlarmClock, CheckCircle2, PauseCircle, TimerReset } from "lucide-react";

export type FocusSessionView = { id: string; conversationId?: string; stepOrder: number; stepTitle: string; durationSeconds: number; endsAt: number; status: "running" | "awaiting_reflection" | "completed" | "needs_replan" | "cancelled" };

function clock(seconds: number) { const safe = Math.max(0, seconds); return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`; }

export function FocusSessionCard({ session }: { session: FocusSessionView | null }) {
  const [remaining, setRemaining] = useState(session ? Math.ceil((session.endsAt - Date.now()) / 1000) : 0);
  useEffect(() => { setRemaining(session ? Math.ceil((session.endsAt - Date.now()) / 1000) : 0); if (!session || session.status !== "running") return; const id = window.setInterval(() => setRemaining(Math.ceil((session.endsAt - Date.now()) / 1000)), 1000); return () => window.clearInterval(id); }, [session?.id, session?.endsAt, session?.status]);
  if (!session) return <section className="session-empty"><AlarmClock size={23} /><div><strong>لا توجد جلسة تعمل الآن</strong><span>اختر «ابدأ الآن» من أي خطوة، وسيستمر العداد حتى لو أغلقت الصفحة.</span></div></section>;
  const ended = session.status === "awaiting_reflection" || remaining <= 0;
  return <section className={`focus-card ${ended ? "awaiting" : ""}`}><span className="focus-label">{ended ? "الوقت انتهى · نحتاج إجابتك" : "جلسة تركيز نشطة"}</span><h2>{session.stepTitle}</h2><div className="focus-clock"><TimerReset size={24} /><strong>{ended ? "00:00" : clock(remaining)}</strong></div><p>{ended ? "ارجع إلى المحادثة أو أجب عن سؤال الإكمال الذي ظهر لك." : "لا تحتاج للبقاء هنا؛ ستبقى الجلسة محفوظة حتى موعد نهايتها."}</p><span className="focus-duration"><PauseCircle size={13} />مدة الجلسة: {Math.round(session.durationSeconds / 60)} دقيقة</span></section>;
}

export function CompletionQuestion({ session, onYes, onNo, busy }: { session: FocusSessionView | null; onYes: () => void; onNo: () => void; busy: boolean }) {
  if (!session || session.status !== "awaiting_reflection") return null;
  return <div className="completion-layer" role="dialog" aria-modal="true"><section className="completion-question"><span><CheckCircle2 size={20} /></span><small>انتهى عداد الجلسة</small><h2>هل أكملت هذه الفقرة كاملة؟</h2><p>{session.stepTitle}</p><div><button onClick={onYes} disabled={busy} className="yes-action">نعم، ضع علامة إنجاز</button><button onClick={onNo} disabled={busy} className="no-action">لا، أحتاج أن نعدّلها</button></div></section></div>;
}
