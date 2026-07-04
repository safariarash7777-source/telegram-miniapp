import { createHmac } from "crypto";

/**
 * Verifies Telegram WebApp initData using HMAC-SHA256.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;

    // Remove hash from params for verification
    params.delete("hash");

    // Sort params alphabetically and create data-check-string
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // HMAC-SHA256 with secret key = HMAC-SHA256("WebAppData", botToken)
    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    return expectedHash === hash;
  } catch {
    return false;
  }
}

/**
 * Parse Telegram user from initData string.
 */
export function parseTelegramUser(initData: string): {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
} | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    if (!userStr) return null;
    return JSON.parse(decodeURIComponent(userStr));
  } catch {
    return null;
  }
}

/**
 * Check if initData is expired (older than 24 hours).
 */
export function isInitDataExpired(initData: string, maxAgeSeconds = 86400): boolean {
  try {
    const params = new URLSearchParams(initData);
    const authDate = params.get("auth_date");
    if (!authDate) return true;
    const age = Math.floor(Date.now() / 1000) - parseInt(authDate);
    return age > maxAgeSeconds;
  } catch {
    return true;
  }
}
