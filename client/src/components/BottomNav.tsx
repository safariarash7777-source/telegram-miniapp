import { useLocation } from "wouter";
import { LayoutDashboard, Calculator, BarChart3, MessageSquare, User } from "lucide-react";
import { useTelegram } from "@/contexts/TelegramContext";

const navItems = [
  { path: "/", label: "داشبورد", icon: LayoutDashboard },
  { path: "/calculator", label: "محاسبه‌گر", icon: Calculator },
  { path: "/analysis", label: "تحلیل", icon: BarChart3 },
  { path: "/consultation", label: "مشاوره", icon: MessageSquare },
  { path: "/profile", label: "پروفایل", icon: User },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const { twa } = useTelegram();

  const handleNav = (path: string) => {
    twa.hapticFeedback("selection");
    navigate(path);
  };

  return (
    <nav className="bottom-nav" aria-label="ناوبری اصلی">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => handleNav(path)}
              className={`bottom-nav-item ${isActive ? "active" : ""}`}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="nav-icon-wrap">
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className="text-[10px] font-bold leading-none"
                style={{ fontFamily: "'Vazirmatn', sans-serif" }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
