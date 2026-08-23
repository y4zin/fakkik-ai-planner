/**
 * فكّك الحواري: يدخل المستخدم في محادثة حرة، ويستوضح الذكاء طريقة التنفيذ
 * قبل أن يصنع أي خطة. لا توجد هنا حقول ثابتة أو افتراضات عن الجدولة اليومية.
 */
import { useState } from "react";
import { MessageCircleMore, Plus, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AIChatBox } from "@/components/AIChatBox";
import ConversationPlan, { type ConversationPlanData } from "@/components/ConversationPlan";
import { trpc } from "@/lib/trpc";

type ChatMessage = { role: "user" | "assistant"; content: string };

const openingMessage: ChatMessage = {
  role: "assistant",
  content: "أهلًا، أنا **فكّك**. اكتب هدفك كما تفكر فيه. لن أفترض توزيعًا يوميًا؛ سأفهم منك هل تريده اليوم، في أيام أو تواريخ محددة، أو مرنًا بلا موعد، ثم أبني الخطة وفق ذلك.",
};

const examples = [
  "أريد قراءة 340 صفحة اليوم فقط",
  "أريد جري 500 متر يومي السبت والثلاثاء خلال 3 أسابيع",
  "أريد إنهاء عرض مشروعي قبل 12 سبتمبر، لكني متاح مساءً فقط",
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([openingMessage]);
  const [plan, setPlan] = useState<ConversationPlanData | null>(null);

  const chatMutation = trpc.planning.chat.useMutation({
    onSuccess: (reply) => {
      const assistantContent = reply.status === "needs_context" && reply.missingDetail
        ? `${reply.assistantMessage}\n\n**سؤالي التالي:** ${reply.missingDetail}`
        : reply.assistantMessage;
      setMessages((current) => [...current, { role: "assistant", content: assistantContent }]);
      if (reply.plan) {
        setPlan(reply.plan);
        toast.success("فهمت فكّك طريقة التنفيذ وبنى الخطة وفق حديثك.");
      }
    },
    onError: (error) => {
      setMessages((current) => [...current, { role: "assistant", content: `تعذر عليّ إكمال هذه الخطوة الآن. ${error.message}` }]);
      toast.error("تعذر إرسال الرسالة إلى مساعد التخطيط.");
    },
  });

  const sendMessage = (content: string) => {
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    chatMutation.mutate({ messages: next.map(({ role, content: text }) => ({ role, content: text })) });
  };

  const resetConversation = () => {
    setMessages([openingMessage]);
    setPlan(null);
    toast.message("بدأت محادثة تخطيط جديدة.");
  };

  return <div className="chat-app" dir="rtl"><main className="chat-shell">
    <header className="chat-header">
      <div className="chat-brand"><span className="chat-brand-mark"><img src="/manus-storage/fakkik-symbol-logo_819d919f.png" alt="رمز فكّك" /></span><div><strong>فكّك</strong><span>محادثة تخطيط دقيقة</span></div></div>
      <button className="new-conversation" onClick={resetConversation}><RotateCcw size={16} /> محادثة جديدة</button>
    </header>

    <section className="chat-intro">
      <span><Sparkles size={15} /> لا نفترض طريقة التنفيذ</span>
      <h1>تحدث عن مهمتك،<br /><em>وفكّك يفهم الباقي.</em></h1>
      <p>قل مثلًا: «أريدها اليوم»، أو «نفذها كل سبت»، أو «ابدأها في 12 سبتمبر». سيسأل فكّك فقط عما ينقصه ليكتب خطة واقعية.</p>
      <div className="schedule-choices"><span>اليوم</span><i /><span>تاريخ محدد</span><i /><span>أيام تختارها</span><i /><span>مرنة</span></div>
    </section>

    <section className="conversation-card" aria-label="محادثة فكّك للتخطيط">
      <div className="conversation-card-head"><span className="chat-status"><i /> مساعد التخطيط متصل</span><span>يتذكر سياق هذه المحادثة</span></div>
      <AIChatBox
        messages={messages}
        onSendMessage={sendMessage}
        isLoading={chatMutation.isPending}
        height="440px"
        placeholder="اكتب المهمة أو أجب على سؤال فكّك…"
        className="fakkik-chatbox"
        suggestedPrompts={messages.length === 1 ? examples : undefined}
      />
    </section>

    {plan ? <ConversationPlan plan={plan} /> : <section className="plan-waiting"><MessageCircleMore size={20} /><div><strong>لم نبنِ خطة بعد.</strong><span>أرسل المهمة، ثم أجب عن السؤال الذي يغير طريقة تنفيذها فعلًا.</span></div></section>}

    <footer className="chat-footer"><Plus size={13} /> كل خطة تبدأ بمحادثة لا بتخمين <span>صنع من قبل نور</span></footer>
  </main></div>;
}
