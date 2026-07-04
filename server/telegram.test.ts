import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getTelegramUserByTelegramId: vi.fn(),
  createOrUpdateTelegramUser: vi.fn(),
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
}));

import * as db from "./db";
import * as telegram from "./telegram";

function createPublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("telegramAuth.registerUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers a new telegram user successfully", async () => {
    vi.mocked(db.createOrUpdateTelegramUser).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createPublicCtx());

    const result = await caller.telegramAuth.registerUser({
      telegramId: "123456789",
      firstName: "آرش",
      lastName: "صفری",
      username: "arash_safari",
      name: "آرش صفری",
      phone: "09123456789",
    });

    expect(result.success).toBe(true);
    expect(db.createOrUpdateTelegramUser).toHaveBeenCalledWith(
      expect.objectContaining({
        telegramId: "123456789",
        name: "آرش صفری",
        phone: "09123456789",
      })
    );
  });

  it("returns existing user by telegramId", async () => {
    const mockUser = {
      id: 1,
      telegramId: "123456789",
      firstName: "آرش",
      lastName: "صفری",
      username: "arash_safari",
      name: "آرش صفری",
      phone: "09123456789",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(db.getTelegramUserByTelegramId).mockResolvedValue(mockUser);
    const caller = appRouter.createCaller(createPublicCtx());

    const result = await caller.telegramAuth.getUser({ telegramId: "123456789" });

    expect(result).toMatchObject({ telegramId: "123456789", name: "آرش صفری" });
  });
});

describe("consultation.submit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits a consultation and sends Telegram notification", async () => {
    vi.mocked(db.createConsultation).mockResolvedValue(undefined);
    vi.mocked(telegram.notifyAdminNewConsultation).mockResolvedValue(true);
    const caller = appRouter.createCaller(createPublicCtx());

    const result = await caller.consultation.submit({
      telegramId: "123456789",
      name: "آرش صفری",
      phone: "09123456789",
      topic: "gold",
      message: "سوال درباره طلا",
    });

    expect(result.success).toBe(true);
    expect(db.createConsultation).toHaveBeenCalledWith(
      expect.objectContaining({ name: "آرش صفری", topic: "gold" })
    );
    expect(telegram.notifyAdminNewConsultation).toHaveBeenCalledWith(
      expect.objectContaining({ name: "آرش صفری", topic: "gold" })
    );
  });

  it("returns consultation list for a telegram user", async () => {
    const mockConsultations = [
      {
        id: 1,
        telegramId: "123456789",
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
    const caller = appRouter.createCaller(createPublicCtx());

    const result = await caller.consultation.myList({ telegramId: "123456789" });

    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe("gold");
  });
});

describe("prices.getLive", () => {
  it("returns price data with required fields", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.prices.getLive() as any;

    expect(result).toHaveProperty("gold18");
    expect(result).toHaveProperty("usd");
    expect(result).toHaveProperty("eur");
    expect(result).toHaveProperty("coinEmami");
    expect(result).toHaveProperty("coinHalf");
    expect(result).toHaveProperty("coinQuarter");
    expect(result).toHaveProperty("goldOunce");
    expect(result.gold18).toHaveProperty("price");
    expect(result.gold18).toHaveProperty("change");
    expect(result.gold18).toHaveProperty("changePercent");
    expect(result).toHaveProperty("updatedAt");
    expect(result).toHaveProperty("source");
  });
});
