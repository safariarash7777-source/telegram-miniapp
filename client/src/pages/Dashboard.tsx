import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTelegram } from "@/contexts/TelegramContext";
import {
  TrendingUp, TrendingDown, RefreshCw, AlertCircle,
  BarChart3, MessageSquare, ChevronLeft,
} from "lucide-react";

function PriceCard({
  label, value, unit, change, changePct, isLoading, accentColor,
}: {
  label: string; value: string; unit: string;
  change?: string; changePct?: string;
  isLoading?: boolean; accentColor?: string;
}) {
  const isUp = change ? !change.startsWith("-") : true;
  return (
    <div className="card-elevated p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold" style={{ color: "var(--text-3)" }}>{label}</p>
        {changePct && !isLoading && (
          <span className={isUp ? "badge-green" : "badge-red"}>
            {isUp ? "+" : ""}{changePct}٪
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <div className="skeleton h-7 w-28 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      ) : (
        <>
          <p
            className="text-xl font-black mb-1 tabular-nums"
            style={{ color: accentColor ?? "var(--text)", direction: "ltr", textAlign: "left" }}
          >
            {value}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{unit}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${isUp ? "metric-up" : "metric-down"}`}>
              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span style={{ direction: "ltr" }}>{change}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { registeredUser, telegramUser, twa } = useTelegram();

  useEffect(() => {
    twa.hideBackButton();
  }, []);

  const pricesQuery = trpc.prices.getLive.useQuery(undefined, {
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const analysesQuery = trpc.analysis.list.useQuery({ limit: 3 });

  const prices = pricesQuery.data;
  const isPriceLoading = pricesQuery.isLoading;

  const displayName =
    registeredUser?.name ||
    (telegramUser ? `${telegramUser.first_name}${telegramUser.last_name ? " " + telegramUser.last_name : ""}` : "کاربر");

  const categoryLabels: Record<string, string> = {
    gold: "طلا", stock: "بورس", currency: "ارز",
    economy: "اقتصاد", tech: "فناوری", other: "سایر",
  };

  return (
    <div className="page-content" dir="rtl">
      {/* ─── Header ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(11,18,32,0.96)",
          borderBottom: "1px solid var(--line)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(212,162,43,0.12)", border: "1px solid rgba(212,162,43,0.25)" }}
          >
            <TrendingUp size={16} style={{ color: "var(--gold-soft)" }} />
          </div>
          <div>
            <p className="text-xs font-black" style={{ color: "var(--text)" }}>آرش صفری</p>
            <p className="text-[10px]" style={{ color: "var(--text-3)" }}>مشاور سرمایه‌گذاری</p>
          </div>
        </div>
        <button
          onClick={() => pricesQuery.refetch()}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
          aria-label="بروزرسانی"
        >
          <RefreshCw
            size={14}
            style={{ color: "var(--text-3)" }}
            className={pricesQuery.isFetching ? "animate-spin" : ""}
          />
        </button>
      </header>

      <div className="px-4 pt-4 space-y-5">
        {/* ─── Welcome banner ───────────────────────────────── */}
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
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
          <div className="relative z-10">
            <p className="eyebrow mb-1">خوش آمدید</p>
            <h2 className="text-lg font-black mb-0.5" style={{ color: "var(--text-on-navy)" }}>
              {displayName} عزیز
            </h2>
            <p className="text-xs" style={{ color: "rgba(248,250,252,0.65)" }}>
              بازار امروز را بررسی کنید
            </p>
          </div>
        </div>

        {/* ─── Price error ──────────────────────────────────── */}
        {pricesQuery.isError && (
          <div
            className="flex items-center gap-2 text-xs rounded-xl p-3"
            style={{
              background: "rgba(185,28,28,0.1)",
              border: "1px solid rgba(185,28,28,0.25)",
              color: "#F87171",
            }}
          >
            <AlertCircle size={14} />
            <span>خطا در دریافت قیمت‌ها. داده‌های قبلی نمایش داده می‌شود.</span>
          </div>
        )}

        {/* ─── Price grid ───────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black" style={{ color: "var(--text)" }}>قیمت‌های بازار</h3>

          </div>
          <div className="grid grid-cols-2 gap-3">
            <PriceCard
              label="طلای ۱۸ عیار"
              value={prices?.gold?.price ? Number(prices.gold.price).toLocaleString("fa-IR") : "—"}
              unit="تومان / گرم"
              change={prices?.gold?.change ? `${prices.gold.change > 0 ? "+" : ""}${Number(prices.gold.change).toLocaleString("fa-IR")}` : undefined}
              changePct={prices?.gold?.changePercent?.toFixed(2)}
              isLoading={isPriceLoading}
              accentColor="var(--gold-soft)"
            />
            <PriceCard
              label="دلار آمریکا"
              value={prices?.usd?.price ? Number(prices.usd.price).toLocaleString("fa-IR") : "—"}
              unit="تومان"
              change={prices?.usd?.change ? `${prices.usd.change > 0 ? "+" : ""}${Number(prices.usd.change).toLocaleString("fa-IR")}` : undefined}
              changePct={prices?.usd?.changePercent?.toFixed(2)}
              isLoading={isPriceLoading}
              accentColor="#93C5FD"
            />
            <PriceCard
              label="یورو"
              value={prices?.eur?.price ? Number(prices.eur.price).toLocaleString("fa-IR") : "—"}
              unit="تومان"
              change={prices?.eur?.change ? `${prices.eur.change > 0 ? "+" : ""}${Number(prices.eur.change).toLocaleString("fa-IR")}` : undefined}
              changePct={prices?.eur?.changePercent?.toFixed(2)}
              isLoading={isPriceLoading}
              accentColor="#A5B4FC"
            />
            <PriceCard
              label="شاخص کل بورس"
              value={prices?.bourse?.price ? Number(prices.bourse.price).toLocaleString("fa-IR") : "—"}
              unit="واحد"
              change={prices?.bourse?.change ? `${prices.bourse.change > 0 ? "+" : ""}${Number(prices.bourse.change).toLocaleString("fa-IR")}` : undefined}
              changePct={prices?.bourse?.changePercent?.toFixed(2)}
              isLoading={isPriceLoading}
              accentColor="#4ADE80"
            />
          </div>
        </section>

        {/* ─── Latest analyses ──────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black" style={{ color: "var(--text)" }}>آخرین تحلیل‌ها</h3>
            <button
              onClick={() => navigate("/analysis")}
              className="flex items-center gap-1 text-xs font-bold"
              style={{ color: "var(--gold-soft)" }}
            >
              همه <ChevronLeft size={14} />
            </button>
          </div>

          {analysesQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
            </div>
          ) : analysesQuery.data && analysesQuery.data.length > 0 ? (
            <div className="space-y-2">
              {analysesQuery.data.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/analysis/${item.id}`)}
                  className="w-full card-elevated p-3.5 text-right flex items-center gap-3 transition-all active:scale-[0.98]"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(30,58,138,0.2)", border: "1px solid rgba(30,58,138,0.3)" }}
                  >
                    <BarChart3 size={16} style={{ color: "#93C5FD" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="badge-navy">
                        {categoryLabels[item.category] ?? item.category}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                        {new Date(item.publishedAt ?? item.createdAt).toLocaleDateString("fa-IR")}
                      </span>
                    </div>
                  </div>
                  <ChevronLeft size={14} style={{ color: "var(--text-3)" }} />
                </button>
              ))}
            </div>
          ) : (
            <div
              className="rounded-xl p-5 text-center"
              style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
            >
              <BarChart3 size={24} className="mx-auto mb-2" style={{ color: "var(--text-3)" }} />
              <p className="text-sm" style={{ color: "var(--text-3)" }}>به زودی تحلیل‌های جدید منتشر می‌شود</p>
            </div>
          )}
        </section>

        {/* ─── Consultation CTA ─────────────────────────────── */}
        <section>
          <button
            onClick={() => navigate("/consultation")}
            className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-deep) 100%)",
              border: "1px solid rgba(212,162,43,0.25)",
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(212,162,43,0.15)", border: "1px solid rgba(212,162,43,0.3)" }}
            >
              <MessageSquare size={20} style={{ color: "var(--gold-soft)" }} />
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm font-black" style={{ color: "var(--text-on-navy)" }}>
                درخواست مشاوره
              </p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(248,250,252,0.6)" }}>
                با آرش صفری مشاوره بگیرید
              </p>
            </div>
            <ChevronLeft size={16} style={{ color: "var(--gold-soft)" }} />
          </button>
        </section>
      </div>
    </div>
  );
}
