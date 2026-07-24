import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getTelegramSessionFromRequest, type TelegramSession } from "../telegram-session";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** Verified Telegram Mini App session (from the tg_session cookie). */
  telegramSession: TelegramSession | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let telegramSession: TelegramSession | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  try {
    telegramSession = await getTelegramSessionFromRequest(opts.req);
  } catch (error) {
    telegramSession = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    telegramSession,
  };
}
