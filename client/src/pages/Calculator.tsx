import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useTelegram } from "@/contexts/TelegramContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, Calculator as CalcIcon, TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const ASSET_TYPES = [
  { value: "gold", label: "طلا" },
  { value: "stock", label: "سهام" },
  { value: "currency", label: "ارز" },
  { value: "crypto", label: "رمزارز" },
  { value: "other", label: "سایر" },
] as const;

const CHART_COLORS = ["#06b6d4", "#ec4899", "#22c55e", "#f59e0b", "#8b5cf6"];

function formatNumber(n: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(n));
}

function generateGrowthData(initialValue: number, months: number, annualReturn: number) {
  const monthlyRate = annualReturn / 12 / 100;
  return Array.from({ length: months + 1 }, (_, i) => ({
    month: i === 0 ? "شروع" : `ماه ${new Intl.NumberFormat("fa-IR").format(i)}`,
    value: Math.round(initialValue * Math.pow(1 + monthlyRate, i)),
  }));
}

export default function Calculator() {
  const { registeredUser, twa } = useTelegram();
  const telegramId = registeredUser?.telegramId ?? "";

  const [newAsset, setNewAsset] = useState({
    assetType: "gold" as "gold" | "stock" | "currency" | "crypto" | "other",
    name: "",
    quantity: "",
    buyPrice: "",
    currentPrice: "",
  });

  const [calcInput, setCalcInput] = useState({
    amount: "10000000",
    months: "12",
    annualReturn: "30",
  });

  useEffect(() => {
    twa.hideBackButton();
  }, []);

  const portfolioQuery = trpc.portfolio.getByTelegramId.useQuery(
    { telegramId },
    { enabled: !!telegramId }
  );

  const addAssetMutation = trpc.portfolio.addAsset.useMutation({
    onSuccess: () => {
      portfolioQuery.refetch();
      setNewAsset({ assetType: "gold", name: "", quantity: "", buyPrice: "", currentPrice: "" });
      toast.success("دارایی با موفقیت اضافه شد");
      twa.hapticFeedback("notification");
    },
    onError: () => toast.error("خطا در افزودن دارایی"),
  });

  const deleteAssetMutation = trpc.portfolio.deleteAsset.useMutation({
    onSuccess: () => {
      portfolioQuery.refetch();
      toast.success("دارایی حذف شد");
    },
    onError: () => toast.error("خطا در حذف دارایی"),
  });

  const assets = portfolioQuery.data ?? [];

  const portfolioStats = useMemo(() => {
    if (!assets.length) return null;
    const totalBuy = assets.reduce((sum, a) => sum + parseFloat(a.quantity) * parseFloat(a.buyPrice), 0);
    const totalCurrent = assets.reduce((sum, a) => sum + parseFloat(a.quantity) * parseFloat(a.currentPrice), 0);
    const profitLoss = totalCurrent - totalBuy;
    const profitPercent = totalBuy > 0 ? (profitLoss / totalBuy) * 100 : 0;
    return { totalBuy, totalCurrent, profitLoss, profitPercent };
  }, [assets]);

  const pieData = useMemo(() => {
    if (!assets.length) return [];
    const total = assets.reduce((sum, a) => sum + parseFloat(a.quantity) * parseFloat(a.currentPrice), 0);
    return assets.map(a => ({
      name: a.name,
      value: Math.round((parseFloat(a.quantity) * parseFloat(a.currentPrice) / total) * 100),
    }));
  }, [assets]);

  const growthData = useMemo(() => {
    const amount = parseFloat(calcInput.amount) || 10_000_000;
    const months = parseInt(calcInput.months) || 12;
    const rate = parseFloat(calcInput.annualReturn) || 30;
    return generateGrowthData(amount, Math.min(months, 60), rate);
  }, [calcInput]);

  const finalValue = growthData[growthData.length - 1]?.value ?? 0;
  const initialAmount = parseFloat(calcInput.amount) || 0;
  const profit = finalValue - initialAmount;

  const handleAddAsset = () => {
    if (!newAsset.name || !newAsset.quantity || !newAsset.buyPrice || !newAsset.currentPrice) {
      toast.error("لطفاً تمام فیلدها را پر کنید");
      return;
    }
    addAssetMutation.mutate({ telegramId, ...newAsset });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="fin-card text-xs p-2 border-primary/30">
        <p className="text-muted-foreground mb-1">{payload[0]?.payload?.month}</p>
        <p className="text-primary font-bold">{formatNumber(payload[0]?.value ?? 0)} تومان</p>
      </div>
    );
  };

  return (
    <div className="page-content">
      <div className="px-4 pt-5 pb-4 grid-bg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(0.62 0.22 200 / 0.15)", border: "1px solid oklch(0.62 0.22 200 / 0.3)" }}>
            <CalcIcon size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold">محاسبه‌گر سرمایه‌گذاری</h1>
            <p className="text-xs text-muted-foreground">پرتفوی و شبیه‌سازی رشد</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <Tabs defaultValue="calculator" dir="rtl">
          <TabsList className="w-full mb-4 bg-muted">
            <TabsTrigger value="calculator" className="flex-1 text-xs">محاسبه‌گر رشد</TabsTrigger>
            <TabsTrigger value="portfolio" className="flex-1 text-xs">سبد دارایی</TabsTrigger>
          </TabsList>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-4 mt-0">
            <div className="fin-card space-y-3">
              <h3 className="text-sm font-semibold">پارامترهای سرمایه‌گذاری</h3>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">مبلغ سرمایه‌گذاری (تومان)</Label>
                <Input
                  type="number"
                  value={calcInput.amount}
                  onChange={e => setCalcInput(p => ({ ...p, amount: e.target.value }))}
                  className="bg-muted border-border text-sm"
                  dir="ltr"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">مدت (ماه)</Label>
                  <Input
                    type="number"
                    value={calcInput.months}
                    onChange={e => setCalcInput(p => ({ ...p, months: e.target.value }))}
                    className="bg-muted border-border text-sm"
                    dir="ltr"
                    min="1" max="120"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">بازده سالانه (٪)</Label>
                  <Input
                    type="number"
                    value={calcInput.annualReturn}
                    onChange={e => setCalcInput(p => ({ ...p, annualReturn: e.target.value }))}
                    className="bg-muted border-border text-sm"
                    dir="ltr"
                    min="0" max="500"
                  />
                </div>
              </div>
            </div>

            {/* Result Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="fin-card text-center">
                <p className="text-xs text-muted-foreground mb-1">ارزش نهایی</p>
                <p className="text-base font-bold text-primary" dir="ltr">{formatNumber(finalValue)}</p>
                <p className="text-[10px] text-muted-foreground">تومان</p>
              </div>
              <div className="fin-card text-center">
                <p className="text-xs text-muted-foreground mb-1">سود / زیان</p>
                <p className={`text-base font-bold ${profit >= 0 ? "metric-up" : "metric-down"}`} dir="ltr">
                  {profit >= 0 ? "+" : ""}{formatNumber(profit)}
                </p>
                <p className="text-[10px] text-muted-foreground">تومان</p>
              </div>
            </div>

            {/* Growth Chart */}
            <div className="fin-card">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">نمودار رشد سرمایه</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={growthData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.62 0.22 200)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.62 0.22 200)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.20 0.025 262)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "oklch(0.55 0.01 65)" }}
                    tickLine={false} axisLine={false}
                    interval={Math.floor(growthData.length / 4)} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone" dataKey="value"
                    stroke="oklch(0.62 0.22 200)" strokeWidth={2}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              ⚠️ این محاسبات صرفاً جنبه نمایشی دارند و تضمین بازدهی نیستند
            </p>
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-4 mt-0">
            {/* Summary */}
            {portfolioStats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="fin-card text-center">
                  <p className="text-xs text-muted-foreground mb-1">ارزش فعلی</p>
                  <p className="text-sm font-bold text-primary" dir="ltr">{formatNumber(portfolioStats.totalCurrent)}</p>
                  <p className="text-[10px] text-muted-foreground">تومان</p>
                </div>
                <div className="fin-card text-center">
                  <p className="text-xs text-muted-foreground mb-1">سود / زیان کل</p>
                  <p className={`text-sm font-bold ${portfolioStats.profitLoss >= 0 ? "metric-up" : "metric-down"}`} dir="ltr">
                    {portfolioStats.profitLoss >= 0 ? "+" : ""}{portfolioStats.profitPercent.toFixed(1)}٪
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatNumber(Math.abs(portfolioStats.profitLoss))} تومان
                  </p>
                </div>
              </div>
            )}

            {/* Pie Chart */}
            {pieData.length > 0 && (
              <div className="fin-card">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">ترکیب سبد</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                      dataKey="value" paddingAngle={2}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(value) => <span style={{ fontSize: 10, color: "oklch(0.55 0.01 65)" }}>{value}</span>}
                    />
                    <Tooltip formatter={(v) => [`${v}٪`, "سهم"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Assets List */}
            <div className="space-y-2">
              {portfolioQuery.isLoading ? (
                [1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)
              ) : assets.length === 0 ? (
                <div className="fin-card text-center py-6">
                  <p className="text-muted-foreground text-sm">سبد دارایی خالی است</p>
                  <p className="text-xs text-muted-foreground mt-1">اولین دارایی خود را اضافه کنید</p>
                </div>
              ) : assets.map(asset => {
                const buyTotal = parseFloat(asset.quantity) * parseFloat(asset.buyPrice);
                const currentTotal = parseFloat(asset.quantity) * parseFloat(asset.currentPrice);
                const pl = currentTotal - buyTotal;
                const plPct = buyTotal > 0 ? (pl / buyTotal) * 100 : 0;
                return (
                  <div key={asset.id} className="fin-card flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{asset.name}</p>
                        <span className="badge-cyan">{ASSET_TYPES.find(t => t.value === asset.assetType)?.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>تعداد: {asset.quantity}</span>
                        <span className={pl >= 0 ? "metric-up" : "metric-down"}>
                          {pl >= 0 ? <TrendingUp size={10} className="inline ml-0.5" /> : <TrendingDown size={10} className="inline ml-0.5" />}
                          {plPct.toFixed(1)}٪
                        </span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-primary" dir="ltr">{formatNumber(currentTotal)}</p>
                      <p className="text-[10px] text-muted-foreground">تومان</p>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteAssetMutation.mutate({ id: asset.id })}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Add Asset Form */}
            <div className="fin-card space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Plus size={14} className="text-primary" />
                افزودن دارایی
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Select
                    value={newAsset.assetType}
                    onValueChange={v => setNewAsset(p => ({ ...p, assetType: v as any }))}
                  >
                    <SelectTrigger className="bg-muted border-border text-sm h-9">
                      <SelectValue placeholder="نوع دارایی" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Input placeholder="نام دارایی (مثال: طلای ۱۸ عیار)"
                    value={newAsset.name}
                    onChange={e => setNewAsset(p => ({ ...p, name: e.target.value }))}
                    className="bg-muted border-border text-sm h-9" />
                </div>
                <Input placeholder="تعداد / مقدار" type="number"
                  value={newAsset.quantity}
                  onChange={e => setNewAsset(p => ({ ...p, quantity: e.target.value }))}
                  className="bg-muted border-border text-sm h-9" dir="ltr" />
                <Input placeholder="قیمت خرید (ت)" type="number"
                  value={newAsset.buyPrice}
                  onChange={e => setNewAsset(p => ({ ...p, buyPrice: e.target.value }))}
                  className="bg-muted border-border text-sm h-9" dir="ltr" />
                <div className="col-span-2">
                  <Input placeholder="قیمت فعلی (تومان)" type="number"
                    value={newAsset.currentPrice}
                    onChange={e => setNewAsset(p => ({ ...p, currentPrice: e.target.value }))}
                    className="bg-muted border-border text-sm h-9" dir="ltr" />
                </div>
              </div>
              <Button
                className="w-full text-sm"
                onClick={handleAddAsset}
                disabled={addAssetMutation.isPending}
                style={{ background: "linear-gradient(135deg, oklch(0.62 0.22 200), oklch(0.55 0.22 200))" }}
              >
                <Plus size={14} className="ml-1" />
                {addAssetMutation.isPending ? "در حال افزودن..." : "افزودن به سبد"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
