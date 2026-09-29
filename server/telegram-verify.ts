import { createHmac, timingSafeEqual } from "crypto";

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
    const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest();

    // Constant-time comparison to avoid timing side channels.
    const providedHash = Buffer.from(hash, "hex");
    if (providedHash.length !== expectedHash.length) return false;
    return timingSafeEqual(expectedHash, providedHash);
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
    // `URLSearchParams.get` already percent-decodes the value. Decoding it a
    // second time corrupts any name that legitimately contains a percent sign:
    // "100%41" silently became "100A", and a trailing "100%" threw URIError so
    // the whole login returned null. Parse the value as-is.
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/** Tolerated clock skew between Telegram's clock and ours, in seconds. */
const MAX_CLOCK_SKEW_SECONDS = 300;

/**
 * Check if initData is expired. Telegram issues fresh initData every time the
 * Mini App opens, so a short window is safe; the long-lived state lives in our
 * own session cookie instead.
 */
export function isInitDataExpired(initData: string, maxAgeSeconds = 3600): boolean {
  try {
    const params = new URLSearchParams(initData);
    const authDate = params.get("auth_date");
    if (!authDate) return true;

    // `parseInt` returns NaN for junk, and every comparison against NaN is
    // false — so "abc" used to read as "not expired" and was accepted. A
    // timestamp in the future produced a negative age, which is also never
    // greater than the limit, so a forged future date was accepted too.
    // Both are now rejected explicitly; only a sane, past timestamp passes.
    const seconds = Number(authDate);
    if (!Number.isFinite(seconds) || !Number.isInteger(seconds) || seconds <= 0) return true;

    const age = Math.floor(Date.now() / 1000) - seconds;
    // A small negative age is ordinary clock skew between Telegram and us;
    // anything further ahead is not a timestamp we should trust.
    if (age < -MAX_CLOCK_SKEW_SECONDS) return true;

    return age > maxAgeSeconds;
  } catch {
    return true;
  }
}
