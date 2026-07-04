import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useTelegram } from "@/contexts/TelegramContext";
import { Plus, Trash2, TrendingUp, TrendingDown, Calculator as CalcIcon } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const ASSET_TYPES = [
  { value: "gold", label: "طلا" },
  { value: "stock", label: "سهام" },
  { value: "currency", label: "ارز" },
  { value: "crypto", label: "رمزارز" },
  { value: "other", label: "سایر" },
] as const;

const CHART_COLORS = ["#D4A22B", "#93C5FD", "#4ADE80", "#F472B6", "#A5B4FC"];

function fmt(n: number) {
  return new Intl.NumberFormat("fa-IR").format(Math.round(n));
}

function growthData(amount: number, months: number, rate: number) {
  const mr = rate / 12 / 100;
  return Array.from({ length: Math.min(months, 60) + 1 }, (_, i) => ({
    month: i === 0 ? "شروع" : `م${new Intl.NumberFormat("fa-IR").format(i)}`,
    value: Math.round(amount * Math.pow(1 + mr, i)),
  }));
}

export default function Calculator() {
  const { registeredUser, telegramUser, twa } = useTelegram();
  const telegramId = telegramUser ? String(telegramUser.id) : registeredUser?.telegramId ?? "";
  const [tab, setTab] = useState<"calc" | "portfolio">("calc");

  const [calc, setCalc] = useState({ amount: "10000000", months: "12", rate: "30" });
  const [newAsset, setNewAsset] = useState({
    assetType: "gold" as "gold" | "stock" | "currency" | "crypto" | "other",
    name: "", quantity: "", buyPrice: "", currentPrice: "",
  });

  useEffect(() => { twa.hideBackButton(); }, []);

  const portfolioQuery = trpc.portfolio.getByTelegramId.useQuery(
    { telegramId },
    { enabled: !!telegramId }
  );

  const addMutation = trpc.portfolio.addAsset.useMutation({
    onSuccess: () => {
      portfolioQuery.refetch();
      setNewAsset({ assetType: "gold", name: "", quantity: "", buyPrice: "", currentPrice: "" });
      twa.hapticFeedback("notification");
    },
  });

  const deleteMutation = trpc.portfolio.deleteAsset.useMutation({
    onSuccess: () => portfolioQuery.refetch(),
  });

  const assets = portfolioQuery.data ?? [];

  const stats = useMemo(() => {
    if (!assets.length) return null;
    const buy = assets.reduce((s: number, a: any) => s + parseFloat(a.quantity) * parseFloat(a.buyPrice), 0);
    const cur = assets.reduce((s: number, a: any) => s + parseFloat(a.quantity) * parseFloat(a.currentPrice), 0);
    return { buy, cur, pl: cur - buy, plPct: buy > 0 ? ((cur - buy) / buy) * 100 : 0 };
  }, [assets]);

  const pieData = useMemo(() => {
    if (!assets.length) return [];
    const total = assets.reduce((s: number, a: any) => s + parseFloat(a.quantity) * parseFloat(a.currentPrice), 0);
    return assets.map((a: any) => ({
      name: a.name,
      value: Math.round((parseFloat(a.quantity) * parseFloat(a.currentPrice) / total) * 100),
    }));
  }, [assets]);

  const chartData = useMemo(() =>
    growthData(parseFloat(calc.amount) || 10_000_000, parseInt(calc.months) || 12, parseFloat(calc.rate) || 30),
    [calc]
  );

  const finalValue = chartData[chartData.length - 1]?.value ?? 0;
  const initAmount = parseFloat(calc.amount) || 0;
  const profit = finalValue - initAmount;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        className="rounded-xl p-2.5 text-xs"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      >
        <p style={{ color: "var(--text-3)" }}>{payload[0]?.payload?.month}</p>
        <p className="font-black mt-0.5" style={{ color: "var(--gold-soft)" }}>{fmt(payload[0]?.value ?? 0)} ت</p>
      </div>
    );
  };

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
        <h1 className="text-sm font-black" style={{ color: "var(--text)" }}>محاسبه‌گر سرمایه‌گذاری</h1>
      </header>

      {/* Tab switcher */}
      <div className="px-4 pt-3 pb-0">
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
        >
          {[{ key: "calc", label: "محاسبه‌گر رشد" }, { key: "portfolio", label: "سبد دارایی" }].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as "calc" | "portfolio")}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: tab === t.key ? "var(--navy)" : "transparent",
                color: tab === t.key ? "var(--text-on-navy)" : "var(--text-3)",
                border: tab === t.key ? "1px solid rgba(212,162,43,0.25)" : "1px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 space-y-4">
        {tab === "calc" ? (
          <>
            {/* Inputs */}
            <div className="card-elevated p-4 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                پارامترها
              </h3>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--text-2)" }}>
                  مبلغ سرمایه‌گذاری (تومان)
                </label>
                <input
                  type="number"
                  value={calc.amount}
                  onChange={e => setCalc(c => ({ ...c, amount: e.target.value }))}
                  className="input-field"
                  dir="ltr"
                  style={{ textAlign: "right" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--text-2)" }}>مدت (ماه)</label>
                  <input
                    type="number"
                    value={calc.months}
                    onChange={e => setCalc(c => ({ ...c, months: e.target.value }))}
                    className="input-field"
                    dir="ltr"
                    min="1" max="120"
                    style={{ textAlign: "center" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--text-2)" }}>بازده سالانه (٪)</label>
                  <input
                    type="number"
                    value={calc.rate}
                    onChange={e => setCalc(c => ({ ...c, rate: e.target.value }))}
                    className="input-field"
                    dir="ltr"
                    min="0" max="500"
                    style={{ textAlign: "center" }}
                  />
                </div>
              </div>
            </div>

            {/* Result cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card-elevated p-3 text-center">
                <p className="text-xs mb-1" style={{ color: "var(--text-3)" }}>ارزش نهایی</p>
                <p className="text-base font-black" style={{ color: "var(--gold-soft)", direction: "ltr" }}>{fmt(finalValue)}</p>
                <p className="text-[10px]" style={{ color: "var(--text-3)" }}>تومان</p>
              </div>
              <div className="card-elevated p-3 text-center">
                <p className="text-xs mb-1" style={{ color: "var(--text-3)" }}>سود / زیان</p>
                <p
                  className="text-base font-black"
                  style={{ color: profit >= 0 ? "#4ADE80" : "#F87171", direction: "ltr" }}
                >
                  {profit >= 0 ? "+" : ""}{fmt(profit)}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-3)" }}>تومان</p>
              </div>
            </div>

            {/* Chart */}
            <div className="card-elevated p-4">
              <h3 className="text-xs font-black mb-3" style={{ color: "var(--text-3)" }}>نمودار رشد سرمایه</h3>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4A22B" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#D4A22B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 9, fill: "rgba(248,250,252,0.4)", fontFamily: "Vazirmatn" }}
                    tickLine={false} axisLine={false}
                    interval={Math.floor(chartData.length / 4)}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone" dataKey="value"
                    stroke="#D4A22B" strokeWidth={2}
                    fill="url(#goldGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="text-center text-[10px] pb-1" style={{ color: "var(--text-3)" }}>
              ⚠️ این محاسبات صرفاً نمایشی هستند و تضمین بازدهی نیستند
            </p>
          </>
        ) : (
          <>
            {/* Portfolio stats */}
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="card-elevated p-3 text-center">
                  <p className="text-xs mb-1" style={{ color: "var(--text-3)" }}>ارزش فعلی</p>
                  <p className="text-sm font-black" style={{ color: "#93C5FD", direction: "ltr" }}>{fmt(stats.cur)}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-3)" }}>تومان</p>
                </div>
                <div className="card-elevated p-3 text-center">
                  <p className="text-xs mb-1" style={{ color: "var(--text-3)" }}>سود / زیان</p>
                  <p
                    className="text-sm font-black"
                    style={{ color: stats.pl >= 0 ? "#4ADE80" : "#F87171", direction: "ltr" }}
                  >
                    {stats.pl >= 0 ? "+" : ""}{stats.plPct.toFixed(1)}٪
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{fmt(Math.abs(stats.pl))} تومان</p>
                </div>
              </div>
            )}

            {/* Pie chart */}
            {pieData.length > 0 && (
              <div className="card-elevated p-4">
                <h3 className="text-xs font-black mb-2" style={{ color: "var(--text-3)" }}>ترکیب سبد</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55}
                      dataKey="value" paddingAngle={3}>
                      {pieData.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v}٪`, "سهم"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Assets list */}
            <div className="space-y-2">
              {portfolioQuery.isLoading ? (
                [1, 2].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)
              ) : assets.length === 0 ? (
                <div className="card-elevated p-6 text-center">
                  <CalcIcon size={28} className="mx-auto mb-2" style={{ color: "var(--text-3)" }} />
                  <p className="text-sm font-bold mb-1" style={{ color: "var(--text-2)" }}>سبد خالی است</p>
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>اولین دارایی را اضافه کنید</p>
                </div>
              ) : assets.map((asset: any) => {
                const buyT = parseFloat(asset.quantity) * parseFloat(asset.buyPrice);
                const curT = parseFloat(asset.quantity) * parseFloat(asset.currentPrice);
                const pl = curT - buyT;
                const plPct = buyT > 0 ? (pl / buyT) * 100 : 0;
                return (
                  <div key={asset.id} className="card-elevated p-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{asset.name}</p>
                        <span className="badge-navy">{ASSET_TYPES.find(t => t.value === asset.assetType)?.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span style={{ color: "var(--text-3)" }}>تعداد: {asset.quantity}</span>
                        <span style={{ color: pl >= 0 ? "#4ADE80" : "#F87171" }}>
                          {pl >= 0 ? "+" : ""}{plPct.toFixed(1)}٪
                        </span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black" style={{ color: "#93C5FD", direction: "ltr" }}>{fmt(curT)}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-3)" }}>تومان</p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate({ id: asset.id })}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
                      style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}
                    >
                      <Trash2 size={13} style={{ color: "#F87171" }} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add asset */}
            {telegramId && (
              <div className="card-elevated p-4 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                  افزودن دارایی
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <select
                      value={newAsset.assetType}
                      onChange={e => setNewAsset(p => ({ ...p, assetType: e.target.value as any }))}
                      className="input-field"
                    >
                      {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      placeholder="نام دارایی"
                      value={newAsset.name}
                      onChange={e => setNewAsset(p => ({ ...p, name: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <input
                    placeholder="تعداد"
                    type="number"
                    value={newAsset.quantity}
                    onChange={e => setNewAsset(p => ({ ...p, quantity: e.target.value }))}
                    className="input-field"
                    dir="ltr"
                    style={{ textAlign: "center" }}
                  />
                  <input
                    placeholder="قیمت خرید"
                    type="number"
                    value={newAsset.buyPrice}
                    onChange={e => setNewAsset(p => ({ ...p, buyPrice: e.target.value }))}
                    className="input-field"
                    dir="ltr"
                    style={{ textAlign: "center" }}
                  />
                  <div className="col-span-2">
                    <input
                      placeholder="قیمت فعلی (تومان)"
                      type="number"
                      value={newAsset.currentPrice}
                      onChange={e => setNewAsset(p => ({ ...p, currentPrice: e.target.value }))}
                      className="input-field"
                      dir="ltr"
                      style={{ textAlign: "right" }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!newAsset.name || !newAsset.quantity || !newAsset.buyPrice || !newAsset.currentPrice) return;
                    addMutation.mutate({ telegramId, ...newAsset });
                  }}
                  disabled={addMutation.isPending}
                  className="w-full py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-deep) 100%)",
                    border: "1px solid rgba(212,162,43,0.3)",
                    color: "var(--text-on-navy)",
                  }}
                >
                  <Plus size={15} />
                  {addMutation.isPending ? "در حال افزودن..." : "افزودن به سبد"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
