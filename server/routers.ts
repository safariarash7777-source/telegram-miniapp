import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  upsertUser, getUserByOpenId,
  getTelegramUserByTelegramId, createOrUpdateTelegramUser,
  createConsultation, getConsultationsByTelegramId, getAllConsultations,
  getAnalyses, getAnalysisById, createAnalysis,
  getPortfolioByTelegramId, addPortfolioAsset, updatePortfolioAsset, deletePortfolioAsset,
} from "./db";
import { notifyAdminNewConsultation } from "./telegram";
import { verifyTelegramInitData, parseTelegramUser, isInitDataExpired } from "./telegram-verify";
import { getLivePrices } from "./price-service";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Telegram Auth ──────────────────────────────────────────────────────
  telegramAuth: router({
    registerUser: publicProcedure
      .input(z.object({
        telegramId: z.string(),
        firstName: z.string(),
        lastName: z.string().optional(),
        username: z.string().optional(),
        name: z.string().min(1),
        phone: z.string().min(10),
      }))
      .mutation(async ({ input }) => {
        try {
          await createOrUpdateTelegramUser({
            telegramId: input.telegramId,
            firstName: input.firstName,
            lastName: input.lastName,
            username: input.username,
            name: input.name,
            phone: input.phone,
          });
          return { success: true, message: "کاربر با موفقیت ثبت شد" };
        } catch (error) {
          console.error("Error registering telegram user:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در ثبت کاربر" });
        }
      }),

    getUser: publicProcedure
      .input(z.object({ telegramId: z.string() }))
      .query(async ({ input }) => {
        try {
          const user = await getTelegramUserByTelegramId(input.telegramId);
          return user ?? null;
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در دریافت کاربر" });
        }
      }),

    // Verify Telegram WebApp initData on the server side (production security)
    verifyInitData: publicProcedure
      .input(z.object({ initData: z.string() }))
      .mutation(async ({ input }) => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
          // In dev mode without bot token, skip verification
          if (process.env.NODE_ENV === "development") {
            return { valid: true, user: null, dev: true };
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Bot token not configured" });
        }
        const isValid = verifyTelegramInitData(input.initData, botToken);
        if (!isValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "داده‌های تلگرام معتبر نیستند" });
        }
        if (isInitDataExpired(input.initData)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "نشست تلگرام منقضی شده است" });
        }
        const user = parseTelegramUser(input.initData);
        return { valid: true, user, dev: false };
      }),
  }),

  // ── Consultations ──────────────────────────────────────────────────────
  consultation: router({
    submit: publicProcedure
      .input(z.object({
        telegramId: z.string().optional(),
        name: z.string().min(1),
        phone: z.string().min(10),
        topic: z.enum(["gold", "stock", "currency", "portfolio", "other"]),
        message: z.string().optional(),
        preferredDate: z.string().optional(),
        preferredTime: z.string().optional(),
        telegramUsername: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          await createConsultation({
            telegramId: input.telegramId,
            name: input.name,
            phone: input.phone,
            topic: input.topic,
            message: input.message,
            preferredDate: input.preferredDate,
            preferredTime: input.preferredTime,
          });

          // Send Telegram notification to Arash Safari
          await notifyAdminNewConsultation({
            name: input.name,
            phone: input.phone,
            topic: input.topic,
            message: input.message,
            preferredDate: input.preferredDate,
            preferredTime: input.preferredTime,
            telegramUsername: input.telegramUsername,
          });

          return { success: true, message: "درخواست مشاوره شما با موفقیت ثبت شد. به زودی با شما تماس خواهیم گرفت." };
        } catch (error) {
          console.error("Failed to create consultation:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در ثبت درخواست مشاوره" });
        }
      }),

    myList: publicProcedure
      .input(z.object({ telegramId: z.string() }))
      .query(async ({ input }) => {
        try {
          return await getConsultationsByTelegramId(input.telegramId);
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در دریافت لیست مشاوره‌ها" });
        }
      }),
  }),

  // ── Analyses ──────────────────────────────────────────────────────────
  analysis: router({
    list: publicProcedure
      .input(z.object({ category: z.string().optional(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        try {
          const results = await getAnalyses(input.category);
          return input.limit ? results.slice(0, input.limit) : results;
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در دریافت تحلیل‌ها" });
        }
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        try {
          return await getAnalysisById(input.id);
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در دریافت تحلیل" });
        }
      }),

    // Admin-only: create a new analysis
    create: publicProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        content: z.string().optional(),
        category: z.enum(["gold", "stock", "currency", "economy", "tech", "other"]),
        tags: z.string().optional(),
        adminSecret: z.string(), // Simple admin secret for now
      }))
      .mutation(async ({ input }) => {
        // Verify admin secret
        const adminSecret = process.env.ADMIN_SECRET ?? "arash-safari-admin";
        if (input.adminSecret !== adminSecret) {
          throw new TRPCError({ code: "FORBIDDEN", message: "دسترسی مجاز نیست" });
        }
        try {
          await createAnalysis({
            title: input.title,
            description: input.description,
            content: input.content,
            category: input.category,
            tags: input.tags,
          });
          return { success: true, message: "تحلیل با موفقیت ایجاد شد" };
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در ایجاد تحلیل" });
        }
      }),
  }),

  // ── Portfolio ──────────────────────────────────────────────────────────
  portfolio: router({
    getByTelegramId: publicProcedure
      .input(z.object({ telegramId: z.string() }))
      .query(async ({ input }) => {
        try {
          return await getPortfolioByTelegramId(input.telegramId);
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در دریافت پرتفوی" });
        }
      }),

    addAsset: publicProcedure
      .input(z.object({
        telegramId: z.string(),
        assetType: z.enum(["gold", "stock", "currency", "crypto", "other"]),
        name: z.string().min(1),
        quantity: z.string(),
        buyPrice: z.string(),
        currentPrice: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          await addPortfolioAsset({
            telegramId: input.telegramId,
            assetType: input.assetType,
            name: input.name,
            quantity: input.quantity,
            buyPrice: input.buyPrice,
            currentPrice: input.currentPrice,
          });
          return { success: true };
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در افزودن دارایی" });
        }
      }),

    updateAsset: publicProcedure
      .input(z.object({
        id: z.number(),
        currentPrice: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          await updatePortfolioAsset(input.id, { currentPrice: input.currentPrice });
          return { success: true };
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در به‌روزرسانی دارایی" });
        }
      }),

    deleteAsset: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        try {
          await deletePortfolioAsset(input.id);
          return { success: true };
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در حذف دارایی" });
        }
      }),
  }),

  // ── Market Prices (proxy) ──────────────────────────────────────────────
  prices: router({
    getLive: publicProcedure.query(async () => {
      return await getLivePrices();
    }),
  }),
});

