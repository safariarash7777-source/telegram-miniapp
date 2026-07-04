import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useTelegram } from "@/contexts/TelegramContext";
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, Coins, DollarSign, Euro, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(price));
}

function formatChange(change: number): string {
  const abs = Math.abs(change);
  return new Intl.NumberFormat("fa-IR").format(Math.round(abs));
}

interface PriceCardProps {
  label: string;
  unit: string;
  price: number;
  change: number;
  changePercent: number;
  icon: React.ReactNode;
  accentColor: string;
}

function PriceCard({ label, unit, price, change, changePercent, icon, accentColor }: PriceCardProps) {
  const isUp = change >= 0;
  return (
    <div className="fin-card geo-accent relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10 -translate-y-4 translate-x-4"
        style={{ background: accentColor }} />
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}30` }}>
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground/60">{unit}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isUp ? "badge-green" : "badge-red"}`}>
          {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {changePercent.toFixed(2)}٪
        </div>
      </div>
      <p className="text-xl font-bold" style={{ color: accentColor, direction: "ltr", textAlign: "left" }}>
        {formatPrice(price)}
      </p>
      <p className="text-xs text-muted-foreground mt-1" dir="rtl">
        <span className={isUp ? "metric-up" : "metric-down"}>
          {isUp ? "+" : "-"}{formatChange(change)} تومان
        </span>
      </p>
    </div>
  );
}

function PriceCardSkeleton() {
  return (
    <div className="fin-card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="w-16 h-3" />
            <Skeleton className="w-10 h-2" />
          </div>
        </div>
        <Skeleton className="w-14 h-5 rounded-full" />
      </div>
      <Skeleton className="w-32 h-7 mb-1" />
      <Skeleton className="w-20 h-3" />
    </div>
  );
}

export default function Dashboard() {
  const { registeredUser, twa } = useTelegram();
  const pricesQuery = trpc.prices.getLive.useQuery(undefined, {
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const analysesQuery = trpc.analysis.list.useQuery({ category: undefined }, {
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    twa.hideBackButton();
  }, []);

  const prices = pricesQuery.data;
  const analyses = analysesQuery.data ?? [];
  const latestAnalyses = analyses.slice(0, 3);

  const categoryLabels: Record<string, string> = {
    gold: "طلا", stock: "بورس", currency: "ارز", economy: "اقتصاد", tech: "فناوری", other: "سایر",
  };

  const categoryColors: Record<string, string> = {
    gold: "badge-cyan", stock: "badge-green", currency: "badge-pink",
    economy: "badge-cyan", tech: "badge-pink", other: "badge-cyan",
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 grid-bg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">خوش آمدید</p>
            <h1 className="text-lg font-bold text-foreground">
              {registeredUser?.name ?? "کاربر عزیز"} 👋
            </h1>
          </div>
          <div className="text-left">
            <p className="text-[10px] text-muted-foreground">آخرین به‌روزرسانی</p>
            <p className="text-xs text-primary font-medium">
              {prices ? new Date(prices.updatedAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }) : "---"}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Live Prices */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-primary" />
              قیمت‌های زنده بازار
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pricesQuery.refetch()}
              disabled={pricesQuery.isFetching}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
            >
              <RefreshCw size={12} className={`ml-1 ${pricesQuery.isFetching ? "animate-spin" : ""}`} />
              به‌روزرسانی
            </Button>
          </div>

          {pricesQuery.isError && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-3">
              <AlertCircle size={14} />
              <span>خطا در دریافت قیمت‌ها. داده‌های آخرین بار نمایش داده می‌شود.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {pricesQuery.isLoading ? (
              <>
                <PriceCardSkeleton />
                <PriceCardSkeleton />
                <PriceCardSkeleton />
                <PriceCardSkeleton />
              </>
            ) : prices ? (
              <>
                <PriceCard
                  label="طلای ۱۸ عیار"
                  unit="تومان / گرم"
                  price={prices.gold.price}
                  change={prices.gold.change}
                  changePercent={prices.gold.changePercent}
                  icon={<Coins size={16} style={{ color: "#f59e0b" }} />}
                  accentColor="#f59e0b"
                />
                <PriceCard
                  label="دلار آمریکا"
                  unit="تومان"
                  price={prices.usd.price}
                  change={prices.usd.change}
                  changePercent={prices.usd.changePercent}
                  icon={<DollarSign size={16} style={{ color: "oklch(0.62 0.22 200)" }} />}
                  accentColor="oklch(0.62 0.22 200)"
                />
                <PriceCard
                  label="یورو"
                  unit="تومان"
                  price={prices.eur.price}
                  change={prices.eur.change}
                  changePercent={prices.eur.changePercent}
                  icon={<Euro size={16} style={{ color: "oklch(0.62 0.25 330)" }} />}
                  accentColor="oklch(0.62 0.25 330)"
                />
                <PriceCard
                  label="شاخص کل بورس"
                  unit="واحد"
                  price={prices.bourse.price}
                  change={prices.bourse.change}
                  changePercent={prices.bourse.changePercent}
                  icon={<BarChart2 size={16} style={{ color: "oklch(0.65 0.20 150)" }} />}
                  accentColor="oklch(0.65 0.20 150)"
                />
              </>
            ) : null}
          </div>
        </section>

        {/* Latest Analyses */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-accent" />
              آخرین تحلیل‌ها
            </h2>
          </div>

          <div className="space-y-2">
            {analysesQuery.isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="fin-card flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="w-full h-3" />
                    <Skeleton className="w-2/3 h-2" />
                  </div>
                </div>
              ))
            ) : latestAnalyses.map(analysis => (
              <div key={analysis.id} className="fin-card flex items-start gap-3 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => window.location.href = `/analysis?id=${analysis.id}`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "oklch(0.62 0.25 330 / 0.15)", border: "1px solid oklch(0.62 0.25 330 / 0.2)" }}>
                  <BarChart2 size={18} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-1">{analysis.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{analysis.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={categoryColors[analysis.category] ?? "badge-cyan"}>
                      {categoryLabels[analysis.category] ?? analysis.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(analysis.publishedAt).toLocaleDateString("fa-IR")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="fin-card geo-accent text-center py-5">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: "oklch(0.62 0.25 330 / 0.15)", border: "1px solid oklch(0.62 0.25 330 / 0.3)" }}>
            <TrendingUp size={22} className="text-accent" />
          </div>
          <h3 className="text-sm font-semibold mb-1">مشاوره تخصصی سرمایه‌گذاری</h3>
          <p className="text-xs text-muted-foreground mb-3">
            با آرش صفری مشاوره بگیرید و سبد سرمایه‌گذاری بهینه بسازید
          </p>
          <Button
            size="sm"
            className="text-xs"
            style={{ background: "linear-gradient(135deg, oklch(0.62 0.25 330), oklch(0.55 0.25 330))" }}
            onClick={() => window.location.href = "/consultation"}
          >
            درخواست مشاوره
          </Button>
        </div>
      </div>
    </div>
  );
}
