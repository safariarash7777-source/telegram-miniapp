import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TelegramProvider, useTelegram } from "./contexts/TelegramContext";
import BottomNav from "./components/BottomNav";
import TelegramLogin from "./pages/TelegramLogin";
import Dashboard from "./pages/Dashboard";
import Calculator from "./pages/Calculator";
import Analysis from "./pages/Analysis";
import Consultation from "./pages/Consultation";
import Profile from "./pages/Profile";
import ProfileSetup from "./pages/ProfileSetup";
import { Loader2 } from "lucide-react";

function AppContent() {
  const { isVerified, isLoading, needsProfile } = useTelegram();

  // نمایش loading فقط برای مدت کوتاه
  if (isLoading) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--navy)", border: "1px solid rgba(212,162,43,0.3)" }}
          >
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--gold-soft)" }} />
          </div>
          <p className="text-sm" style={{ color: "var(--text-3)" }}>در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  // ✅ Gate اصلی: فقط هویت تلگرام نیاز است
  if (!isVerified) {
    return <TelegramLogin />;
  }

  // کاربر جدید است — یک بار نام و شماره می‌گیریم (soft prompt)
  if (needsProfile) {
    return <ProfileSetup />;
  }

  return (
    <div className="min-h-dvh" style={{ background: "var(--bg)" }}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/calculator" component={Calculator} />
        <Route path="/analysis" component={Analysis} />
        <Route path="/analysis/:id" component={Analysis} />
        <Route path="/consultation" component={Consultation} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <TelegramProvider>
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  color: "var(--text)",
                  direction: "rtl",
                  fontFamily: "'Vazirmatn', sans-serif",
                },
              }}
            />
            <AppContent />
          </TelegramProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
