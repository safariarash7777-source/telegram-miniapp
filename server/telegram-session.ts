import { createHmac } from "crypto";
import type { Request } from "express";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";

/**
 * Telegram Mini App session — a signed JWT set as an httpOnly cookie after
 * the server verifies Telegram initData. Every authenticated procedure reads
 * the telegramId from this session instead of trusting client input.
 */

export const TELEGRAM_SESSION_COOKIE = "tg_session";
export const TELEGRAM_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type TelegramSession = {
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  isAdmin: boolean;
};

/**
 * Session signing key. Prefers JWT_SECRET; otherwise derives a stable key
 * from the bot token so no extra env var is required — the bot token is
 * already a server-side secret.
 */
function getSecretKey(): Uint8Array | null {
  const explicit = process.env.JWT_SECRET;
  if (explicit) return new TextEncoder().encode(explicit);
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken) {
    return createHmac("sha256", "tg-session-key").update(botToken).digest();
  }
  return null;
}

export async function createTelegramSessionToken(session: TelegramSession): Promise<string | null> {
  const key = getSecretKey();
  if (!key) {
    console.warn("[TelegramSession] No JWT_SECRET or TELEGRAM_BOT_TOKEN — cannot sign session");
    return null;
  }
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + TELEGRAM_SESSION_MAX_AGE_MS) / 1000))
    .sign(key);
}

export async function verifyTelegramSessionToken(token: string | undefined | null): Promise<TelegramSession | null> {
  if (!token) return null;
  const key = getSecretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof payload.telegramId !== "string" || !payload.telegramId) return null;
    return {
      telegramId: payload.telegramId,
      firstName: typeof payload.firstName === "string" ? payload.firstName : "",
      lastName: typeof payload.lastName === "string" ? payload.lastName : undefined,
      username: typeof payload.username === "string" ? payload.username : undefined,
      isAdmin: payload.isAdmin === true,
    };
  } catch {
    return null;
  }
}

/** Read and verify the Telegram session from the request cookie. */
export async function getTelegramSessionFromRequest(req: Request): Promise<TelegramSession | null> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  return verifyTelegramSessionToken(cookies[TELEGRAM_SESSION_COOKIE]);
}

/** The Telegram admin is identified by TELEGRAM_ADMIN_CHAT_ID. */
export function isAdminTelegramId(telegramId: string): boolean {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  return !!adminChatId && telegramId === adminChatId;
}
