import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { TelegramSession } from "./telegram-session";

// Mock db module
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getTelegramUserByTelegramId: vi.fn(),
  createOrUpdateTelegramUser: vi.fn(),
  promoteTelegramUserToAdmin: vi.fn(),
  createConsultation: vi.fn(),
  getConsultationsByTelegramId: vi.fn(),
  getAllConsultations: vi.fn(),
  getAnalyses: vi.fn(),
  getAnalysisById: vi.fn(),
  createAnalysis: vi.fn(),
  getPortfolioByTelegramId: vi.fn(),
  addPortfolioAsset: vi.fn(),
  updatePortfolioAsset: vi.fn(),
  deletePortfolioAsset: vi.fn(),
}));

// Mock price-service module
vi.mock("./price-service", () => ({
  getLivePrices: vi.fn().mockResolvedValue({
    gold18: { price: 174627000, change: 2057000, changePercent: 1.19, isUp: true },
    usd: { price: 1753950, change: 10950, changePercent: 0.63, isUp: true },
    eur: { price: 2007600, change: 23100, changePercent: 1.16, isUp: true },
    goldOunce: { price: 4175.38, change: 52.06, changePercent: 1.26, isUp: true },
    coinEmami: { price: 2165000000, change: 25500000, changePercent: 1.19, isUp: true },
    coinHalf: { price: 698580000, change: 8220000, changePercent: 1.19, isUp: true },
    coinQuarter: { price: 384179400, change: 4525400, changePercent: 1.19, isUp: true },
    updatedAt: new Date().toISOString(),
    source: "live",
  }),
}));

// Mock telegram module
vi.mock("./telegram", () => ({
  notifyAdminNewConsultation: vi.fn().mockResolvedValue(true),
  sendMessage: vi.fn().mockResolvedValue(true),
  setWebhook: vi.fn().mockResolvedValue(true),
  answerCallbackQuery: vi.fn().mockResolvedValue(true),
  createMiniAppButton: vi.fn().mockReturnValue({}),
  getWebhookSecret: vi.fn().mockReturnValue("test-secret"),
}));

import * as db from "./db";
import * as telegram from "./telegram";

function createCtx(telegramSession: TelegramSession | null = null): TrpcContext {
  return {
    user: null,
    telegramSession,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

const USER_A: TelegramSession = {
  telegramId: "111111111",
  firstName: "کاربر",
  username: "user_a",
  isAdmin: false,
};

describe("authorization — identity comes from the session, never from input", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects portfolio.list without a session", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(caller.portfolio.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects consultation.myList without a session", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(caller.consultation.myList()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects registerUser without a session", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    await expect(
      caller.telegramAuth.registerUser({ name: "x", phone: "09120000000" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("scopes portfolio queries to the session's telegramId", async () => {
    vi.mocked(db.getPortfolioByTelegramId).mockResolvedValue([]);
    const caller = appRouter.createCaller(createCtx(USER_A));
    await caller.portfolio.list();
    expect(db.getPortfolioByTelegramId).toHaveBeenCalledWith(USER_A.telegramId);
  });

  it("pins asset deletion to the owner's telegramId (no cross-user IDOR)", async () => {
    vi.mocked(db.deletePortfolioAsset).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createCtx(USER_A));
    await caller.portfolio.deleteAsset({ id: 42 });
    expect(db.deletePortfolioAsset).toHaveBeenCalledWith(42, USER_A.telegramId);
  });

  it("blocks analysis.create for non-admin sessions", async () => {
    const caller = appRouter.createCaller(createCtx(USER_A));
    await expect(
      caller.analysis.create({ title: "t", description: "d", category: "gold" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows analysis.create for admin sessions", async () => {
    vi.mocked(db.createAnalysis).mockResolvedValue(undefined as any);
    const caller = appRouter.createCaller(createCtx({ ...USER_A, isAdmin: true }));
    const result = await caller.analysis.create({ title: "t", description: "d", category: "gold" });
    expect(result.success).toBe(true);
  });

  it("blocks consultation.listAll for non-admin sessions", async () => {
    const caller = appRouter.createCaller(createCtx(USER_A));
    await expect(caller.consultation.listAll()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("telegramAuth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers profile using the session identity", async () => {
    vi.mocked(db.createOrUpdateTelegramUser).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createCtx(USER_A));

    const result = await caller.telegramAuth.registerUser({
      name: "آرش صفری",
      phone: "09123456789",
    });

    expect(result.success).toBe(true);
    expect(db.createOrUpdateTelegramUser).toHaveBeenCalledWith(
      expect.objectContaining({
        telegramId: USER_A.telegramId, // from session, not input
        name: "آرش صفری",
        phone: "09123456789",
      })
    );
  });

  it("rejects login with invalid initData", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "12345:TEST-TOKEN";
    const caller = appRouter.createCaller(createCtx(null));
    await expect(
      caller.telegramAuth.login({ initData: "user=%7B%22id%22%3A1%7D&auth_date=1&hash=deadbeef" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  it("returns null session when logged out", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    const result = await caller.telegramAuth.session();
    expect(result).toBeNull();
  });
});

describe("consultation.submit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits a consultation and sends Telegram notification", async () => {
    vi.mocked(db.createConsultation).mockResolvedValue(undefined);
    vi.mocked(telegram.notifyAdminNewConsultation).mockResolvedValue(true);
    const caller = appRouter.createCaller(createCtx(USER_A));

    const result = await caller.consultation.submit({
      name: "آرش صفری",
      phone: "09123456789",
      topic: "gold",
      message: "سوال درباره طلا",
    });

    expect(result.success).toBe(true);
    expect(db.createConsultation).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "آرش صفری",
        topic: "gold",
        telegramId: USER_A.telegramId,
      })
    );
    expect(telegram.notifyAdminNewConsultation).toHaveBeenCalledWith(
      expect.objectContaining({ name: "آرش صفری", topic: "gold" })
    );
  });

  it("returns the session user's own consultation list", async () => {
    const mockConsultations = [
      {
        id: 1,
        telegramId: USER_A.telegramId,
        name: "آرش صفری",
        phone: "09123456789",
        topic: "gold" as const,
        message: "سوال",
        preferredDate: null,
        preferredTime: null,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    vi.mocked(db.getConsultationsByTelegramId).mockResolvedValue(mockConsultations);
    const caller = appRouter.createCaller(createCtx(USER_A));

    const result = await caller.consultation.myList();

    expect(result).toHaveLength(1);
    expect(db.getConsultationsByTelegramId).toHaveBeenCalledWith(USER_A.telegramId);
  });
});

describe("prices.getLive", () => {
  it("returns price data with required fields", async () => {
    const caller = appRouter.createCaller(createCtx(null));
    const result = await caller.prices.getLive() as any;

    expect(result).toHaveProperty("gold18");
    expect(result).toHaveProperty("usd");
    expect(result).toHaveProperty("eur");
    expect(result).toHaveProperty("coinEmami");
    expect(result).toHaveProperty("coinHalf");
    expect(result).toHaveProperty("coinQuarter");
    expect(result).toHaveProperty("goldOunce");
    expect(result.gold18).toHaveProperty("price");
    expect(result).toHaveProperty("updatedAt");
    expect(result).toHaveProperty("source");
  });
});
