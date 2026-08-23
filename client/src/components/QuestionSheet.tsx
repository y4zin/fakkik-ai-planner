/**
 * ورشة الأسئلة الإلزامية: لا تسمح ببناء خطة قبل اكتمال المقاييس الأساسية.
 */
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CircleHelp, Sparkles, X } from "lucide-react";
import { createDefaultAnswers, createQuestions, detectTaskKind, type PlanAnswers, type TaskKind } from "@/lib/taskPlanner";

type QuestionSheetProps = {
  open: boolean;
  initialTask: string;
  initialAnswers?: PlanAnswers;
  onClose: () => void;
  onSubmit: (task: string, answers: PlanAnswers) => void;
};

const kindCopy: Record<TaskKind, { title: string; detail: string }> = {
  reading: { title: "أسئلة خطة القراءة", detail: "حدد الحجم وقدرتك الأسبوعية. بعدها نقسم الصفحات بنطاقات حقيقية." },
  running: { title: "أسئلة خطة الجري", detail: "نحتاج مستواك ووقتك المتاح حتى لا تتحول الخطة إلى ضغط غير واقعي." },
  general: { title: "أسئلة تفكيك المهمة", detail: "اجعل النتيجة والوقت واضحين قبل أن نحول المهمة إلى خطوات يومية." },
};

export default function QuestionSheet({ open, initialTask, initialAnswers, onClose, onSubmit }: QuestionSheetProps) {
  const [task, setTask] = useState("");
  const [answers, setAnswers] = useState<PlanAnswers>({});
  const [error, setError] = useState("");
  const kind = detectTaskKind(task);
  const questions = useMemo(() => createQuestions(task), [task]);

  useEffect(() => {
    if (!open) return;
    setTask(initialTask);
    setAnswers({ ...createDefaultAnswers(initialTask), ...(initialAnswers ?? {}) });
    setError("");
  }, [open, initialTask, initialAnswers]);

  if (!open) return null;

  const updateTask = (value: string) => {
    const nextKind = detectTaskKind(value);
    if (nextKind !== kind) setAnswers(createDefaultAnswers(value));
    setTask(value);
  };

  const submit = () => {
    if (!task.trim()) {
      setError("اكتب المهمة أولًا حتى نعرف نوع الأسئلة المناسبة لها.");
      return;
    }
    const incomplete = questions.find((question) => {
      const value = answers[question.id]?.trim();
      if (!value) return true;
      if (question.type === "number" && Number(value) < (question.min ?? 1)) return true;
      return false;
    });
    if (incomplete) {
      setError(`أكمل حقل «${incomplete.label}» قبل بناء الخطة.`);
      return;
    }
    onSubmit(task.trim(), answers);
  };

  const copy = kindCopy[kind];
  return (
    <div className="sheet-layer" role="dialog" aria-modal="true" aria-labelledby="question-sheet-title">
      <button className="sheet-backdrop" onClick={onClose} aria-label="إغلاق الأسئلة" />
      <section className="question-sheet">
        <header className="sheet-head">
          <div className="sheet-title"><span className="sheet-icon"><CircleHelp size={19} /></span><div><span>المرحلة الإلزامية</span><h2 id="question-sheet-title">{copy.title}</h2></div></div>
          <button className="sheet-close" onClick={onClose} aria-label="إغلاق"><X size={20} /></button>
        </header>

        <div className="sheet-body">
          <p className="sheet-intro">{copy.detail}</p>
          <label className="field-group task-field"><span>المهمة</span><input value={task} onChange={(event) => updateTask(event.target.value)} placeholder="اكتب المهمة كما تفكر بها" /></label>
          <div className="required-note"><AlertCircle size={15} /> كل الحقول أدناه مطلوبة لكي تكون الخطة دقيقة.</div>
          <div className="question-list">
            {questions.map((question, index) => (
              <label className="field-group" key={question.id}>
                <span><b>{String(index + 1).padStart(2, "0")}</b>{question.label}</span>
                <small>{question.hint}</small>
                {question.type === "select" ? (
                  <select value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}>
                    <option value="" disabled>اختر إجابة</option>
                    {question.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : (
                  <div className="input-unit"><input type={question.type} min={question.min} value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder={question.type === "text" ? "اكتب النتيجة المطلوبة" : "0"} /><em>{question.suffix}</em></div>
                )}
              </label>
            ))}
          </div>
          {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
        </div>
        <footer className="sheet-footer"><button className="build-plan" onClick={submit}><Sparkles size={18} /> ابنِ خطة دقيقة من إجاباتي <ArrowLeft size={18} /></button></footer>
      </section>
    </div>
  );
}

