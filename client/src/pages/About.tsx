import { useState, useEffect } from "react";
import { ExternalLink, Send, Instagram, Twitter, Youtube, RefreshCw, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useTelegram } from "@/contexts/TelegramContext";

// Social media links
const SOCIAL_LINKS = [
  {
    name: "کانال تلگرام",
    handle: "@arashsafariiiiiiii",
    url: "https://t.me/arashsafariiiiiiii",
    icon: Send,
    color: "#0088cc",
    bg: "rgba(0,136,204,0.12)",
    border: "rgba(0,136,204,0.3)",
  },
  {
    name: "اینستاگرام",
    handle: "@arash_safariiiiiii",
    url: "https://www.instagram.com/arash_safariiiiiii",
    icon: Instagram,
    color: "#E1306C",
    bg: "rgba(225,48,108,0.12)",
    border: "rgba(225,48,108,0.3)",
  },
  {
    name: "یوتیوب",
    handle: "@roadmap_investing",
    url: "https://www.youtube.com/@roadmap_investing",
    icon: Youtube,
    color: "#FF0000",
    bg: "rgba(255,0,0,0.12)",
    border: "rgba(255,0,0,0.3)",
  },
  {
    name: "توییتر / X",
    handle: "@arashsafariiiii",
    url: "https://x.com/arashsafariiiii",
    icon: Twitter,
    color: "#1DA1F2",
    bg: "rgba(29,161,242,0.12)",
    border: "rgba(29,161,242,0.3)",
  },
];

interface TelegramPost {
  id: string;
  text: string;
  date: string;
  url: string;
}

