import { timingSafeEqual } from "crypto";
import express, { Request, Response } from "express";
import { sendMessage, answerCallbackQuery, setWebhook, getWebhookSecret } from "./telegram";

/** Constant-time string comparison (length-safe). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const telegramWebhookRouter = express.Router();

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; is_bot: boolean; first_name: string; username?: string };
    chat: { id: number; type: string };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; is_bot: boolean; first_name: string; username?: string };
    chat_instance: string;
    data?: string;
  };
}

/**
 * Get the published Mini App URL.
 * Priority:
 *  1. MINI_APP_URL env var (set manually after publishing)
 *  2. VITE_APP_URL env var
 *  3. Derived from DOMAIN env var
 */
function getMiniAppUrl(): string {
  // Published URL — set after deployment
  return (
    process.env.MINI_APP_URL ||
    process.env.VITE_APP_URL ||
    (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : "")
  );
}

telegramWebhookRouter.post("/webhook", async (req: Request, res: Response) => {
  // Telegram echoes back the secret_token we registered via setWebhook.
  // Reject anything that doesn't carry it — otherwise anyone who knows the
  // URL can inject fake bot updates.
  const expectedSecret = getWebhookSecret();
  if (expectedSecret) {
    const provided = req.header("x-telegram-bot-api-secret-token") ?? "";
    if (!safeEqual(provided, expectedSecret)) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }
  }

  try {
    const update: TelegramUpdate = req.body;
    const appUrl = getMiniAppUrl();
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const firstName = update.message.from.first_name;

      if (text === "/start" || text.startsWith("/start ")) {
        const welcomeMsg = `👋 سلام ${firstName} عزیز!\n\nبه مینی اپ <b>آرش صفری</b> — مشاور سرمایه‌گذاری خوش آمدید.\n\n📊 <b>امکانات:</b>\n• قیمت زنده طلا، سکه، ارز و بورس\n• ماشین‌حساب سرمایه‌گذاری\n• تحلیل‌های اقتصادی\n• درخواست مشاوره\n\n👇 برای شروع دکمه زیر را بزنید:`;

        if (appUrl && token) {
          // Send welcome + mini app button together
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: welcomeMsg,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [[
                  {
                    text: "🚀 باز کردن مینی اپ",
                    web_app: { url: appUrl },
                  },
                ]],
              },
            }),
          });
        } else {
          // No URL yet — still send welcome
          await sendMessage(chatId, welcomeMsg + "\n\n⚠️ لینک مینی اپ به زودی فعال می‌شود.");
        }

      } else if (text === "/help") {
        const helpMsg = `📚 <b>راهنمای استفاده:</b>\n\n/start — شروع و باز کردن مینی اپ\n/help — نمایش این پیام\n\n💡 برای دسترسی به تمام ابزارها، دکمه <b>مینی اپ</b> را در پایین صفحه بزنید.`;
        await sendMessage(chatId, helpMsg);

      } else {
        // Any other message — guide them to use the mini app
        if (appUrl && token) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: `سلام ${firstName}!\n\nبرای استفاده از ابزارهای مالی، مینی اپ را باز کنید 👇`,
              reply_markup: {
                inline_keyboard: [[
                  {
                    text: "📊 باز کردن مینی اپ",
                    web_app: { url: appUrl },
                  },
                ]],
              },
            }),
          });
        } else {
          await sendMessage(chatId, `سلام ${firstName}!\n\nلطفاً /start را بزنید تا مینی اپ را باز کنید.`);
        }
      }
    }

    if (update.callback_query) {
      await answerCallbackQuery(update.callback_query.id, "✅ درخواست پردازش شد");
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Error handling Telegram update:", error);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

telegramWebhookRouter.get("/health", (_req: Request, res: Response) => {
  const appUrl = getMiniAppUrl();
  res.json({
    ok: true,
    message: "Telegram webhook is running",
    botConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
    miniAppUrl: appUrl || "NOT SET — set MINI_APP_URL env var after publishing",
  });
});

/**
 * One-time setup endpoint: registers this app's own /api/telegram/webhook URL
 * (derived from MINI_APP_URL — never from the request body, so it cannot be
 * pointed at an attacker's server) with the secret_token attached.
 *
 * Guarded by ADMIN_SECRET: the endpoint is disabled unless the env var is set,
 * and the caller must send it in the X-Admin-Secret header.
 */
telegramWebhookRouter.post("/set-webhook", async (req: Request, res: Response) => {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return res.status(403).json({ ok: false, error: "set-webhook is disabled (ADMIN_SECRET not configured)" });
  }
  const provided = req.header("x-admin-secret") ?? "";
  if (!safeEqual(provided, adminSecret)) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return res.status(500).json({ ok: false, error: "TELEGRAM_BOT_TOKEN not set" });
  }
  const appUrl = getMiniAppUrl();
  if (!appUrl) {
    return res.status(400).json({ ok: false, error: "MINI_APP_URL not set" });
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;
  const ok = await setWebhook(webhookUrl);
  return res.json({ ok, webhookUrl });
});
