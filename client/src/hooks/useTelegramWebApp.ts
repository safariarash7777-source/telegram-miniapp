import { useEffect, useState } from "react";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebAppState {
  isReady: boolean;
  isTelegram: boolean;
  user: TelegramUser | null;
  initData: string;
  colorScheme: "light" | "dark";
  expand: () => void;
  close: () => void;
  showBackButton: (callback: () => void) => void;
  hideBackButton: () => void;
  showMainButton: (text: string, callback: () => void) => void;
  hideMainButton: () => void;
  hapticFeedback: (type: "impact" | "notification" | "selection") => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
          query_id?: string;
          auth_date?: number;
          hash?: string;
        };
        colorScheme: "light" | "dark";
        themeParams: Record<string, string>;
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean }) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
          notificationOccurred: (type: "error" | "success" | "warning") => void;
          selectionChanged: () => void;
        };
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        enableClosingConfirmation: () => void;
        disableClosingConfirmation: () => void;
        version: string;
        platform: string;
      };
    };
  }
}

let mainButtonCallback: (() => void) | null = null;
let backButtonCallback: (() => void) | null = null;

export function useTelegramWebApp(): TelegramWebAppState {
  const [isReady, setIsReady] = useState(false);
  const twa = window.Telegram?.WebApp;
  const isTelegram = !!twa && !!twa.initData;

  useEffect(() => {
    if (twa) {
      twa.ready();
      twa.expand();
      try {
        twa.setHeaderColor("#0D1F4A");
        twa.setBackgroundColor("#0D1F4A");
      } catch {}
    }
    setIsReady(true);
  }, []);

  const user = twa?.initDataUnsafe?.user ?? null;
  const initData = twa?.initData ?? "";
  const colorScheme = twa?.colorScheme ?? "dark";

  const expand = () => twa?.expand();
  const close = () => twa?.close();

  const showBackButton = (callback: () => void) => {
    if (!twa?.BackButton) return;
    if (backButtonCallback) {
      twa.BackButton.offClick(backButtonCallback);
    }
    backButtonCallback = callback;
    twa.BackButton.onClick(callback);
    twa.BackButton.show();
  };

  const hideBackButton = () => {
    if (!twa?.BackButton) return;
    if (backButtonCallback) {
      twa.BackButton.offClick(backButtonCallback);
      backButtonCallback = null;
    }
    twa.BackButton.hide();
  };

  const showMainButton = (text: string, callback: () => void) => {
    if (!twa?.MainButton) return;
    if (mainButtonCallback) {
      twa.MainButton.offClick(mainButtonCallback);
    }
    mainButtonCallback = callback;
    twa.MainButton.setParams({ text, color: "#06b6d4", text_color: "#0d1117", is_active: true });
    twa.MainButton.onClick(callback);
    twa.MainButton.show();
  };

  const hideMainButton = () => {
    if (!twa?.MainButton) return;
    if (mainButtonCallback) {
      twa.MainButton.offClick(mainButtonCallback);
      mainButtonCallback = null;
    }
    twa.MainButton.hide();
  };

  const hapticFeedback = (type: "impact" | "notification" | "selection") => {
    if (!twa?.HapticFeedback) return;
    if (type === "impact") twa.HapticFeedback.impactOccurred("medium");
    else if (type === "notification") twa.HapticFeedback.notificationOccurred("success");
    else twa.HapticFeedback.selectionChanged();
  };

  return {
    isReady,
    isTelegram,
    user,
    initData,
    colorScheme,
    expand,
    close,
    showBackButton,
    hideBackButton,
    showMainButton,
    hideMainButton,
    hapticFeedback,
  };
}
