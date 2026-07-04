import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useTelegram } from "@/contexts/TelegramContext";
import { BarChart3, ChevronLeft, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

const CATEGORIES = [
  { value: "all", label: "همه" },
  { value: "gold", label: "طلا" },
  { value: "stock", label: "بورس" },
  { value: "currency", label: "ارز" },
  { value: "economy", label: "اقتصاد" },
  { value: "tech", label: "فناوری" },
  { value: "other", label: "سایر" },
];

const CATEGORY_LABELS: Record<string, string> = {
  gold: "طلا", stock: "بورس", currency: "ارز",
  economy: "اقتصاد", tech: "فناوری", other: "سایر",
};

export default function Analysis() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { twa } = useTelegram();
  const [location] = useLocation();

  // Parse id from route /analysis/:id
  useEffect(() => {
    const parts = location.split("/");
    const idStr = parts[parts.length - 1];
    const id = parseInt(idStr);
    if (!isNaN(id) && id > 0) setSelectedId(id);
    else setSelectedId(null);
  }, [location]);

  const analysesQuery = trpc.analysis.list.useQuery(
    { category: selectedCategory === "all" ? undefined : selectedCategory },
    { staleTime: 5 * 60_000 }
  );

  const detailQuery = trpc.analysis.getById.useQuery(
    { id: selectedId ?? 0 },
    { enabled: !!selectedId }
  );

  useEffect(() => {
    if (selectedId) {
      twa.showBackButton(() => setSelectedId(null));
    } else {
      twa.hideBackButton();
    }
    return () => twa.hideBackButton();
  }, [selectedId]);

  // ─── Detail view ───────────────────────────────────────────────────────
  if (selectedId) {
    const analysis = detailQuery.data;
    return (
      <div className="page-content" dir="rtl">
        <header
          className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3"
          style={{
            background: "rgba(11,18,32,0.96)",
            borderBottom: "1px solid var(--line)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <button
            onClick={() => setSelectedId(null)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
            style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
          >
            <ArrowRight size={16} style={{ color: "var(--text-3)" }} />
          </button>
          <h1 className="text-sm font-black truncate flex-1" style={{ color: "var(--text)" }}>
            {analysis?.title ?? "در حال بارگذاری..."}
          </h1>
        </header>

        <div className="px-4 pt-4">
          {detailQuery.isLoading ? (
            <div className="space-y-3">
              <div className="skeleton h-8 w-3/4 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-5/6 rounded" />
              <div className="skeleton h-4 w-full rounded" />
            </div>
          ) : analysis ? (
            <div className="card-elevated p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="badge-navy">{CATEGORY_LABELS[analysis.category] ?? analysis.category}</span>
                <span className="text-xs" style={{ color: "var(--text-3)" }}>
                  {new Date(analysis.publishedAt ?? analysis.createdAt).toLocaleDateString("fa-IR")}
                </span>
              </div>
              <h2 className="text-lg font-black mb-3" style={{ color: "var(--text)" }}>
                {analysis.title}
              </h2>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--text-2)" }}>
                {analysis.description}
              </p>
              {analysis.content && (
                <div
                  className="markdown-body pt-4"
                  style={{ borderTop: "1px solid var(--line)" }}
                >
                  {analysis.content.split("\n").map((para: string, i: number) =>
                    para.trim() ? (
                      <p key={i} className="mb-3 text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                        {para}
                      </p>
                    ) : null
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card-elevated p-8 text-center">
              <p style={{ color: "var(--text-3)" }}>تحلیل یافت نشد</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── List view ─────────────────────────────────────────────────────────
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
        <h1 className="text-sm font-black" style={{ color: "var(--text)" }}>تحلیل‌های بازار</h1>
      </header>

      {/* Category filter */}
      <div className="px-4 pt-3 pb-2 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
              style={{
                background: selectedCategory === cat.value ? "var(--navy)" : "var(--surface-2)",
                color: selectedCategory === cat.value ? "var(--text-on-navy)" : "var(--text-3)",
                border: selectedCategory === cat.value
                  ? "1px solid rgba(212,162,43,0.3)"
                  : "1px solid var(--line)",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-2 space-y-2">
        {analysesQuery.isLoading ? (
          [1, 2, 3, 4].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)
        ) : analysesQuery.data && analysesQuery.data.length > 0 ? (
          analysesQuery.data.map((item: any) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className="w-full card-elevated p-4 text-right flex items-start gap-3 transition-all active:scale-[0.98]"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(30,58,138,0.2)", border: "1px solid rgba(30,58,138,0.3)" }}
              >
                <BarChart3 size={18} style={{ color: "#93C5FD" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold mb-1 text-right" style={{ color: "var(--text)" }}>
                  {item.title}
                </p>
                <p className="text-xs line-clamp-2 text-right" style={{ color: "var(--text-3)" }}>
                  {item.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge-navy">{CATEGORY_LABELS[item.category] ?? item.category}</span>
                  <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                    {new Date(item.publishedAt ?? item.createdAt).toLocaleDateString("fa-IR")}
                  </span>
                </div>
              </div>
              <ChevronLeft size={14} className="mt-1 flex-shrink-0" style={{ color: "var(--text-3)" }} />
            </button>
          ))
        ) : (
          <div className="card-elevated p-8 text-center">
            <BarChart3 size={32} className="mx-auto mb-3" style={{ color: "var(--text-3)" }} />
            <p className="text-sm font-bold mb-1" style={{ color: "var(--text-2)" }}>
              هنوز تحلیلی منتشر نشده
            </p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              به زودی تحلیل‌های جدید اضافه می‌شود
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