export type AppRouter = typeof appRouter;

// ── Helpers ────────────────────────────────────────────────────────────────

async function fetchLivePrices() {
  // Fetch from TGJU (trusted Iranian financial data source)
  const symbols = ["geram18", "price_dollar_rl", "price_eur", "tedpix"];
  const results: Record<string, { price: number; change: number; changePercent: number }> = {};

  try {
    const response = await fetch(
      "https://api.tgju.org/v1/market/indicator/summary-table-data/price_dollar_rl,price_eur,geram18,tedpix",
      {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) throw new Error(`TGJU API error: ${response.status}`);
    const data = await response.json();

    const rows = data?.data ?? [];
    for (const row of rows) {
      const symbol = row[0];
      const price = parseFloat((row[2] ?? "0").replace(/,/g, ""));
      const changePercent = parseFloat(row[6] ?? "0");
      const change = parseFloat((row[5] ?? "0").replace(/,/g, ""));

      if (symbol === "geram18") results.gold = { price, change, changePercent };
      else if (symbol === "price_dollar_rl") results.usd = { price, change, changePercent };
      else if (symbol === "price_eur") results.eur = { price, change, changePercent };
      else if (symbol === "tedpix") results.bourse = { price, change, changePercent };
    }

    if (Object.keys(results).length >= 3) {
      return {
        gold: results.gold ?? getFallbackPrices().gold,
        usd: results.usd ?? getFallbackPrices().usd,
        eur: results.eur ?? getFallbackPrices().eur,
        bourse: results.bourse ?? getFallbackPrices().bourse,
        updatedAt: new Date().toISOString(),
        source: "live",
      };
    }
  } catch (err) {
    console.warn("[Prices] TGJU API failed, using fallback:", err);
  }

  return getFallbackPrices();
}

function getFallbackPrices() {
  return {
    gold: { price: 6850000, change: 25000, changePercent: 0.37 },
    usd: { price: 921000, change: -3000, changePercent: -0.32 },
    eur: { price: 1015000, change: 5000, changePercent: 0.50 },
    bourse: { price: 3850000, change: 45000, changePercent: 1.18 },
    updatedAt: new Date().toISOString(),
    source: "fallback",
  };
}

function getSampleAnalyses() {
  return [
    {
      id: 1,
      title: "تحلیل بازار طلا در شرایط آتش‌بس",
      description: "بررسی تاثیر شرایط سیاسی بر قیمت طلا و پیش‌بینی روند بازار در ماه‌های آینده",
      content: "با توجه به شرایط ژئوپلیتیک جهانی، بازار طلا در وضعیت حساسی قرار دارد...",
      category: "gold" as const,
      tags: "#طلا #سیاسی #احتمالات",
      publishedAt: new Date("2024-07-13"),
      createdAt: new Date("2024-07-13"),
      updatedAt: new Date("2024-07-13"),
    },
    {
      id: 2,
      title: "تحلیل شاخص بورس ایران",
      description: "نقطه‌نظر بر روند بورس و فرصت‌های سرمایه‌گذاری در بخش‌های مختلف",
      content: "شاخص کل بورس در محدوده حمایتی مهمی قرار گرفته است...",
      category: "stock" as const,
      tags: "#بورس #سهام #سرمایه‌گذاری",
      publishedAt: new Date("2024-07-12"),
      createdAt: new Date("2024-07-12"),
      updatedAt: new Date("2024-07-12"),
    },
    {
      id: 3,
      title: "وضعیت نرخ ارز و تاثیر آن بر اقتصاد",
      description: "تحلیل نرخ دلار و یورو و پیامدهای آن برای سرمایه‌گذاران",
      content: "نرخ دلار در محدوده ۹۲ هزار تومان تثبیت شده است...",
      category: "currency" as const,
      tags: "#ارز #دلار #یورو",
      publishedAt: new Date("2024-07-11"),
      createdAt: new Date("2024-07-11"),
      updatedAt: new Date("2024-07-11"),
    },
    {
      id: 4,
      title: "هوش مصنوعی و کاربردهایش در بیزنس",
      description: "بررسی فرصت‌های موجود برای استفاده از AI در تصمیم‌گیری‌های مالی",
      content: "هوش مصنوعی به سرعت در حال تغییر چشم‌انداز سرمایه‌گذاری است...",
      category: "tech" as const,
      tags: "#AI #فناوری #بیزنس",
      publishedAt: new Date("2024-07-10"),
      createdAt: new Date("2024-07-10"),
      updatedAt: new Date("2024-07-10"),
    },
    {
      id: 5,
      title: "چشم‌انداز اقتصاد کلان ایران",
      description: "بررسی شاخص‌های اقتصاد کلان و تاثیر آن‌ها بر بازارهای مالی",
      content: "تورم و نرخ بهره دو عامل کلیدی در تصمیم‌گیری‌های سرمایه‌گذاری هستند...",
      category: "economy" as const,
      tags: "#اقتصاد #تورم #کلان",
      publishedAt: new Date("2024-07-09"),
      createdAt: new Date("2024-07-09"),
      updatedAt: new Date("2024-07-09"),
    },
  ];
}
