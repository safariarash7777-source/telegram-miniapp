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
import { Loader2 } from "lucide-react";

function AppContent() {
  const { isRegistered, isLoading, telegramUser } = useTelegram();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  // Show login if no telegram user or not registered
  if (!telegramUser || !isRegistered) {
    return <TelegramLogin />;
  }

  return (
    <div className="min-h-dvh bg-background">
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
                  background: "oklch(0.13 0.025 262)",
                  border: "1px solid oklch(0.20 0.025 262)",
                  color: "oklch(0.93 0.01 65)",
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
