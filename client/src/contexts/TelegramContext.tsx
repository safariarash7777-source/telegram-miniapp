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
  isRegistered: boolean;
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

  const getUserQuery = trpc.telegramAuth.getUser.useQuery(
    { telegramId: telegramId ?? "" },
    { enabled: !!telegramId, retry: 1 }
  );

  const registerMutation = trpc.telegramAuth.registerUser.useMutation();

  useEffect(() => {
    if (getUserQuery.data !== undefined) {
      setRegisteredUser(getUserQuery.data as any);
      setIsLoading(false);
    } else if (getUserQuery.error) {
      setIsLoading(false);
    }
  }, [getUserQuery.data, getUserQuery.error]);

  useEffect(() => {
    if (!telegramId) setIsLoading(false);
  }, [telegramId]);

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

  return (
    <TelegramContext.Provider
      value={{
        telegramUser,
        registeredUser,
        isLoading,
        isRegistered: !!registeredUser,
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
