import { useState } from "react";
import { useTelegram } from "@/contexts/TelegramContext";
import { Loader2, UserCheck, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

/**
 * ProfileSetup — صفحه تکمیل پروفایل برای کاربران جدید.
 * فقط یک بار نشان داده می‌شود. نام از تلگرام پیش‌پر می‌شود.
 */
export default function ProfileSetup() {
  const { telegramUser, register } = useTelegram();
  const [name, setName] = useState(
    telegramUser
      ? [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ")
      : ""
  );
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("لطفاً نام خود را وارد کنید"); return; }
    if (!phone.trim() || phone.length < 10) { toast.error("لطفاً شماره تلفن معتبر وارد کنید"); return; }

    setIsSubmitting(true);
    try {
      await register(name.trim(), phone.trim());
      toast.success("خوش آمدید!");
    } catch {
      toast.error("خطا در ثبت اطلاعات. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center p-5"
      style={{ background: "linear-gradient(180deg, var(--navy-deep) 0%, var(--bg) 100%)" }}
      dir="rtl"
    >
      {/* Subtle grid */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: "rgba(212,162,43,0.12)",
              border: "1px solid rgba(212,162,43,0.30)",
            }}
          >
            <UserCheck size={28} style={{ color: "var(--gold-soft)" }} />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-on-navy)" }}>
            تکمیل پروفایل
          </h1>
          <p className="text-sm" style={{ color: "rgba(248,250,252,0.65)" }}>
            برای استفاده از خدمات مشاوره، اطلاعات زیر را تأیید کنید
          </p>
        </div>

        {/* Telegram user badge */}
        {telegramUser && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl mb-5"
            style={{
              background: "rgba(30,58,138,0.4)",
              border: "1px solid rgba(212,162,43,0.25)",
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: "var(--navy)", color: "var(--gold-soft)" }}
            >
              {telegramUser.first_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text-on-navy)" }}>
                {telegramUser.first_name} {telegramUser.last_name}
              </p>
              {telegramUser.username && (
                <p className="text-xs" style={{ color: "rgba(248,250,252,0.55)" }}>
                  @{telegramUser.username}
                </p>
              )}
            </div>
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0"
              style={{
                background: "rgba(212,162,43,0.15)",
                color: "var(--gold-soft)",
                border: "1px solid rgba(212,162,43,0.3)",
              }}
            >
              تلگرام ✓
            </span>
          </div>
        )}

        {/* Form card */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>
                نام و نام خانوادگی
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: آرش صفری"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                  fontFamily: "'Vazirmatn', sans-serif",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--navy-soft)")}
                onBlur={e => (e.target.style.borderColor = "var(--line)")}
                dir="rtl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>
                شماره تلفن همراه
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                placeholder="09123456789"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                  fontFamily: "'Vazirmatn', sans-serif",
                  direction: "ltr",
                  textAlign: "right",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--navy-soft)")}
                onBlur={e => (e.target.style.borderColor = "var(--line)")}
                maxLength={13}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-sm transition-all"
              style={{
                background: isSubmitting ? "var(--navy)" : "var(--gold)",
                color: isSubmitting ? "rgba(255,255,255,0.6)" : "var(--text-on-gold)",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontFamily: "'Vazirmatn', sans-serif",
              }}
            >
              {isSubmitting ? (
                <><Loader2 size={16} className="animate-spin" />در حال ثبت...</>
              ) : (
                <>ورود به مینی اپ <ChevronLeft size={16} /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "rgba(248,250,252,0.45)" }}>
          اطلاعات شما محرمانه است و فقط برای ارائه مشاوره استفاده می‌شود
        </p>
      </div>
    </div>
  );
}
