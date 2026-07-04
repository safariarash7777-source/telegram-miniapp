import { TrendingUp, Shield, BarChart3, ChevronLeft } from "lucide-react";

/**
 * TelegramLogin — صفحه‌ای که فقط وقتی هیچ هویت تلگرامی موجود نباشد نمایش داده می‌شود.
 * در محیط واقعی تلگرام، این صفحه هرگز نشان داده نمی‌شود.
 * در dev mode با mock user، مستقیم به داشبورد می‌رود.
 */
export default function TelegramLogin() {
  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: "linear-gradient(180deg, var(--navy-deep) 0%, var(--bg) 60%)" }}
      dir="rtl"
    >
      {/* Subtle grid */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />

      {/* Header */}
      <header
        className="relative z-10 flex items-center justify-between px-5 pt-8 pb-4"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(212,162,43,0.15)", border: "1px solid rgba(212,162,43,0.3)" }}
          >
            <TrendingUp size={20} style={{ color: "var(--gold-soft)" }} />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: "var(--gold-soft)" }}>آرش صفری</p>
            <p className="text-[10px]" style={{ color: "rgba(248,250,252,0.5)" }}>مشاور سرمایه‌گذاری</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm">
          {/* Eyebrow */}
          <p className="eyebrow text-center mb-3">مینی اپ تلگرام</p>

          {/* Title */}
          <h1
            className="text-3xl font-black text-center mb-3 leading-snug"
            style={{ color: "var(--text-on-navy)" }}
          >
            مشاوره سرمایه‌گذاری
            <br />
            <span style={{ color: "var(--gold-soft)" }}>حرفه‌ای</span>
          </h1>

          <p className="text-center text-sm mb-8" style={{ color: "rgba(248,250,252,0.65)" }}>
            برای دسترسی به این سرویس، لطفاً از طریق تلگرام وارد شوید
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: TrendingUp, label: "قیمت زنده", sub: "طلا، ارز، بورس" },
              { icon: BarChart3, label: "تحلیل بازار", sub: "به‌روز روزانه" },
              { icon: Shield, label: "مشاوره امن", sub: "کاملاً خصوصی" },
            ].map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="rounded-xl p-3 text-center"
                style={{
                  background: "rgba(19,28,48,0.8)",
                  border: "1px solid var(--line)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
                  style={{ background: "rgba(212,162,43,0.1)", border: "1px solid rgba(212,162,43,0.2)" }}
                >
                  <Icon size={16} style={{ color: "var(--gold-soft)" }} />
                </div>
                <p className="text-xs font-bold mb-0.5" style={{ color: "var(--text)" }}>{label}</p>
                <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Info card */}
          <div
            className="rounded-2xl p-5 text-center"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(30,58,138,0.2)", border: "1px solid rgba(30,58,138,0.3)" }}
            >
              <TrendingUp size={24} style={{ color: "#93C5FD" }} />
            </div>
            <h2 className="text-base font-bold mb-2" style={{ color: "var(--text)" }}>
              ورود از طریق تلگرام
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-3)" }}>
              این اپ فقط از داخل تلگرام قابل استفاده است.
              لطفاً از طریق بات تلگرام وارد شوید.
            </p>
            <div
              className="flex items-center justify-center gap-2 rounded-xl py-3 px-4"
              style={{
                background: "rgba(30,58,138,0.15)",
                border: "1px solid rgba(30,58,138,0.3)",
              }}
            >
              <span className="text-sm font-bold" style={{ color: "#93C5FD" }}>
                @ArashSafariBot
              </span>
              <ChevronLeft size={14} style={{ color: "#93C5FD" }} />
            </div>
          </div>

          <p className="text-center text-xs mt-5" style={{ color: "rgba(248,250,252,0.4)" }}>
            اطلاعات شما محرمانه است و فقط برای ارائه مشاوره استفاده می‌شود
          </p>
        </div>
      </main>
    </div>
  );
}
