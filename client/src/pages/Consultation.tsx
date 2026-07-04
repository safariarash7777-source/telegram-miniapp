import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useTelegram } from "@/contexts/TelegramContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, CheckCircle, Loader2 } from "lucide-react";

const TOPICS = [
  { value: "gold", label: "🥇 سرمایه‌گذاری در طلا" },
  { value: "stock", label: "📈 بورس و سهام" },
  { value: "currency", label: "💱 ارز و دلار" },
  { value: "portfolio", label: "📊 طراحی پرتفوی" },
  { value: "other", label: "💬 سایر موضوعات" },
];

const TIME_SLOTS = [
  "۸:۰۰ - ۱۰:۰۰",
  "۱۰:۰۰ - ۱۲:۰۰",
  "۱۴:۰۰ - ۱۶:۰۰",
  "۱۶:۰۰ - ۱۸:۰۰",
  "۱۸:۰۰ - ۲۰:۰۰",
];

export default function Consultation() {
  const { registeredUser, twa } = useTelegram();
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: registeredUser?.name ?? "",
    phone: registeredUser?.phone ?? "",
    topic: "" as "gold" | "stock" | "currency" | "portfolio" | "other" | "",
    message: "",
    preferredDate: "",
    preferredTime: "",
  });

  const submitMutation = trpc.consultation.submit.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      twa.hapticFeedback("notification");
      twa.hideMainButton();
      toast.success(data.message);
    },
    onError: (err) => {
      toast.error(err.message || "خطا در ثبت درخواست");
      twa.hapticFeedback("impact");
    },
  });

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("نام را وارد کنید"); return; }
    if (!form.phone.trim() || form.phone.length < 10) { toast.error("شماره تلفن معتبر وارد کنید"); return; }
    if (!form.topic) { toast.error("موضوع مشاوره را انتخاب کنید"); return; }

    submitMutation.mutate({
      telegramId: registeredUser?.telegramId,
      name: form.name,
      phone: form.phone,
      topic: form.topic as any,
      message: form.message || undefined,
      preferredDate: form.preferredDate || undefined,
      preferredTime: form.preferredTime || undefined,
      telegramUsername: twa.user?.username,
    });
  };

  // Setup Telegram MainButton
  useEffect(() => {
    twa.hideBackButton();
    if (!submitted) {
      twa.showMainButton("ثبت درخواست مشاوره", handleSubmit);
    }
    return () => twa.hideMainButton();
  }, [form, submitted]);

  if (submitted) {
    return (
      <div className="page-content flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "oklch(0.65 0.20 150 / 0.15)", border: "2px solid oklch(0.65 0.20 150 / 0.4)" }}>
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-lg font-bold mb-2">درخواست ثبت شد!</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            درخواست مشاوره شما با موفقیت ثبت شد. آرش صفری در اسرع وقت با شما تماس خواهد گرفت.
          </p>
          <div className="fin-card text-right space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">نام:</span>
              <span className="font-medium">{form.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">موضوع:</span>
              <span className="font-medium">{TOPICS.find(t => t.value === form.topic)?.label}</span>
            </div>
            {form.preferredDate && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">تاریخ ترجیحی:</span>
                <span className="font-medium">{form.preferredDate}</span>
              </div>
            )}
          </div>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => { setSubmitted(false); setForm({ name: registeredUser?.name ?? "", phone: registeredUser?.phone ?? "", topic: "", message: "", preferredDate: "", preferredTime: "" }); }}
          >
            ثبت درخواست جدید
          </Button>
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
            <MessageSquare size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-base font-bold">درخواست مشاوره</h1>
            <p className="text-xs text-muted-foreground">مشاوره تخصصی با آرش صفری</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Advisor Card */}
        <div className="fin-card geo-accent flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, oklch(0.62 0.22 200), oklch(0.62 0.25 330))" }}>
            آ
          </div>
          <div>
            <p className="text-sm font-semibold">آرش صفری</p>
            <p className="text-xs text-muted-foreground">مشاور و تحلیلگر سرمایه‌گذاری</p>
            <div className="flex gap-1 mt-1">
              <span className="badge-cyan">بورس</span>
              <span className="badge-pink">طلا</span>
              <span className="badge-green">ارز</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="fin-card space-y-4">
          <h3 className="text-sm font-semibold">اطلاعات تماس</h3>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">نام و نام خانوادگی *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="آرش صفری"
              className="bg-muted border-border text-sm"
              dir="rtl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">شماره تلفن *</Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/[^0-9+]/g, "") }))}
              placeholder="09123456789"
              className="bg-muted border-border text-sm"
              dir="ltr"
            />
          </div>
        </div>

        <div className="fin-card space-y-4">
          <h3 className="text-sm font-semibold">موضوع مشاوره</h3>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">موضوع *</Label>
            <Select
              value={form.topic}
              onValueChange={v => setForm(p => ({ ...p, topic: v as any }))}
            >
              <SelectTrigger className="bg-muted border-border text-sm">
                <SelectValue placeholder="موضوع مشاوره را انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                {TOPICS.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">توضیحات (اختیاری)</Label>
            <Textarea
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              placeholder="سوالات یا موضوعاتی که می‌خواهید در مشاوره مطرح شود را بنویسید..."
              className="bg-muted border-border text-sm resize-none"
              rows={3}
              dir="rtl"
            />
          </div>
        </div>

        <div className="fin-card space-y-4">
          <h3 className="text-sm font-semibold">زمان‌بندی (اختیاری)</h3>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">تاریخ ترجیحی</Label>
            <Input
              type="text"
              value={form.preferredDate}
              onChange={e => setForm(p => ({ ...p, preferredDate: e.target.value }))}
              placeholder="مثال: ۱۴۰۳/۰۵/۱۵"
              className="bg-muted border-border text-sm"
              dir="rtl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">بازه زمانی ترجیحی</Label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map(slot => (
                <button
                  key={slot}
                  onClick={() => setForm(p => ({ ...p, preferredTime: slot }))}
                  className={`text-xs py-2 px-3 rounded-lg border transition-all duration-200 ${
                    form.preferredTime === slot
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-muted border-border text-muted-foreground hover:border-primary/40"
                  }`}
                  dir="ltr"
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button (fallback for non-Telegram env) */}
        <Button
          className="w-full font-semibold"
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          style={{ background: "linear-gradient(135deg, oklch(0.62 0.25 330), oklch(0.55 0.25 330))" }}
        >
          {submitMutation.isPending ? (
            <><Loader2 size={16} className="animate-spin ml-2" />در حال ثبت...</>
          ) : (
            "ثبت درخواست مشاوره"
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          پس از ثبت، آرش صفری از طریق تلگرام با شما تماس خواهد گرفت
        </p>
      </div>
    </div>
  );
}
