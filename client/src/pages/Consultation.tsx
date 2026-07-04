import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useTelegram } from "@/contexts/TelegramContext";
import { MessageSquare, CheckCircle, Loader2, ChevronDown } from "lucide-react";

const TOPICS = [
  { value: "gold", label: "طلا و سکه" },
  { value: "stock", label: "بورس و سهام" },
  { value: "currency", label: "ارز و دلار" },
  { value: "portfolio", label: "مدیریت سبد" },
  { value: "other", label: "سایر موارد" },
];

const TIME_SLOTS = [
  { value: "morning", label: "صبح (۸-۱۲)" },
  { value: "afternoon", label: "بعدازظهر (۱۲-۱۷)" },
  { value: "evening", label: "عصر (۱۷-۲۱)" },
];

export default function Consultation() {
  const { registeredUser, telegramUser, twa } = useTelegram();
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: registeredUser?.name ?? (telegramUser ? `${telegramUser.first_name}${telegramUser.last_name ? " " + telegramUser.last_name : ""}` : ""),
    phone: registeredUser?.phone ?? "",
    topic: "gold" as "gold" | "stock" | "currency" | "portfolio" | "other",
    message: "",
    preferredDate: "",
    preferredTime: "",
  });

  const submitMutation = trpc.consultation.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      twa.hideMainButton();
      twa.hapticFeedback("notification");
    },
  });

  useEffect(() => {
    twa.hideBackButton();
    return () => twa.hideMainButton();
  }, []);

  const isValid = form.name.trim().length > 0 && form.phone.trim().length >= 10;

  const handleSubmit = () => {
    if (!isValid || submitMutation.isPending) return;
    submitMutation.mutate({
      telegramId: telegramUser ? String(telegramUser.id) : undefined,
      telegramUsername: telegramUser?.username,
      name: form.name,
      phone: form.phone,
      topic: form.topic,
      message: form.message || undefined,
      preferredDate: form.preferredDate || undefined,
      preferredTime: form.preferredTime || undefined,
    });
  };

  if (submitted) {
    return (
      <div className="page-content flex flex-col items-center justify-center px-6 text-center" dir="rtl">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)" }}
        >
          <CheckCircle size={32} style={{ color: "#4ADE80" }} />
        </div>
        <h2 className="text-lg font-black mb-2" style={{ color: "var(--text)" }}>
          درخواست ثبت شد
        </h2>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--text-3)" }}>
          درخواست مشاوره شما با موفقیت ثبت شد. آرش صفری به زودی با شما تماس خواهد گرفت.
        </p>
        <div className="card-elevated p-4 w-full text-right mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-3)" }}>نام:</span>
            <span className="font-bold" style={{ color: "var(--text)" }}>{form.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "var(--text-3)" }}>موضوع:</span>
            <span className="font-bold" style={{ color: "var(--text)" }}>
              {TOPICS.find(t => t.value === form.topic)?.label}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            setSubmitted(false);
            setForm({ name: registeredUser?.name ?? "", phone: registeredUser?.phone ?? "", topic: "gold", message: "", preferredDate: "", preferredTime: "" });
          }}
          className="btn-secondary px-6 py-2.5 rounded-xl text-sm font-bold"
        >
          درخواست جدید
        </button>
      </div>
    );
  }

  return (
    <div className="page-content" dir="rtl">
      <header
        className="sticky top-0 z-40 px-4 py-3"
        style={{
          background: "rgba(11,18,32,0.96)",
          borderBottom: "1px solid var(--line)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <h1 className="text-sm font-black" style={{ color: "var(--text)" }}>درخواست مشاوره</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>با آرش صفری مشاوره بگیرید</p>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Advisor banner */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-deep) 100%)",
            border: "1px solid rgba(212,162,43,0.2)",
          }}
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-base font-black"
            style={{
              background: "linear-gradient(135deg, rgba(212,162,43,0.3), rgba(212,162,43,0.1))",
              border: "1px solid rgba(212,162,43,0.4)",
              color: "var(--gold-soft)",
            }}
          >
            آ
          </div>
          <div>
            <p className="text-sm font-black" style={{ color: "var(--text-on-navy)" }}>آرش صفری</p>
            <p className="text-xs" style={{ color: "rgba(248,250,252,0.6)" }}>مشاور و تحلیلگر سرمایه‌گذاری</p>
          </div>
        </div>

        {/* Form */}
        <div className="card-elevated p-4 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
            اطلاعات تماس
          </h3>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--text-2)" }}>
              نام و نام خانوادگی <span style={{ color: "#F87171" }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="مثال: علی محمدی"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--text-2)" }}>
              شماره تماس <span style={{ color: "#F87171" }}>*</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^0-9+]/g, "") }))}
              placeholder="09123456789"
              className="input-field"
              dir="ltr"
              style={{ textAlign: "right" }}
            />
          </div>
        </div>

        <div className="card-elevated p-4 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
            موضوع مشاوره
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {TOPICS.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, topic: t.value as typeof form.topic }))}
                className="py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center"
                style={{
                  background: form.topic === t.value ? "var(--navy)" : "var(--surface-2)",
                  color: form.topic === t.value ? "var(--text-on-navy)" : "var(--text-3)",
                  border: form.topic === t.value
                    ? "1px solid rgba(212,162,43,0.35)"
                    : "1px solid var(--line)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-elevated p-4 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
            زمان‌بندی (اختیاری)
          </h3>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--text-2)" }}>
              بازه زمانی ترجیحی
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, preferredTime: t.value }))}
                  className="py-2 px-2 rounded-xl text-[11px] font-bold transition-all text-center"
                  style={{
                    background: form.preferredTime === t.value ? "var(--navy)" : "var(--surface-2)",
                    color: form.preferredTime === t.value ? "var(--text-on-navy)" : "var(--text-3)",
                    border: form.preferredTime === t.value
                      ? "1px solid rgba(212,162,43,0.35)"
                      : "1px solid var(--line)",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--text-2)" }}>
              توضیحات بیشتر
            </label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="هر سوال یا موضوعی که می‌خواهید مطرح شود..."
              rows={3}
              className="input-field resize-none"
            />
          </div>
        </div>

        {submitMutation.isError && (
          <div
            className="rounded-xl p-3 text-xs"
            style={{ background: "rgba(185,28,28,0.1)", border: "1px solid rgba(185,28,28,0.25)", color: "#F87171" }}
          >
            خطا در ثبت درخواست. لطفاً دوباره تلاش کنید.
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isValid || submitMutation.isPending}
          className="w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isValid
              ? "linear-gradient(135deg, var(--navy) 0%, var(--navy-deep) 100%)"
              : "var(--surface-2)",
            border: isValid ? "1px solid rgba(212,162,43,0.3)" : "1px solid var(--line)",
            color: isValid ? "var(--text-on-navy)" : "var(--text-3)",
          }}
        >
          {submitMutation.isPending ? (
            <><Loader2 size={16} className="animate-spin" />در حال ثبت...</>
          ) : (
            <><MessageSquare size={16} />ثبت درخواست مشاوره</>
          )}
        </button>

        <p className="text-center text-xs pb-2" style={{ color: "var(--text-3)" }}>
          پس از ثبت، آرش صفری از طریق تلگرام با شما تماس خواهد گرفت
        </p>
      </div>
    </div>
  );
}
