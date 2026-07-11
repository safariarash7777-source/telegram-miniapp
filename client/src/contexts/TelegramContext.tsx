import React, { createContext, useContext, useEffect, useRef, useState } from "react";
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
  /** نشست تلگرام سمت سرور تایید شده — gate اصلی ورود */
  isVerified: boolean;
  /** کاربر ادمین اپ است (بر اساس نشست سروری) */
  isAdmin: boolean;
  /** کاربر قبلاً نام و شماره را ثبت کرده */
  isRegistered: boolean;
  /** کاربر جدید است و هنوز پروفایل کامل نکرده */
  needsProfile: boolean;
  isTelegram: boolean;
  register: (name: string, phone: string) => Promise<void>;
  twa: ReturnType<typeof useTelegramWebApp>;
}

const TelegramContext = createContext<TelegramContextValue | null>(null);

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const twa = useTelegramWebApp();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionUser, setSessionUser] = useState<TelegramUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<TelegramContextValue["registeredUser"]>(null);
  const loginStarted = useRef(false);

  const utils = trpc.useUtils();
  const loginMutation = trpc.telegramAuth.login.useMutation();
  const devLoginMutation = trpc.telegramAuth.devLogin.useMutation();
  const registerMutation = trpc.telegramAuth.registerUser.useMutation();

  // فلوی ورود: initData به سرور ارسال و پس از تایید امضا، کوکی نشست ست می‌شود.
  // هویت کاربر همیشه از پاسخ سرور می‌آید، نه از initDataUnsafe.
  useEffect(() => {
    if (loginStarted.current) return;
    loginStarted.current = true;

    const applySession = (payload: {
      telegramUser: { telegramId: string; firstName: string; lastName?: string; username?: string; isAdmin: boolean };
      profile: TelegramContextValue["registeredUser"];
    }) => {
      setSessionUser({
        id: Number(payload.telegramUser.telegramId),
        first_name: payload.telegramUser.firstName,
        last_name: payload.telegramUser.lastName,
        username: payload.telegramUser.username,
      });
      setIsAdmin(payload.telegramUser.isAdmin);
      setRegisteredUser(payload.profile);
    };

    const boot = async () => {
      try {
        if (twa.isTelegram && twa.initData) {
          const result = await loginMutation.mutateAsync({ initData: twa.initData });
          applySession(result as any);
          return;
        }
        // خارج از تلگرام: اول نشست موجود، بعد dev login (فقط در حالت توسعه)
        const existing = await utils.client.telegramAuth.session.query();
        if (existing) {
          applySession(existing as any);
          return;
        }
        if (import.meta.env.DEV) {
          const result = await devLoginMutation.mutateAsync();
          applySession(result as any);
        }
      } catch (error) {
        console.warn("[TelegramContext] Login failed:", error);
        // fallback: شاید نشست قبلی هنوز معتبر باشد
        try {
          const existing = await utils.client.telegramAuth.session.query();
          if (existing) applySession(existing as any);
        } catch {
          /* stay logged out */
        }
      } finally {
        setIsLoading(false);
      }
    };

    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = async (name: string, phone: string) => {
    if (!sessionUser) throw new Error("No Telegram session");
    await registerMutation.mutateAsync({ name, phone });
    const refreshed = await utils.client.telegramAuth.session.query();
    if (refreshed) setRegisteredUser(refreshed.profile as any);
  };

  const isVerified = !!sessionUser;
  const isRegistered = !!registeredUser;
  const needsProfile = isVerified && !isRegistered;

  return (
    <TelegramContext.Provider
      value={{
        telegramUser: sessionUser,
        registeredUser,
        isLoading,
        isVerified,
        isAdmin,
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
