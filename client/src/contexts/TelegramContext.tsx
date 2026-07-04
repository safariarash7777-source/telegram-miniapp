import React, { createContext, useContext, useEffect, useState } from "react";
import { useTelegramWebApp, TelegramUser } from "@/hooks/useTelegramWebApp";
import { trpc } from "@/lib/trpc";

interface TelegramContextValue {
  telegramUser: TelegramUser | null;
  registeredUser: {
    id: number;
    telegramId: string;
    name: string;
    phone: string;
    firstName: string;
    lastName?: string | null;
    username?: string | null;
  } | null;
  isLoading: boolean;
  /** کاربر هویت تلگرام دارد — gate اصلی ورود */
  isVerified: boolean;
  /** کاربر قبلاً نام و شماره را ثبت کرده */
  isRegistered: boolean;
  /** کاربر جدید است و هنوز پروفایل کامل نکرده */
  needsProfile: boolean;
  isTelegram: boolean;
  register: (name: string, phone: string) => Promise<void>;
  twa: ReturnType<typeof useTelegramWebApp>;
}

const TelegramContext = createContext<TelegramContextValue | null>(null);

// Dev mode mock user for testing outside Telegram
const DEV_MOCK_USER: TelegramUser = {
  id: 999999999,
  first_name: "آرش",
  last_name: "صفری",
  username: "arash_safari_dev",
  language_code: "fa",
};

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const twa = useTelegramWebApp();
  const [isLoading, setIsLoading] = useState(true);
  const [registeredUser, setRegisteredUser] = useState<TelegramContextValue["registeredUser"]>(null);

  // Use real Telegram user or dev mock
  const telegramUser = twa.isTelegram ? twa.user : (import.meta.env.DEV ? DEV_MOCK_USER : null);
  const telegramId = telegramUser ? String(telegramUser.id) : null;

  // ✅ کاربر هویت تلگرام دارد — این gate اصلی ورود است
  const isVerified = !!telegramUser;

  const getUserQuery = trpc.telegramAuth.getUser.useQuery(
    { telegramId: telegramId ?? "" },
    {
      enabled: !!telegramId,
      retry: 1,
      // اگر DB در دسترس نبود، کاربر همچنان می‌تواند وارد شود
      retryDelay: 1000,
    }
  );

  const registerMutation = trpc.telegramAuth.registerUser.useMutation();

  useEffect(() => {
    if (getUserQuery.data !== undefined) {
      setRegisteredUser(getUserQuery.data as any);
      setIsLoading(false);
    } else if (getUserQuery.error) {
      // ✅ حتی اگر DB خطا داد، کاربر می‌تواند وارد شود
      console.warn("[TelegramContext] DB error, allowing entry anyway:", getUserQuery.error.message);
      setIsLoading(false);
    } else if (!telegramId) {
      setIsLoading(false);
    }
  }, [getUserQuery.data, getUserQuery.error, telegramId]);

  // اگر telegramId نداشتیم، loading را false کن
  useEffect(() => {
    if (!telegramId) setIsLoading(false);
  }, [telegramId]);

  // Timeout: بعد از ۳ ثانیه loading را false کن تا کاربر block نشود
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const register = async (name: string, phone: string) => {
    if (!telegramUser) throw new Error("No Telegram user");
    await registerMutation.mutateAsync({
      telegramId: String(telegramUser.id),
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      username: telegramUser.username,
      name,
      phone,
    });
    await getUserQuery.refetch();
  };

  const isRegistered = !!registeredUser;
  // کاربر جدید است اگر هویت تلگرام دارد اما هنوز ثبت نشده
  const needsProfile = isVerified && !isRegistered && !getUserQuery.isLoading;

  return (
    <TelegramContext.Provider
      value={{
        telegramUser,
        registeredUser,
        isLoading,
        isVerified,
        isRegistered,
        needsProfile,
        isTelegram: twa.isTelegram,
        register,
        twa,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const ctx = useContext(TelegramContext);
  if (!ctx) throw new Error("useTelegram must be used inside TelegramProvider");
  return ctx;
}
