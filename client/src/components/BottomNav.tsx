import { useLocation } from "wouter";
import { LayoutDashboard, Calculator, BarChart2, MessageSquare, User } from "lucide-react";
import { useTelegram } from "@/contexts/TelegramContext";

const navItems = [
  { path: "/", label: "داشبورد", icon: LayoutDashboard },
  { path: "/calculator", label: "محاسبه‌گر", icon: Calculator },
  { path: "/analysis", label: "تحلیل", icon: BarChart2 },
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
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="transition-all duration-200"
                />
                {isActive && (
                  <span
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </div>
              <span className={`text-[10px] font-medium transition-all duration-200 ${isActive ? "opacity-100" : "opacity-60"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
