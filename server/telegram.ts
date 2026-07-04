// Telegram Bot API helper — server-side only
const API_BASE = "https://api.telegram.org/bot";

function getToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null;
}

async function callApi<T = unknown>(
  method: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; result?: T }> {
  const token = getToken();
  if (!token) {
    console.warn("[Telegram] Bot token not configured");
    return { ok: false };
  }
  try {
    const res = await fetch(`${API_BASE}${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    return { ok: Boolean(json?.ok), result: json?.result as T };
  } catch (err) {
    console.error("[Telegram] API call failed:", err);
    return { ok: false };
  }
}

export async function sendMessage(chatId: number | string, text: string): Promise<boolean> {
  const { ok } = await callApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
  return ok;
}

export async function setWebhook(webhookUrl: string): Promise<boolean> {
  const { ok } = await callApi("setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message", "callback_query"],
  });
  return ok;
}

export async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<boolean> {
  const { ok } = await callApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
  return ok;
}

export function createMiniAppButton(appUrl: string) {
  return {
    inline_keyboard: [[
      { text: "🚀 باز کردن Mini App", web_app: { url: appUrl } },
    ]],
  };
}

// Send consultation notification to admin (Arash Safari)
export async function notifyAdminNewConsultation(data: {
  name: string;
  phone: string;
  topic: string;
  message?: string;
  preferredDate?: string;
  preferredTime?: string;
  telegramUsername?: string;
}): Promise<boolean> {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!adminChatId) {
    console.warn("[Telegram] Admin chat ID not configured, skipping notification");
    return false;
  }

  const topicLabels: Record<string, string> = {
    gold: "طلا",
    stock: "بورس",
    currency: "ارز",
    portfolio: "پرتفوی",
    other: "سایر",
  };

  const topicLabel = topicLabels[data.topic] ?? data.topic;
  const userRef = data.telegramUsername ? `@${data.telegramUsername}` : data.name;

  const text = [
    `📋 <b>درخواست مشاوره جدید</b>`,
    ``,
    `👤 <b>نام:</b> ${data.name}`,
    `📱 <b>تلفن:</b> ${data.phone}`,
    `🏷 <b>موضوع:</b> ${topicLabel}`,
    data.telegramUsername ? `💬 <b>تلگرام:</b> @${data.telegramUsername}` : "",
    data.preferredDate ? `📅 <b>تاریخ ترجیحی:</b> ${data.preferredDate}` : "",
    data.preferredTime ? `⏰ <b>ساعت ترجیحی:</b> ${data.preferredTime}` : "",
    data.message ? `\n📝 <b>پیام:</b>\n${data.message}` : "",
  ].filter(Boolean).join("\n");

  return sendMessage(adminChatId, text);
}
