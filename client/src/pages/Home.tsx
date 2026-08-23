/** واجهة فكّك المستمرة: محادثات محفوظة، ذاكرة عملية، وجلسة تركيز تعود بعد مغادرة التطبيق. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, BotMessageSquare, BrainCircuit, Clock3, History, Instagram, ListChecks, LockKeyhole, MessageCircleMore, Plus, RotateCcw, Sparkles, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import ConversationPlan, { type ConversationPlanData, type FocusState } from "@/components/ConversationPlan";
import { CompletionQuestion, FocusSessionCard, type FocusSessionView } from "@/components/FocusSession";
import ExecutionBoard from "@/components/ExecutionBoard";
import { ChatSendButton } from "@/components/ChatSendButton";
import { AccountSheet } from "@/components/AccountSheet";
import { trpc } from "@/lib/trpc";
import { strictDurationFor } from "@/lib/strictMode";

type Tab = "chat" | "session" | "progress" | "history";
type PlannerMessage = Pick<Message, "role" | "content">;
const openingMessage: PlannerMessage = { role: "assistant", content: "أهلًا، أنا **فكّك**. أخبرني بما تريد إنجازه وبالطريقة التي تناسبك. أستطيع تنظيم القراءة، المسلسلات، التصفح، الدراسة، والمهام المركبة، وسأحفظ ما يفيدك في المرات القادمة." };
const examples = ["أريد مشاهدة 7 حلقات، كل حلقة 45 دقيقة، مع إنهاء 80 صفحة من كتاب", "أريد قراءة 340 صفحة اليوم فقط", "أريد تصفح إنستغرام 20 دقيقة بلا تشتت ثم العودة للعمل"];

function workspaceKey() { const key = "fakkik-workspace-id"; let value = window.localStorage.getItem(key); if (!value) { value = crypto.randomUUID(); window.localStorage.setItem(key, value); } return value; }
function latin(value: string) { return value.replace(/[٠-٩]/g, (item) => String("٠١٢٣٤٥٦٧٨٩".indexOf(item))).replace(/[۰-۹]/g, (item) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(item))); }
function durationFor(step: ConversationPlanData["steps"][number]) { const source = latin(`${step.quantity} ${step.guidance}`); const min = source.match(/(\d+)\s*(?:دقيقة|دقائق|min)/i); if (min) return Math.max(60, Math.min(Number(min[1]) * 60, 86_400)); const hour = source.match(/(\d+)\s*(?:ساعة|ساعات|hour)/i); return hour ? Math.max(60, Math.min(Number(hour[1]) * 3600, 86_400)) : 25 * 60; }
function countdown(seconds: number) { const safe = Math.max(0, seconds); const hours = Math.floor(safe / 3600); const minutes = Math.floor((safe % 3600) / 60); const rest = safe % 60; return hours ? `${hours}س ${minutes}د` : minutes ? `${minutes}د ${rest}ث` : `${rest}ث`; }

export default function Home() {
  const [workspaceId] = useState(workspaceKey);
  const [tab, setTab] = useState<Tab>("chat");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PlannerMessage[]>([openingMessage]);
  const [plan, setPlan] = useState<ConversationPlanData | null>(null);
  const [repairSession, setRepairSession] = useState<FocusSessionView | null>(null);
  const [obstacle, setObstacle] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [strictInput, setStrictInput] = useState("10 ساعات");
  const [clockNow, setClockNow] = useState(() => Date.now());
  const utils = trpc.useUtils();
  const historyQuery = trpc.planning.list.useQuery({ workspaceId });
  const memoriesQuery = trpc.planning.memories.useQuery({ workspaceId });
  const detailQuery = trpc.planning.get.useQuery({ workspaceId, conversationId: currentConversationId ?? "unselected" }, { enabled: Boolean(currentConversationId) });
  const sessionQuery = trpc.focus.listForConversation.useQuery({ workspaceId, conversationId: currentConversationId ?? "unselected" }, { enabled: Boolean(currentConversationId), refetchInterval: 10_000 });
  const actionableQuery = trpc.focus.actionable.useQuery({ workspaceId }, { refetchInterval: 10_000 });
  const workspaceSessionsQuery = trpc.focus.listWorkspace.useQuery({ workspaceId }, { refetchInterval: 10_000 });
  const modeQuery = trpc.focus.mode.useQuery({ workspaceId }, { refetchInterval: 10_000 });
  const announcedSessionRef = useRef<string | null>(null);

  useEffect(() => { const detail = detailQuery.data; if (!detail) return; setMessages(detail.messages.length ? detail.messages : [openingMessage]); setPlan((detail.plan as ConversationPlanData | null) ?? null); }, [detailQuery.data?.id, detailQuery.data?.updatedAt]);
  const allSessions = useMemo(() => (sessionQuery.data ?? []).map((item) => ({ ...item, status: item.status as FocusSessionView["status"] })), [sessionQuery.data]);
  const actionable = useMemo(() => (actionableQuery.data ?? []).map((item) => ({ ...item, status: item.status as FocusSessionView["status"] })), [actionableQuery.data]);
  const workspaceSessions = useMemo(() => (workspaceSessionsQuery.data ?? []).map((item) => ({ ...item, status: item.status as FocusSessionView["status"] })), [workspaceSessionsQuery.data]);
  const awaiting = actionable.find((item) => item.status === "awaiting_reflection") ?? null;
  const currentSession = allSessions.find((item) => item.status === "running") ?? actionable.find((item) => item.status === "running") ?? awaiting;
  const strictActive = Boolean(modeQuery.data?.strictEndsAt && modeQuery.data.strictEndsAt > Date.now());
  const strictRemaining = modeQuery.data?.strictEndsAt ? Math.ceil((modeQuery.data.strictEndsAt - clockNow) / 1000) : 0;
  const completedOrders = plan?.completedStepOrders ?? [];
  const nextPlanStep = plan?.steps.find((step) => !completedOrders.includes(step.order) && step.order !== currentSession?.stepOrder) ?? null;

  useEffect(() => { if (!strictActive) return; const timeout = window.setTimeout(() => setClockNow(Date.now()), 1_000); return () => window.clearTimeout(timeout); }, [strictActive, clockNow]);

  useEffect(() => {
    if (!awaiting || announcedSessionRef.current === awaiting.id) return;
    announcedSessionRef.current = awaiting.id;
    toast.message("انتهت جلسة التركيز؛ أجب بنعم أو لا لمتابعة الترتيب.");
    if ("Notification" in window && Notification.permission === "granted") new Notification("فكّك: انتهت جلسة التركيز", { body: `${awaiting.stepTitle} — هل اكتملت؟` });
  }, [awaiting?.id]);

  const chatMutation = trpc.planning.chat.useMutation({ onSuccess: (reply) => { setCurrentConversationId(reply.conversationId); setMessages(reply.messages); if (reply.plan) setPlan(reply.plan); utils.planning.list.invalidate({ workspaceId }); utils.planning.memories.invalidate({ workspaceId }); toast.success(reply.plan ? "حُفظت الخطة وسياقها." : "حفظ فكّك إجابتك وسيتابع معك."); }, onError: (error) => toast.error(error.message) });
  const updatePlanMutation = trpc.planning.updatePlan.useMutation({ onSuccess: () => { utils.planning.list.invalidate({ workspaceId }); if (currentConversationId) utils.planning.get.invalidate({ workspaceId, conversationId: currentConversationId }); }, onError: (error) => toast.error(error.message) });
  const startMutation = trpc.focus.start.useMutation({ onSuccess: () => { if (currentConversationId) utils.focus.listForConversation.invalidate({ workspaceId, conversationId: currentConversationId }); utils.focus.actionable.invalidate({ workspaceId }); utils.focus.listWorkspace.invalidate({ workspaceId }); utils.focus.mode.invalidate({ workspaceId }); setTab("session"); toast.success("بدأت جلسة التركيز وحُفظ وقت نهايتها."); }, onError: (error) => toast.error(error.message) });
  const resolveMutation = trpc.focus.resolve.useMutation({ onSuccess: (result) => { const conversationId = result.conversationId ?? currentConversationId; if (conversationId) { utils.focus.listForConversation.invalidate({ workspaceId, conversationId }); utils.planning.get.invalidate({ workspaceId, conversationId }); } utils.focus.actionable.invalidate({ workspaceId }); utils.focus.listWorkspace.invalidate({ workspaceId }); utils.planning.list.invalidate({ workspaceId }); utils.focus.mode.invalidate({ workspaceId }); if (result.nextSession) { setTab("session"); toast.success("استمر فكّك تلقائيًا إلى الخطوة التالية."); } }, onError: (error) => toast.error(error.message) });
  const cancelMutation = trpc.focus.cancel.useMutation({ onSuccess: () => { if (currentConversationId) utils.focus.listForConversation.invalidate({ workspaceId, conversationId: currentConversationId }); utils.focus.actionable.invalidate({ workspaceId }); utils.focus.listWorkspace.invalidate({ workspaceId }); utils.focus.mode.invalidate({ workspaceId }); setTab("chat"); toast.message("أُلغيت الجلسة وفتحت الخطوات التالية."); }, onError: (error) => toast.error(error.message) });
  const modeMutation = trpc.focus.configureMode.useMutation({ onSuccess: () => { utils.focus.mode.invalidate({ workspaceId }); toast.success("تم حفظ إعداد التنفيذ."); }, onError: (error) => toast.error(error.message) });
  const repairMutation = trpc.planning.repair.useMutation({ onSuccess: (reply) => { setRepairSession(null); setObstacle(""); setCurrentConversationId(reply.conversationId); setMessages(reply.messages); if (reply.plan) setPlan(reply.plan); utils.focus.listForConversation.invalidate({ workspaceId, conversationId: reply.conversationId }); utils.planning.get.invalidate({ workspaceId, conversationId: reply.conversationId }); utils.focus.actionable.invalidate({ workspaceId }); utils.focus.listWorkspace.invalidate({ workspaceId }); utils.planning.list.invalidate({ workspaceId }); utils.planning.memories.invalidate({ workspaceId }); setTab("chat"); toast.success(reply.plan ? "فهم فكّك العائق وعدّل الخطة." : "فهم فكّك العائق ويسأل عن التفصيل الأخير."); }, onError: (error) => toast.error(error.message) });
  const forgetMutation = trpc.planning.forgetMemory.useMutation({ onSuccess: () => utils.planning.memories.invalidate({ workspaceId }) });

  const sendMessage = (content: string) => {
    const message = content.trim();
    if (!message || chatMutation.isPending) return;
    setMessages((previous) => [...previous, { role: "user", content: message }]);
    chatMutation.mutate({ workspaceId, conversationId: currentConversationId ?? undefined, message });
  };
  const newConversation = () => { setCurrentConversationId(null); setMessages([openingMessage]); setPlan(null); setTab("chat"); toast.message("بدأت محادثة جديدة؛ ستبقى المحادثات السابقة في المحفوظات."); };
  const startStep = (step: ConversationPlanData["steps"][number]) => { if (!currentConversationId) return toast.error("أرسل الخطة أولًا حتى نستطيع حفظ الجلسة."); if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission(); startMutation.mutate({ workspaceId, conversationId: currentConversationId, stepOrder: step.order, stepTitle: step.action, durationSeconds: durationFor(step) }); };
  const persistPlan = (next: ConversationPlanData) => { setPlan(next); if (currentConversationId) updatePlanMutation.mutate({ workspaceId, conversationId: currentConversationId, plan: next }); };
  const toggleStep = (order: number) => { if (!plan) return; const completed = plan.completedStepOrders ?? []; persistPlan({ ...plan, completedStepOrders: completed.includes(order) ? completed.filter((item) => item !== order) : [...completed, order] }); };
  const completeFromTimer = () => { if (!awaiting) return; if (plan && !plan.completedStepOrders?.includes(awaiting.stepOrder)) persistPlan({ ...plan, completedStepOrders: [...(plan.completedStepOrders ?? []), awaiting.stepOrder] }); resolveMutation.mutate({ workspaceId, sessionId: awaiting.id, outcome: "completed" }); toast.success("تم وضع علامة إنجاز على الخطوة."); };
  const startRepair = () => { if (awaiting) { setRepairSession(awaiting); setObstacle(""); } };
  const sendRepair = () => { if (!repairSession || obstacle.trim().length < 3) return; repairMutation.mutate({ workspaceId, conversationId: currentConversationId ?? undefined, sessionId: repairSession.id, stepTitle: repairSession.stepTitle, obstacle: obstacle.trim() }); };
  const sessionState: FocusState[] = [...allSessions, ...actionable.filter((item) => item.conversationId === currentConversationId)].map((item) => ({ stepOrder: item.stepOrder, status: item.status, endsAt: item.endsAt, durationSeconds: item.durationSeconds }));

  return <div className="chat-app" dir="rtl"><main className="chat-shell">
    <header className="chat-header"><div className="chat-brand"><span className="chat-brand-mark"><img src="/manus-storage/fakkik-symbol-logo_819d919f.png" alt="رمز فكّك" /></span><div><strong>فكّك</strong><span>ذاكرة تخطيط مستمرة</span></div></div><div className="header-actions"><button className="account-trigger" onClick={() => setAccountOpen(true)}><UserRound size={16} /> حسابي</button><button className="new-conversation" onClick={newConversation}><RotateCcw size={16} /> محادثة جديدة</button></div></header>
    <nav className="app-tabs app-tabs-four" aria-label="أقسام فكّك"><button className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}><BotMessageSquare size={16} /> المحادثة</button><button className={tab === "session" ? "active" : ""} onClick={() => setTab("session")}><Clock3 size={16} /> جلسة الآن{currentSession && <i />}</button><button className={tab === "progress" ? "active" : ""} onClick={() => setTab("progress")}><ListChecks size={16} /> التنفيذ</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><History size={16} /> المحفوظات</button></nav>
    {tab === "chat" && <>
      <section className="chat-intro"><span><Sparkles size={15} /> يتذكر ما يفيدك، لا ما يربكك</span><h1>حوّل نيتك إلى<br /><em>جلسات قابلة للإنجاز.</em></h1><p>يمكنك جمع كتاب ومسلسل وتصفح في رسالة واحدة. يفهم فكّك القياسات والوقت والعوائق، ويحفظ الأنماط التي تجعل خططك أفضل لاحقًا.</p><div className="decomposition-proof" aria-label="مثال تفكيك كمي"><small>مثال فكّك الدقيق</small><div><b>340 صفحة</b><i /><b>16 جلسة</b><i /><b>48 خطوة</b><i /><b>إنجاز</b></div></div></section>
      <section className="conversation-card"><div className="conversation-card-head"><span className="chat-status"><i /> مساعد التخطيط يتذكر السياق</span><span>{currentConversationId ? "محادثة محفوظة" : "محادثة جديدة"}</span></div><AIChatBox messages={messages as Message[]} onSendMessage={sendMessage} isLoading={chatMutation.isPending} height="390px" placeholder="اكتب المهمة أو أجب على سؤال فكّك…" className="fakkik-chatbox" suggestedPrompts={messages.length === 1 ? examples : undefined} /></section>
      {plan ? <ConversationPlan plan={plan} sessions={sessionState} activeSessionTitle={currentSession?.stepTitle} onStart={startStep} onToggle={toggleStep} /> : <section className="plan-waiting"><MessageCircleMore size={20} /><div><strong>ابدأ بحوار واحد واضح.</strong><span>يطلب فكّك التفاصيل المؤثرة فقط، ثم يحفظ الخطة لتعود إليها في أي وقت.</span></div></section>}
    </>}
    {tab === "session" && <section className="section-screen"><div className="section-title"><span>جلسة الآن</span><h1>التركيز الجاري</h1><p>العداد محفوظ بوقت نهاية حقيقي. عند انتهائه يظل سؤال الإكمال ظاهرًا حتى تجيب.</p></div><FocusSessionCard session={currentSession} strictEndsAt={modeQuery.data?.strictEndsAt} onCancel={() => currentSession && cancelMutation.mutate({ workspaceId, sessionId: currentSession.id })} cancelling={cancelMutation.isPending} /><section className="mode-control"><div><span><LockKeyhole size={16} /> الوضع الصارم</span><strong>{strictActive ? `متبقٍ ${countdown(strictRemaining)} · مقفل حتى ${new Date(modeQuery.data!.strictEndsAt!).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}` : "مرن ويمكن إلغاء الجلسة"}</strong><p>اكتب مثل: 10 ساعات، 10 أيام، 38 دقيقة، أو 93 ثانية. أثناء القفل لا يمكن إلغاء أي جلسة.</p></div><div className="strict-form">{strictActive ? <span className="strict-auto-end">القفل نشط ولا يمكن تقصيره أو تعطيله قبل الوقت المحدد.</span> : <><input value={strictInput} onChange={(event) => setStrictInput(event.target.value)} aria-label="مدة الوضع الصارم" placeholder="مثال: 3 ساعات" /><button onClick={() => { const seconds = strictDurationFor(strictInput); if (!seconds) return toast.error("اكتب مدة واضحة مثل 10 ساعات أو 38 دقيقة."); modeMutation.mutate({ workspaceId, strictDurationSeconds: seconds, continuePlan: modeQuery.data?.continuePlan ?? false, conversationId: currentConversationId }); }} disabled={modeMutation.isPending}>تشغيل الوضع الصارم</button></>}</div><label className="continue-plan"><input type="checkbox" checked={modeQuery.data?.continuePlan ?? false} onChange={(event) => modeMutation.mutate({ workspaceId, continuePlan: event.target.checked, conversationId: currentConversationId })} disabled={!currentConversationId} /><span><strong>استمر في الخطة</strong><small>بعد «نعم» يبدأ فكّك الخطوة غير المكتملة التالية تلقائيًا؛ يعمل مع الوضع العادي أو الصارم.</small></span></label>{modeQuery.data?.continuePlan && <div className="next-step-preview"><strong>بعد الجلسة:</strong><span>{nextPlanStep ? `${nextPlanStep.action} · ${nextPlanStep.quantity}` : "إنهاء الخطة بعد حسم هذه الجلسة."}</span></div>}</section>{awaiting && <button className="review-now" onClick={() => setTab("chat")}>لدي جلسة انتهت · أجب الآن</button>}</section>}
    {tab === "progress" && <ExecutionBoard plan={plan} conversationId={currentConversationId} sessions={workspaceSessions} activeSessionTitle={currentSession?.stepTitle} onStart={startStep} onReview={() => awaiting ? setTab("chat") : setTab("session")} />}
    {tab === "history" && <section className="section-screen"><div className="section-title"><span>المحفوظات والذاكرة</span><h1>كل ما تعلّمه فكّك</h1><p>افتح أي محادثة سابقة للتعديل والمتابعة، واحذف أي ذكرى لا تريد الاحتفاظ بها.</p></div><section className="memory-card"><div><BrainCircuit size={18} /><strong>ما يتذكره فكّك</strong></div>{memoriesQuery.data?.length ? memoriesQuery.data.map((memory) => <article key={memory.id}><span>{memory.kind === "obstacle" ? "عائق" : memory.kind === "constraint" ? "قيد" : memory.kind === "success_pattern" ? "نجح" : "تفضيل"}</span><p>{memory.content}</p><button onClick={() => forgetMutation.mutate({ workspaceId, memoryId: memory.id })} aria-label="حذف هذه الذكرى"><X size={14} /></button></article>) : <p className="empty-small">لا توجد ذكريات بعد؛ تُحفظ فقط التفضيلات والعوائق المفيدة للتخطيط القادم.</p>}</section><section className="history-list"><div className="history-heading"><Archive size={17} /><strong>المحادثات المحفوظة</strong></div>{historyQuery.data?.length ? historyQuery.data.map((item) => <button key={item.id} className={item.id === currentConversationId ? "selected" : ""} onClick={() => { setCurrentConversationId(item.id); setTab("chat"); }}><div><strong>{item.title}</strong><span>{item.status === "planned" ? "لها خطة" : "قيد المحادثة"}</span></div><time>{new Date(item.updatedAt).toLocaleDateString("ar-EG")}</time></button>) : <p className="empty-small">ستظهر هنا كل محادثة بعد أول رسالة ترسلها.</p>}</section></section>}
    <footer className="chat-footer"><Plus size={13} /> كل خطة تبدأ بمحادثة لا بتخمين <span>تطوير يازِين · <a href="https://instagram.com/pro_hg_i" target="_blank" rel="noreferrer"><Instagram size={12} />@pro_hg_i</a></span></footer>
    {accountOpen && <AccountSheet onClose={() => setAccountOpen(false)} onConnect={(email) => toast.message(`واجهة حساب ${email} جاهزة؛ أضف بيانات Supabase من الإعدادات لتفعيل الدخول الحقيقي.`)} />}
    <CompletionQuestion session={awaiting} busy={resolveMutation.isPending || repairMutation.isPending} onYes={completeFromTimer} onNo={startRepair} />
    {repairSession && <div className="repair-layer" role="dialog" aria-modal="true"><section className="repair-sheet"><button onClick={() => setRepairSession(null)} aria-label="إغلاق"><X size={18} /></button><span>علاج العائق</span><h2>ما الذي أوقفك في هذه الخطوة؟</h2><p>{repairSession.stepTitle}</p><form onSubmit={(event) => { event.preventDefault(); sendRepair(); }}><div className="repair-input-row"><textarea value={obstacle} onChange={(event) => setObstacle(event.target.value)} placeholder="اكتب العائق هنا…" /><ChatSendButton label="إرسال العائق لفكّك" isLoading={repairMutation.isPending} disabled={repairMutation.isPending || obstacle.trim().length === 0} /></div></form></section></div>}
  </main></div>;
}
