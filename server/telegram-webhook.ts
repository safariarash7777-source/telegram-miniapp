import express, { Request, Response } from "express";
import { sendMessage, createMiniAppButton, answerCallbackQuery } from "./telegram";

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

telegramWebhookRouter.post("/webhook", async (req: Request, res: Response) => {
  try {
    const update: TelegramUpdate = req.body;
    const appUrl = process.env.VITE_APP_URL || `https://${process.env.DOMAIN || ""}`;

    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const firstName = update.message.from.first_name;

      if (text === "/start") {
        const message = `سلام ${firstName}! 👋\n\nخوش آمدید به مینی اپ تحلیل سرمایه‌گذاری <b>آرش صفری</b>.\n\n📊 قیمت‌های زنده طلا، ارز و بورس\n🧮 ماشین‌حساب سرمایه‌گذاری\n📈 تحلیل‌های اقتصادی\n💬 درخواست مشاوره\n\nبرای شروع، روی دکمه زیر کلیک کنید:`;
        await sendMessage(chatId, message);
        if (appUrl) {
          await sendMessage(chatId, "👇 مینی اپ را باز کنید:");
          // Note: web_app button requires sendMessage with reply_markup
          const token = process.env.TELEGRAM_BOT_TOKEN;
          if (token) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: "🚀 مینی اپ آرش صفری",
                reply_markup: createMiniAppButton(appUrl),
              }),
            });
          }
        }
      } else if (text === "/help") {
        const helpMsg = `📚 <b>راهنمای استفاده:</b>\n\n/start - شروع کردن\n/help - نمایش این پیام\n\nبرای دسترسی به تمام ابزارها، روی دکمه Mini App کلیک کنید.`;
        await sendMessage(chatId, helpMsg);
      } else {
        const replyMsg = `سلام ${firstName}!\n\nمن ربات مینی اپ آرش صفری هستم.\nبرای استفاده از ابزارهای تحلیل مالی، دکمه زیر را بزنید 👇`;
        await sendMessage(chatId, replyMsg);
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
  res.json({
    ok: true,
    message: "Telegram webhook is running",
    botConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
  });
});
