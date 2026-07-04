import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTelegram } from "@/contexts/TelegramContext";
import {
  TrendingUp, TrendingDown, RefreshCw, AlertCircle,
  BarChart3, MessageSquare, ChevronLeft, Coins, DollarSign,
  Activity,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface PriceItem {
  price: number;
  change: number;
  changePercent: number;
  isUp: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number | undefined, decimals = 0): string {
  if (n === undefined || n === null || isNaN(n)) return "—";
  return n.toLocaleString("fa-IR", { maximumFractionDigits: decimals });
}

function fmtChange(item: PriceItem | undefined): string {
  if (!item) return "";
  const abs = Math.abs(item.change);
  return `${item.isUp ? "+" : "-"}${abs.toLocaleString("fa-IR")}`;
}

// ── PriceCard ────────────────────────────────────────────────────────────────
function PriceCard({
  label, value, unit, item, isLoading, accentColor, note,
}: {
  label: string;
  value: string;
  unit: string;
  item?: PriceItem;
  isLoading?: boolean;
  accentColor?: string;
  note?: string;
}) {
  const isUp = item?.isUp ?? true;
  return (
    <div className="card-elevated p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-bold" style={{ color: "var(--text-3)" }}>{label}</p>
        {item && !isLoading && (
          <span className={item.isUp ? "badge-green" : "badge-red"}>
            {item.isUp ? "+" : ""}{item.changePercent.toFixed(2)}٪
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
          {item && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${isUp ? "metric-up" : "metric-down"}`}>
              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span style={{ direction: "ltr" }}>{fmtChange(item)}</span>
            </div>
          )}
          {note && (
            <p className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>{note}</p>
          )}
        </>
      )}
    </div>
  );
}

// ── BubbleCard ───────────────────────────────────────────────────────────────
function BubbleCard({
  label, coinPrice, intrinsicPrice, isLoading,
}: {
  label: string;
  coinPrice?: number;
  intrinsicPrice?: number;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="card-elevated p-4">
        <div className="skeleton h-5 w-24 rounded mb-2" />
        <div className="skeleton h-7 w-32 rounded mb-2" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    );
  }

  if (!coinPrice || !intrinsicPrice) {
    return (
      <div className="card-elevated p-4">
        <p className="text-xs font-bold mb-2" style={{ color: "var(--text-3)" }}>{label}</p>
        <p className="text-sm" style={{ color: "var(--text-3)" }}>در حال محاسبه...</p>
      </div>
    );
  }

  const bubbleAmount = coinPrice - intrinsicPrice;
  const bubblePct = ((bubbleAmount / intrinsicPrice) * 100);
  const isPositive = bubbleAmount > 0;

  return (
    <div className="card-elevated p-4">
      <p className="text-xs font-bold mb-2" style={{ color: "var(--text-3)" }}>{label}</p>
      <p
        className="text-lg font-black tabular-nums mb-1"
        style={{ color: isPositive ? "#F87171" : "#4ADE80", direction: "ltr", textAlign: "left" }}
      >
        {isPositive ? "+" : ""}{fmt(bubblePct, 1)}٪
      </p>
      <p className="text-[11px] mb-1" style={{ color: "var(--text-3)" }}>
        حباب: {isPositive ? "+" : ""}{fmt(Math.abs(bubbleAmount))} ریال
      </p>
      <div className="flex gap-2 text-[10px]" style={{ color: "var(--text-3)" }}>
        <span>بازار: {fmt(coinPrice)}</span>
        <span>•</span>
        <span>ذاتی: {fmt(intrinsicPrice)}</span>
      </div>
    </div>
  );
}

// ── Tab types ─────────────────────────────────────────────────────────────────
type Tab = "gold" | "coin" | "currency" | "bubble";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "gold", label: "طلا", icon: <TrendingUp size={14} /> },
  { id: "coin", label: "سکه", icon: <Coins size={14} /> },
  { id: "currency", label: "ارز", icon: <DollarSign size={14} /> },
  { id: "bubble", label: "حباب", icon: <Activity size={14} /> },
];

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [, navigate] = useLocation();
  const { registeredUser, telegramUser, twa } = useTelegram();
  const [activeTab, setActiveTab] = useState<Tab>("gold");

  useEffect(() => {
    twa.hideBackButton();
  }, []);

  const pricesQuery = trpc.prices.getLive.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000, // every 5 min (matches server cache)
    staleTime: 4 * 60 * 1000,
  });
  const analysesQuery = trpc.analysis.list.useQuery({ limit: 3 });

  const prices = pricesQuery.data as any;
  const isLoading = pricesQuery.isLoading;

  const displayName =
    registeredUser?.name ||
    (telegramUser ? `${telegramUser.first_name}${telegramUser.last_name ? " " + telegramUser.last_name : ""}` : "کاربر");

  const categoryLabels: Record<string, string> = {
    gold: "طلا", stock: "بورس", currency: "ارز",
    economy: "اقتصاد", tech: "فناوری", other: "سایر",
  };

  // Intrinsic coin price = gold18 price × weight × purity factor (no bubble)
  const gold18Price = prices?.gold18?.price;
  // Intrinsic coin price = gold18 (tomans/gram) × weight × purity factor (no bubble)
  // Emami: 8.133g × (24/18) × gold18_per_gram ≈ gold18 × 10.844
  // Half: 4.068g × (24/18) × gold18_per_gram ≈ gold18 × 5.424
  // Quarter: 2.034g × (24/18) × gold18_per_gram ≈ gold18 × 2.712
  const intrinsicEmami = gold18Price ? Math.round(gold18Price * 10.844) : undefined;
  const intrinsicHalf = gold18Price ? Math.round(gold18Price * 5.424) : undefined;
  const intrinsicQuarter = gold18Price ? Math.round(gold18Price * 2.712) : undefined;

  return (
    <div className="page-content" dir="rtl">
      {/* ─── Header ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(13,31,74,0.97)",
          borderBottom: "1px solid var(--line)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center">
          <img
            src="/manus-storage/logotype-gold_c20a9ae8.png"
            alt="آرش صفری"
            className="h-8 w-auto object-contain"
            style={{ maxWidth: 140 }}
          />
        </div>
        <div className="flex items-center gap-2">
          {prices?.source && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: prices.source === "live" ? "rgba(74,222,128,0.1)" : "rgba(251,191,36,0.1)",
                color: prices.source === "live" ? "#4ADE80" : "#FBB724",
                border: `1px solid ${prices.source === "live" ? "rgba(74,222,128,0.2)" : "rgba(251,191,36,0.2)"}`,
              }}
            >
              {prices.source === "live" ? "زنده" : prices.source === "cached" ? "کش" : "نمونه"}
            </span>
          )}
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
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* ─── Welcome ──────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-deep) 100%)",
            border: "1px solid rgba(212,162,43,0.2)",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.04]"
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
              {prices?.updatedAt
                ? `آخرین بروزرسانی: ${new Date(prices.updatedAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}`
                : "بازار امروز را بررسی کنید"}
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

        {/* ─── Market Tabs ──────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black" style={{ color: "var(--text)" }}>قیمت‌های بازار</h3>
          </div>

          {/* Tab buttons */}
          <div
            className="flex gap-1 p-1 rounded-xl mb-4"
            style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: activeTab === tab.id ? "var(--gold-soft)" : "transparent",
                  color: activeTab === tab.id ? "var(--navy-deep)" : "var(--text-3)",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Gold Tab ── */}
          {activeTab === "gold" && (
            <div className="grid grid-cols-2 gap-3">
              <PriceCard
                label="طلای ۱۸ عیار"
                value={fmt(prices?.gold18?.price)}
                unit="تومان / گرم"
                item={prices?.gold18}
                isLoading={isLoading}
                accentColor="var(--gold-soft)"
                note={prices?.gold18?.source ? `منبع: ${prices.gold18.source}` : undefined}
              />
              <PriceCard
                label="اونس جهانی"
                value={prices?.goldOunce?.price ? prices.goldOunce.price.toFixed(2) : "—"}
                unit="دلار / اونس"
                item={prices?.goldOunce}
                isLoading={isLoading}
                accentColor="#FBB724"
              />
              <div className="col-span-2 card-elevated p-4">
                <p className="text-xs font-bold mb-2" style={{ color: "var(--text-3)" }}>
                  نرخ تبدیل طلا
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "۱۸ عیار", val: prices?.gold18?.price, unit: "تومان/گرم" },
                    { label: "۲۴ عیار", val: prices?.gold18?.price ? Math.round(prices.gold18.price * 24 / 18) : undefined, unit: "تومان/گرم" },
                    { label: "مثقال", val: prices?.gold18?.price ? Math.round(prices.gold18.price * 4.608) : undefined, unit: "تومان" },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-[10px] mb-1" style={{ color: "var(--text-3)" }}>{item.label}</p>
                      {isLoading ? (
                        <div className="skeleton h-5 w-16 rounded mx-auto" />
                      ) : (
                        <p className="text-sm font-black" style={{ color: "var(--gold-soft)", direction: "ltr" }}>
                          {fmt(item.val)}
                        </p>
                      )}
                      <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{item.unit}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Coin Tab ── */}
          {activeTab === "coin" && (
            <div className="grid grid-cols-2 gap-3">
              <PriceCard
                label="سکه امامی"
                value={fmt(prices?.coinEmami?.price)}
                unit="تومان"
                item={prices?.coinEmami}
                isLoading={isLoading}
                accentColor="var(--gold-soft)"
              />
              <PriceCard
                label="نیم‌سکه"
                value={fmt(prices?.coinHalf?.price)}
                unit="تومان"
                item={prices?.coinHalf}
                isLoading={isLoading}
                accentColor="#FBB724"
              />
              <PriceCard
                label="ربع‌سکه"
                value={fmt(prices?.coinQuarter?.price)}
                unit="تومان"
                item={prices?.coinQuarter}
                isLoading={isLoading}
                accentColor="#F59E0B"
              />
              <PriceCard
                label="تمام پهلوی"
                value={fmt((prices as any)?.coinPahlavi?.price)}
                unit="تومان"
                item={(prices as any)?.coinPahlavi}
                isLoading={isLoading}
                accentColor="#FBBF24"
              />
              <div className="card-elevated p-4 flex flex-col justify-center">
                <p className="text-xs font-bold mb-1" style={{ color: "var(--text-3)" }}>آبشده نقد</p>
                {isLoading ? (
                  <div className="skeleton h-5 w-20 rounded" />
                ) : (
                  <p className="text-sm font-black tabular-nums" style={{ color: "var(--gold-soft)", direction: "ltr" }}>
                    {fmt((prices as any)?.abshode?.price)}
                  </p>
                )}
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>تومان</p>
              </div>
            </div>
          )}

          {/* ── Currency Tab ── */}
          {activeTab === "currency" && (
            <div className="grid grid-cols-2 gap-3">
              <PriceCard
                label="دلار آمریکا"
                value={fmt(prices?.usd?.price)}
                unit="تومان"
                item={prices?.usd}
                isLoading={isLoading}
                accentColor="#93C5FD"
              />
              <PriceCard
                label="یورو"
                value={fmt(prices?.eur?.price)}
                unit="تومان"
                item={prices?.eur}
                isLoading={isLoading}
                accentColor="#A5B4FC"
              />
              <div className="col-span-2 card-elevated p-4">
                <p className="text-xs font-bold mb-3" style={{ color: "var(--text-3)" }}>
                  نرخ برابری ارزها (تقریبی)
                </p>
                <div className="space-y-2">
                  {[
                    { from: "USD", to: "EUR", rate: prices?.usd?.price && prices?.eur?.price ? (prices.eur.price / prices.usd.price).toFixed(4) : "—" },
                    { from: "EUR", to: "USD", rate: prices?.usd?.price && prices?.eur?.price ? (prices.usd.price / prices.eur.price).toFixed(4) : "—" },
                  ].map(r => (
                    <div key={r.from + r.to} className="flex items-center justify-between text-xs">
                      <span style={{ color: "var(--text-3)" }}>۱ {r.from}</span>
                      <span style={{ color: "var(--text-2)" }}>≈</span>
                      <span className="font-bold" style={{ color: "var(--text)", direction: "ltr" }}>
                        {r.rate} {r.to}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Bubble Tab ── */}
          {activeTab === "bubble" && (
            <div className="space-y-3">
              <div
                className="rounded-xl p-3 text-xs"
                style={{
                  background: "rgba(212,162,43,0.06)",
                  border: "1px solid rgba(212,162,43,0.15)",
                  color: "var(--text-3)",
                }}
              >
                <p className="font-bold mb-1" style={{ color: "var(--gold-soft)" }}>حباب سکه چیست؟</p>
                <p>اختلاف قیمت بازار سکه با ارزش ذاتی آن (بر اساس قیمت طلا). حباب مثبت یعنی سکه گران‌تر از ارزش واقعی معامله می‌شود.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <BubbleCard
                  label="حباب سکه امامی"
                  coinPrice={prices?.coinEmami?.price}
                  intrinsicPrice={intrinsicEmami}
                  isLoading={isLoading}
                />
                <BubbleCard
                  label="حباب نیم‌سکه"
                  coinPrice={prices?.coinHalf?.price}
                  intrinsicPrice={intrinsicHalf}
                  isLoading={isLoading}
                />
                <BubbleCard
                  label="حباب ربع‌سکه"
                  coinPrice={prices?.coinQuarter?.price}
                  intrinsicPrice={intrinsicQuarter}
                  isLoading={isLoading}
                />
                <div
                  className="rounded-xl p-3 text-xs mt-1"
                  style={{
                    background: "rgba(212,162,43,0.04)",
                    border: "1px solid rgba(212,162,43,0.1)",
                    color: "var(--text-3)",
                  }}
                >
                  <p>ارزش ذاتی بر اساس قیمت طلای ۱۸ عیار و وزن استاندارد سکه محاسبه می‌شود.</p>
                  <p className="mt-1">منبع قیمت: کانال تلگرام @tala_hajiabdollahi</p>
                </div>
              </div>
            </div>
          )}
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
        <section className="pb-2">
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
