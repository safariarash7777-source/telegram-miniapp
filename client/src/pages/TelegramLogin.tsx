import { useState } from "react";
import { useTelegram } from "@/contexts/TelegramContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, Shield, Zap } from "lucide-react";
import { toast } from "sonner";

export default function TelegramLogin() {
  const { telegramUser, register, isTelegram } = useTelegram();
  const [name, setName] = useState(
    telegramUser
      ? [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ")
      : ""
  );
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("لطفاً نام خود را وارد کنید"); return; }
    if (!phone.trim() || phone.length < 10) { toast.error("لطفاً شماره تلفن معتبر وارد کنید"); return; }

    setIsSubmitting(true);
    try {
      await register(name.trim(), phone.trim());
      toast.success("خوش آمدید! ورود موفقیت‌آمیز بود.");
    } catch (err) {
      toast.error("خطا در ثبت اطلاعات. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh grid-bg flex flex-col items-center justify-center p-5">
      {/* Decorative blobs */}
      <div className="fixed top-0 left-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "oklch(0.62 0.22 200)" }} />
      <div className="fixed bottom-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "oklch(0.62 0.25 330)" }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 glow-cyan"
            style={{ background: "oklch(0.62 0.22 200 / 0.15)", border: "1px solid oklch(0.62 0.22 200 / 0.3)" }}>
            <TrendingUp size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">آرش صفری</h1>
          <p className="text-muted-foreground text-sm">مشاور و تحلیلگر سرمایه‌گذاری</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: TrendingUp, label: "قیمت زنده", color: "text-primary" },
            { icon: Zap, label: "تحلیل لحظه‌ای", color: "text-accent" },
            { icon: Shield, label: "مشاوره امن", color: "text-green-400" },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="fin-card text-center py-3 px-2">
              <Icon size={18} className={`${color} mx-auto mb-1`} />
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Registration Form */}
        <div className="fin-card geo-accent">
          <h2 className="text-base font-semibold mb-4 text-center">
            {isTelegram ? "تکمیل پروفایل" : "ورود به سیستم"}
          </h2>

          {telegramUser && (
            <div className="flex items-center gap-3 p-3 rounded-lg mb-4"
              style={{ background: "oklch(0.62 0.22 200 / 0.1)", border: "1px solid oklch(0.62 0.22 200 / 0.2)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-primary"
                style={{ background: "oklch(0.62 0.22 200 / 0.2)" }}>
                {telegramUser.first_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium">{telegramUser.first_name} {telegramUser.last_name}</p>
                {telegramUser.username && (
                  <p className="text-xs text-muted-foreground">@{telegramUser.username}</p>
                )}
              </div>
              <span className="badge-cyan mr-auto">تلگرام</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm text-muted-foreground">نام و نام خانوادگی</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: آرش صفری"
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                dir="rtl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm text-muted-foreground">شماره تلفن همراه</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                placeholder="09123456789"
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                dir="ltr"
                maxLength={13}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={isSubmitting}
              style={{ background: "linear-gradient(135deg, oklch(0.62 0.22 200), oklch(0.55 0.22 200))" }}
            >
              {isSubmitting ? (
                <><Loader2 size={16} className="animate-spin ml-2" />در حال ثبت...</>
              ) : (
                "ورود به مینی اپ"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          اطلاعات شما محرمانه است و فقط برای ارائه مشاوره استفاده می‌شود
        </p>
      </div>
    </div>
  );
}
