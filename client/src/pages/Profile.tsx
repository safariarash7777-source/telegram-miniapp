import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useTelegram } from "@/contexts/TelegramContext";
import { User, Phone, MessageSquare, Clock, CheckCircle, XCircle, Star } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "در انتظار",   color: "#FCD34D", bg: "rgba(252,211,77,0.1)" },
  confirmed: { label: "تأیید شده",   color: "#4ADE80", bg: "rgba(74,222,128,0.1)" },
  completed: { label: "انجام شده",   color: "#4ADE80", bg: "rgba(74,222,128,0.1)" },
  cancelled: { label: "لغو شده",     color: "#F87171", bg: "rgba(248,113,113,0.1)" },
};

const TOPIC_LABELS: Record<string, string> = {
  gold: "طلا و سکه",
  stock: "بورس و سهام",
  currency: "ارز و دلار",
  portfolio: "مدیریت سبد",
  other: "سایر موارد",
};

export default function Profile() {
  const { registeredUser, telegramUser, twa } = useTelegram();

  useEffect(() => {
    twa.hideBackButton();
  }, []);

  const telegramId = telegramUser ? String(telegramUser.id) : registeredUser?.telegramId ?? "";

  const consultationsQuery = trpc.consultation.myList.useQuery(
    { telegramId },
    { enabled: !!telegramId }
  );

  const consultations = consultationsQuery.data ?? [];
  const stats = {
    total: consultations.length,
    pending: consultations.filter((c: any) => c.status === "pending").length,
    completed: consultations.filter((c: any) => c.status === "completed").length,
  };

  const displayName =
    registeredUser?.name ||
    (telegramUser ? `${telegramUser.first_name}${telegramUser.last_name ? " " + telegramUser.last_name : ""}` : "کاربر");

  const initials = displayName.trim().charAt(0) || "؟";

  return (
    <div className="page-content" dir="rtl">
      {/* ─── Header ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 px-4 py-3"
        style={{
          background: "rgba(11,18,32,0.96)",
          borderBottom: "1px solid var(--line)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <h1 className="text-sm font-black" style={{ color: "var(--text)" }}>پروفایل</h1>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* ─── Avatar card ──────────────────────────────────── */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-deep) 100%)",
            border: "1px solid rgba(212,162,43,0.2)",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative z-10 flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(212,162,43,0.3), rgba(212,162,43,0.1))",
                border: "2px solid rgba(212,162,43,0.4)",
                color: "var(--gold-soft)",
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-black truncate" style={{ color: "var(--text-on-navy)" }}>
                {displayName}
              </h2>
              {telegramUser?.username && (
                <p className="text-xs mt-0.5" style={{ color: "rgba(248,250,252,0.6)" }}>
                  @{telegramUser.username}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {telegramUser?.is_premium && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(212,162,43,0.15)",
                      border: "1px solid rgba(212,162,43,0.3)",
                      color: "var(--gold-soft)",
                    }}
                  >
                    ⭐ پریمیوم
                  </span>
                )}
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(147,197,253,0.1)",
                    border: "1px solid rgba(147,197,253,0.2)",
                    color: "#93C5FD",
                  }}
                >
                  کاربر تلگرام
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Info card ────────────────────────────────────── */}
        <div className="card-elevated p-4 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
            اطلاعات حساب
          </h3>
          {[
            { icon: User, label: "نام", value: displayName },
            { icon: Phone, label: "شماره تماس", value: registeredUser?.phone ?? "ثبت نشده" },
            { icon: MessageSquare, label: "شناسه تلگرام", value: telegramUser ? `#${telegramUser.id}` : "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--line)" }}>
              <div className="flex items-center gap-2">
                <Icon size={14} style={{ color: "var(--text-3)" }} />
                <span className="text-xs" style={{ color: "var(--text-3)" }}>{label}</span>
              </div>
              <span className="text-xs font-bold" style={{ color: "var(--text)" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* ─── Stats ────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "کل مشاوره‌ها", value: stats.total, color: "#93C5FD" },
            { label: "در انتظار", value: stats.pending, color: "#FCD34D" },
            { label: "انجام شده", value: stats.completed, color: "#4ADE80" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card-elevated p-3 text-center">
              <p className="text-2xl font-black mb-1" style={{ color }}>{value}</p>
              <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ─── Consultation history ─────────────────────────── */}
        <div>
          <h3 className="text-sm font-black mb-3" style={{ color: "var(--text)" }}>تاریخچه مشاوره‌ها</h3>

          {!telegramId ? (
            <div className="card-elevated p-6 text-center">
              <p className="text-sm" style={{ color: "var(--text-3)" }}>
                برای مشاهده تاریخچه، ابتدا وارد شوید
              </p>
            </div>
          ) : consultationsQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
            </div>
          ) : consultations.length > 0 ? (
            <div className="space-y-2">
              {consultations.map((c: any) => {
                const status = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
                return (
                  <div key={c.id} className="card-elevated p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                        {TOPIC_LABELS[c.topic] ?? c.topic}
                      </p>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: status.bg, color: status.color, border: `1px solid ${status.color}30` }}
                      >
                        {status.label}
                      </span>
                    </div>
                    {c.message && (
                      <p className="text-xs line-clamp-2 mb-2" style={{ color: "var(--text-3)" }}>{c.message}</p>
                    )}
                    <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
                      {new Date(c.createdAt).toLocaleDateString("fa-IR", {
                        year: "numeric", month: "long", day: "numeric"
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card-elevated p-6 text-center">
              <MessageSquare size={28} className="mx-auto mb-2" style={{ color: "var(--text-3)" }} />
              <p className="text-sm font-bold mb-1" style={{ color: "var(--text-2)" }}>
                هنوز مشاوره‌ای ندارید
              </p>
              <p className="text-xs" style={{ color: "var(--text-3)" }}>
                اولین درخواست مشاوره خود را ثبت کنید
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
