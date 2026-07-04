import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useTelegram } from "@/contexts/TelegramContext";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart2, ChevronLeft, Tag } from "lucide-react";
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

const CATEGORY_COLORS: Record<string, string> = {
  gold: "badge-cyan",
  stock: "badge-green",
  currency: "badge-pink",
  economy: "badge-cyan",
  tech: "badge-pink",
  other: "badge-cyan",
};

const CATEGORY_ICONS: Record<string, string> = {
  gold: "🥇",
  stock: "📈",
  currency: "💱",
  economy: "🏦",
  tech: "🤖",
  other: "📊",
};

export default function Analysis() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { twa } = useTelegram();
  const [location] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) setSelectedId(parseInt(id));
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
      twa.showBackButton(() => {
        setSelectedId(null);
        window.history.replaceState({}, "", "/analysis");
      });
    } else {
      twa.hideBackButton();
    }
  }, [selectedId]);

  const analyses = analysesQuery.data ?? [];

  if (selectedId && detailQuery.data) {
    const a = detailQuery.data;
    return (
      <div className="page-content">
        <div className="px-4 pt-5 pb-4 grid-bg">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-primary transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs text-muted-foreground">بازگشت</span>
          </div>
          <h1 className="text-base font-bold leading-snug">{a.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={CATEGORY_COLORS[a.category] ?? "badge-cyan"}>
              {CATEGORY_ICONS[a.category]} {CATEGORIES.find(c => c.value === a.category)?.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(a.publishedAt).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </div>
        <div className="px-4 py-4 space-y-4">
          <div className="fin-card">
            <p className="text-sm text-muted-foreground leading-relaxed">{a.description}</p>
          </div>
          {a.content && (
            <div className="fin-card">
              <p className="text-sm leading-7 text-foreground whitespace-pre-line">{a.content}</p>
            </div>
          )}
          {a.tags && (
            <div className="flex flex-wrap gap-2">
              {a.tags.split(" ").map(tag => (
                <span key={tag} className="flex items-center gap-1 badge-cyan">
                  <Tag size={9} />{tag}
                </span>
              ))}
            </div>
          )}
          <div className="fin-card geo-accent text-center py-4">
            <p className="text-xs text-muted-foreground mb-2">نیاز به مشاوره تخصصی دارید؟</p>
            <button
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => window.location.href = "/consultation"}
            >
              درخواست مشاوره با آرش صفری ←
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="px-4 pt-5 pb-4 grid-bg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(0.62 0.25 330 / 0.15)", border: "1px solid oklch(0.62 0.25 330 / 0.3)" }}>
            <BarChart2 size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-base font-bold">تحلیل‌های اقتصادی</h1>
            <p className="text-xs text-muted-foreground">آخرین تحلیل‌های آرش صفری</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${
                selectedCategory === cat.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {cat.value !== "all" && CATEGORY_ICONS[cat.value]} {cat.label}
            </button>
          ))}
        </div>

        {/* Analyses List */}
        <div className="space-y-3">
          {analysesQuery.isLoading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="fin-card space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <Skeleton className="flex-1 h-4" />
                </div>
                <Skeleton className="w-full h-3" />
                <Skeleton className="w-2/3 h-3" />
              </div>
            ))
          ) : analyses.length === 0 ? (
            <div className="fin-card text-center py-8">
              <BarChart2 size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">تحلیلی در این دسته‌بندی یافت نشد</p>
            </div>
          ) : analyses.map(analysis => (
            <button
              key={analysis.id}
              className="w-full fin-card text-right hover:border-primary/30 transition-all duration-200 active:scale-[0.98]"
              onClick={() => {
                setSelectedId(analysis.id);
                twa.hapticFeedback("selection");
              }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                  style={{ background: "oklch(0.17 0.025 262)" }}>
                  {CATEGORY_ICONS[analysis.category] ?? "📊"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug mb-1">{analysis.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{analysis.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={CATEGORY_COLORS[analysis.category] ?? "badge-cyan"}>
                      {CATEGORIES.find(c => c.value === analysis.category)?.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(analysis.publishedAt).toLocaleDateString("fa-IR")}
                    </span>
                  </div>
                </div>
                <ChevronLeft size={16} className="text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
