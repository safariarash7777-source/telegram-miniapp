import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useTelegram } from "@/contexts/TelegramContext";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Phone, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, Star } from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "در انتظار", icon: Clock, className: "badge-cyan" },
  confirmed: { label: "تأیید شده", icon: CheckCircle, className: "badge-green" },
  completed: { label: "انجام شده", icon: Star, className: "badge-green" },
  cancelled: { label: "لغو شده", icon: XCircle, className: "badge-red" },
};

const TOPIC_LABELS: Record<string, string> = {
  gold: "🥇 طلا",
  stock: "📈 بورس",
  currency: "💱 ارز",
  portfolio: "📊 پرتفوی",
  other: "💬 سایر",
};

export default function Profile() {
  const { registeredUser, telegramUser, twa } = useTelegram();

  useEffect(() => {
    twa.hideBackButton();
  }, []);

  const consultationsQuery = trpc.consultation.myList.useQuery(
    { telegramId: registeredUser?.telegramId ?? "" },
    { enabled: !!registeredUser?.telegramId }
  );

  const consultations = consultationsQuery.data ?? [];

  const stats = {
    total: consultations.length,
    pending: consultations.filter(c => c.status === "pending").length,
    completed: consultations.filter(c => c.status === "completed").length,
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="px-4 pt-5 pb-6 grid-bg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-10 blur-2xl -translate-y-8 -translate-x-8"
          style={{ background: "oklch(0.62 0.22 200)" }} />
        <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl translate-y-4 translate-x-4"
          style={{ background: "oklch(0.62 0.25 330)" }} />

        <div className="flex items-center gap-4 relative z-10">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, oklch(0.62 0.22 200 / 0.3), oklch(0.62 0.25 330 / 0.3))",
              border: "2px solid oklch(0.62 0.22 200 / 0.4)",
            }}>
            {registeredUser?.firstName?.charAt(0) ?? telegramUser?.first_name?.charAt(0) ?? "؟"}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">
              {registeredUser?.name ?? telegramUser?.first_name ?? "کاربر"}
            </h1>
            {telegramUser?.username && (
              <p className="text-sm text-muted-foreground">@{telegramUser.username}</p>
            )}
            <div className="flex items-center gap-1 mt-1">
              <span className="badge-cyan text-[10px]">
                {telegramUser?.is_premium ? "⭐ پریمیوم" : "کاربر تلگرام"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* User Info */}
        <div className="fin-card space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <User size={14} className="text-primary" />
            اطلاعات حساب
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-xs text-muted-foreground">نام کامل</span>
              <span className="text-sm font-medium">{registeredUser?.name ?? "---"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-xs text-muted-foreground">شماره تلفن</span>
              <span className="text-sm font-medium" dir="ltr">{registeredUser?.phone ?? "---"}</span>
            </div>
            {telegramUser?.username && (
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-xs text-muted-foreground">نام کاربری تلگرام</span>
                <span className="text-sm font-medium" dir="ltr">@{telegramUser.username}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-muted-foreground">شناسه تلگرام</span>
              <span className="text-sm font-medium text-muted-foreground" dir="ltr">
                {telegramUser?.id ?? registeredUser?.telegramId ?? "---"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="fin-card text-center py-3">
            <p className="text-xl font-bold text-primary">{new Intl.NumberFormat("fa-IR").format(stats.total)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">کل مشاوره</p>
          </div>
          <div className="fin-card text-center py-3">
            <p className="text-xl font-bold" style={{ color: "oklch(0.65 0.20 150)" }}>
              {new Intl.NumberFormat("fa-IR").format(stats.completed)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">انجام شده</p>
          </div>
          <div className="fin-card text-center py-3">
            <p className="text-xl font-bold text-accent">
              {new Intl.NumberFormat("fa-IR").format(stats.pending)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">در انتظار</p>
          </div>
        </div>

        {/* Consultation History */}
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <MessageSquare size={14} className="text-accent" />
            تاریخچه مشاوره‌ها
          </h2>

          {consultationsQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : consultations.length === 0 ? (
            <div className="fin-card text-center py-8">
              <MessageSquare size={28} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">هنوز درخواست مشاوره‌ای ثبت نکرده‌اید</p>
              <button
                className="text-xs text-primary hover:underline mt-2"
                onClick={() => window.location.href = "/consultation"}
              >
                اولین مشاوره را ثبت کنید ←
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {consultations.map(c => {
                const status = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
                const StatusIcon = status.icon;
                return (
                  <div key={c.id} className="fin-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-medium">
                            {TOPIC_LABELS[c.topic] ?? c.topic}
                          </span>
                          <span className={status.className + " flex items-center gap-1"}>
                            <StatusIcon size={9} />
                            {status.label}
                          </span>
                        </div>
                        {c.message && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{c.message}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                          {c.preferredDate && <span>📅 {c.preferredDate}</span>}
                          {c.preferredTime && <span>⏰ {c.preferredTime}</span>}
                          <span>{new Date(c.createdAt).toLocaleDateString("fa-IR")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* About Advisor */}
        <div className="fin-card geo-accent">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Star size={14} className="text-accent" />
            درباره آرش صفری
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            آرش صفری تحلیلگر و مشاور سرمایه‌گذاری با تخصص در بازارهای مالی ایران است.
            با بیش از یک دهه تجربه در تحلیل بازار بورس، طلا و ارز، راهنمای سرمایه‌گذاران
            برای دستیابی به اهداف مالی‌شان است.
          </p>
          <div className="flex gap-2 mt-3">
            <span className="badge-cyan">بورس ایران</span>
            <span className="badge-pink">طلا و ارز</span>
            <span className="badge-green">پرتفوی</span>
          </div>
        </div>
      </div>
    </div>
  );
}