export default function About() {
  const { twa } = useTelegram();
  const [posts, setPosts] = useState<TelegramPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Fetch latest Telegram channel posts via backend
  const { data: channelPosts, isLoading, refetch } = trpc.social.getChannelPosts.useQuery(
    { channel: "arashsafariiiiiiii", limit: 8 },
    { staleTime: 5 * 60 * 1000 }
  );

  useEffect(() => {
    if (channelPosts) {
      setPosts(channelPosts);
      setLoadingPosts(false);
    } else if (!isLoading) {
      setLoadingPosts(false);
    }
  }, [channelPosts, isLoading]);

  const openLink = (url: string) => {
    twa.hapticFeedback("selection");
    twa.openLink(url);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("fa-IR", { month: "long", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="min-h-dvh pb-24"
      style={{ background: "var(--bg)", direction: "rtl" }}
    >
      {/* Header */}
      <div
        className="px-4 pt-6 pb-4"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div className="flex items-center gap-3 mb-1">
          <img
            src="/images/logo-circle-dark_9f5eb9e0.jpeg"
            alt="آرش صفری"
            className="w-14 h-14 rounded-full object-cover"
            style={{ border: "2px solid var(--gold-soft)" }}
          />
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--text)", fontFamily: "'Vazirmatn', sans-serif" }}
            >
              آرش صفری
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--gold-soft)", fontFamily: "'Vazirmatn', sans-serif" }}
            >
              تحلیلگر و مشاور سرمایه‌گذاری
            </p>
          </div>
        </div>
        <p
          className="text-sm mt-3 leading-relaxed"
          style={{ color: "var(--text-2)", fontFamily: "'Vazirmatn', sans-serif" }}
        >
          تحلیلگر بازارهای مالی با تخصص در بازار طلا، ارز، سهام و سرمایه‌گذاری. ارائه تحلیل‌های اقتصادی و مشاوره سرمایه‌گذاری به سرمایه‌گذاران ایرانی.
        </p>
      </div>

      {/* Social Media Links */}
      <div className="px-4 py-4">
        <h2
          className="text-sm font-bold mb-3"
          style={{ color: "var(--text-3)", fontFamily: "'Vazirmatn', sans-serif" }}
        >
          شبکه‌های اجتماعی
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {SOCIAL_LINKS.map((social) => {
            const Icon = social.icon;
            return (
              <button
                key={social.name}
                onClick={() => openLink(social.url)}
                className="flex items-center gap-2 p-3 rounded-xl text-right transition-all active:scale-95"
                style={{
                  background: social.bg,
                  border: `1px solid ${social.border}`,
                }}
              >
                <Icon size={18} style={{ color: social.color, flexShrink: 0 }} />
                <div className="min-w-0">
                  <div
                    className="text-xs font-bold truncate"
                    style={{ color: "var(--text)", fontFamily: "'Vazirmatn', sans-serif" }}
                  >
                    {social.name}
                  </div>
                  <div
                    className="text-[10px] truncate"
                    style={{ color: "var(--text-3)", fontFamily: "'Vazirmatn', sans-serif", direction: "ltr" }}
                  >
                    {social.handle}
                  </div>
                </div>
                <ExternalLink size={12} style={{ color: "var(--text-3)", flexShrink: 0, marginRight: "auto" }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Latest Telegram Posts */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-sm font-bold"
            style={{ color: "var(--text-3)", fontFamily: "'Vazirmatn', sans-serif" }}
          >
            آخرین پست‌های تلگرام
          </h2>
          <button
            onClick={() => { setLoadingPosts(true); refetch(); }}
            className="p-1.5 rounded-lg transition-all active:scale-90"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <RefreshCw size={14} style={{ color: "var(--text-3)" }} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {loadingPosts || isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl p-4 animate-pulse"
                style={{ background: "var(--surface)", border: "1px solid var(--line)", height: 80 }}
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <MessageCircle size={32} className="mx-auto mb-2" style={{ color: "var(--text-3)" }} />
            <p className="text-sm" style={{ color: "var(--text-3)", fontFamily: "'Vazirmatn', sans-serif" }}>
              پست‌ها در دسترس نیستند
            </p>
            <button
              onClick={() => openLink("https://t.me/arashsafariiiiiiii")}
              className="mt-3 text-xs px-4 py-2 rounded-lg"
              style={{
                background: "rgba(0,136,204,0.15)",
                border: "1px solid rgba(0,136,204,0.3)",
                color: "#0088cc",
                fontFamily: "'Vazirmatn', sans-serif",
              }}
            >
              مشاهده در تلگرام
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <button
                key={post.id}
                onClick={() => openLink(post.url)}
                className="w-full text-right rounded-xl p-4 transition-all active:scale-[0.98]"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                }}
              >
                <p
                  className="text-sm leading-relaxed line-clamp-3 mb-2"
                  style={{ color: "var(--text)", fontFamily: "'Vazirmatn', sans-serif" }}
                >
                  {post.text}
                </p>
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--text-3)", fontFamily: "'Vazirmatn', sans-serif" }}
                  >
                    {formatDate(post.date)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Send size={10} style={{ color: "#0088cc" }} />
                    <span className="text-[10px]" style={{ color: "#0088cc", fontFamily: "'Vazirmatn', sans-serif" }}>
                      مشاهده
                    </span>
                  </div>
                </div>
              </button>
            ))}

            {/* View all in Telegram */}
            <button
              onClick={() => openLink("https://t.me/arashsafariiiiiiii")}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
              style={{
                background: "rgba(0,136,204,0.1)",
                border: "1px solid rgba(0,136,204,0.3)",
                color: "#0088cc",
                fontFamily: "'Vazirmatn', sans-serif",
              }}
            >
              مشاهده همه پست‌ها در تلگرام
            </button>
          </div>
        )}
      </div>

      {/* Consultation CTA */}
      <div className="px-4 pb-4">
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(212,162,43,0.15) 0%, rgba(10,31,68,0.8) 100%)",
            border: "1px solid rgba(212,162,43,0.3)",
          }}
        >
          <p
            className="text-sm font-bold mb-1"
            style={{ color: "var(--gold-soft)", fontFamily: "'Vazirmatn', sans-serif" }}
          >
            مشاوره سرمایه‌گذاری
          </p>
          <p
            className="text-xs mb-3"
            style={{ color: "var(--text-2)", fontFamily: "'Vazirmatn', sans-serif" }}
          >
            برای دریافت مشاوره تخصصی درخواست خود را ثبت کنید
          </p>
          <button
            onClick={() => {
              twa.hapticFeedback("impact");
              window.location.href = "/consultation";
            }}
            className="px-6 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
            style={{
              background: "var(--gold-soft)",
              color: "var(--navy-deep)",
              fontFamily: "'Vazirmatn', sans-serif",
            }}
          >
            درخواست مشاوره
          </button>
        </div>
      </div>
    </div>
  );
}
