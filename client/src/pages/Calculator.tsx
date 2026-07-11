import { useState, useMemo } from "react";
import { useTelegram } from "@/contexts/TelegramContext";
import { ExternalLink } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  const { twa } = useTelegram();
  const [calc, setCalc] = useState({ amount: "10000000", months: "12", rate: "30" });

  const chartData = useMemo(
    () => growthData(parseFloat(calc.amount) || 10_000_000, parseInt(calc.months) || 12, parseFloat(calc.rate) || 30),
    [calc]
  );
  const finalValue = chartData[chartData.length - 1]?.value ?? 0;
  const initAmount = parseFloat(calc.amount) || 0;
  const profit = finalValue - initAmount;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl p-2.5 text-xs" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
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

      <div className="px-4 pt-3 space-y-4">
        {/* Calculator inputs */}
        <div className="card-elevated p-4 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-3)" }}>پارامترها</h3>
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
            <p className="text-base font-black" style={{ color: profit >= 0 ? "#4ADE80" : "#F87171", direction: "ltr" }}>
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
              <Area type="monotone" dataKey="value" stroke="#D4A22B" strokeWidth={2} fill="url(#goldGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="text-center text-[10px] pb-1" style={{ color: "var(--text-3)" }}>
          ⚠️ این محاسبات صرفاً نمایشی هستند و تضمین بازدهی نیستند
        </p>

        {/* CTA Card — Portfolio on Platform */}
        <div className="card-elevated p-4 text-center space-y-3" style={{ border: "1px solid rgba(212,162,43,0.3)" }}>
          <div className="flex items-center justify-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #D4A22B 0%, #B8860B 100%)" }}
            >
              <ExternalLink size={14} color="#fff" />
            </div>
            <h3 className="text-sm font-black" style={{ color: "var(--text)" }}>پرتفوی اختصاصی</h3>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
            مدیریت حرفه‌ای سبد دارایی‌ها، آزمون ریسک‌سنجی و تاریخچه نسخه‌ها — فقط در پلتفرم اصلی
          </p>
          <button
            onClick={() => {
              twa.hapticFeedback("notification");
              twa.openLink("https://portfolio-platform-fawn.vercel.app/register?ref=miniapp");
            }}
            className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #D4A22B 0%, #B8860B 100%)",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(212,162,43,0.3)",
            }}
          >
            <ExternalLink size={14} />
            پرتفوی اختصاصی‌ات را بساز
          </button>
        </div>
      </div>
    </div>
  );
}
