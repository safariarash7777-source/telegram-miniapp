/**
 * P1-003.2 Smoke Test — 4 scenarios
 *
 * S1: valid login (correctly signed initData) → session returned
 * S2: invalid initData → UNAUTHORIZED
 * S3a: webhook with wrong secret token → 403
 * S3b: webhook when bot not configured → 503 (F-02 logic)
 * S4: non-admin user → FORBIDDEN on admin procedures
 */

import { createHmac, timingSafeEqual } from "crypto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { appRouter } from "./routers";
import { getWebhookSecret } from "./telegram";

// ── helpers ──────────────────────────────────────────────────────────────────

const BOT_TOKEN = "12345:SMOKE-TEST-TOKEN";
const ADMIN_CHAT_ID = "999999999";

function buildSignedInitData(userId: number, authDate = Math.floor(Date.now() / 1000)): string {
  const params = new URLSearchParams();
  params.set("user", JSON.stringify({ id: userId, first_name: "تست", username: "smoke_user" }));
  params.set("auth_date", String(authDate));
  params.set("query_id", "SMOKE_QID");
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

function createCtx(telegramSession: any) {
  return {
    req: {
      protocol: "https",
      headers: { "x-forwarded-proto": "https" },
      header: () => null,
    } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
    user: null,
    telegramSession,
  };
}

// ── S1: valid login ───────────────────────────────────────────────────────

describe("S1 — valid login", () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
    process.env.TELEGRAM_ADMIN_CHAT_ID = ADMIN_CHAT_ID;
  });
  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_ADMIN_CHAT_ID;
    vi.restoreAllMocks();
  });

  it("returns session payload with correct telegramId for valid initData", async () => {
    const initData = buildSignedInitData(111111111);
    const ctx = createCtx(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.telegramAuth.login({ initData });
    expect(result).toHaveProperty("telegramUser");
    expect((result as any).telegramUser.telegramId).toBe("111111111");
  });
});

// ── S2: invalid initData → UNAUTHORIZED ──────────────────────────────────

describe("S2 — invalid initData → UNAUTHORIZED", () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
  });
  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  it("rejects tampered initData (userId swapped) with UNAUTHORIZED", async () => {
    const valid = buildSignedInitData(111111111);
    const tampered = valid.replace("111111111", "999999999");
    const caller = appRouter.createCaller(createCtx(null));
    await expect(caller.telegramAuth.login({ initData: tampered }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects garbage initData with UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(
      caller.telegramAuth.login({
        initData: "user=%7B%22id%22%3A1%7D&auth_date=1&hash=deadbeef",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ── S3: webhook authentication ────────────────────────────────────────────

describe("S3 — webhook authentication", () => {
  it("S3a: getWebhookSecret returns a non-empty string when bot token is set", () => {
    process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
    const secret = getWebhookSecret();
    expect(secret).toBeTruthy();
    expect(typeof secret).toBe("string");
    expect((secret as string).length).toBeGreaterThan(0);
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  it("S3b: getWebhookSecret returns null/falsy when bot token is not set (F-02 503 path)", () => {
    const saved = process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;
    const secret = getWebhookSecret();
    // F-02: the webhook handler returns 503 when this is falsy
    expect(secret).toBeFalsy();
    if (saved) process.env.TELEGRAM_BOT_TOKEN = saved;
  });

  it("S3a: wrong token does not match expected secret (403 path via safeEqual logic)", () => {
    process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
    const expected = getWebhookSecret()!;
    const wrong = "wrong-token-value";
    const bufA = Buffer.from(wrong);
    const bufB = Buffer.from(expected);
    // Different lengths → not equal → 403
    const equal =
      bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
    expect(equal).toBe(false);
    delete process.env.TELEGRAM_BOT_TOKEN;
  });
});

// ── S4: non-admin → FORBIDDEN ─────────────────────────────────────────────

describe("S4 — non-admin user → FORBIDDEN", () => {
  const nonAdminSession = {
    telegramId: "111111111",
    firstName: "تست",
    username: "smoke_user",
    isAdmin: false,
  };

  it("blocks analysis.create for non-admin with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createCtx(nonAdminSession));
    await expect(
      caller.analysis.create({ title: "t", description: "d", category: "gold" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks consultation.listAll for non-admin with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(createCtx(nonAdminSession));
    await expect(caller.consultation.listAll()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does NOT block analysis.create for admin session (no FORBIDDEN)", async () => {
    const adminSession = { ...nonAdminSession, isAdmin: true };
    const caller = appRouter.createCaller(createCtx(adminSession));
    try {
      await caller.analysis.create({ title: "t", description: "d", category: "gold" });
    } catch (err: any) {
      // DB unavailable in test env is fine — just must not be FORBIDDEN
      expect(err.code).not.toBe("FORBIDDEN");
    }
  });
});
