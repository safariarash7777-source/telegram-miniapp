import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, telegramProcedure, telegramAdminProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getTelegramUserByTelegramId, createOrUpdateTelegramUser, promoteTelegramUserToAdmin,
  createConsultation, getConsultationsByTelegramId, getAllConsultations,
  getAnalyses, getAnalysisById, createAnalysis,
  getPortfolioByTelegramId, addPortfolioAsset, updatePortfolioAsset, deletePortfolioAsset,
} from "./db";
import { notifyAdminNewConsultation } from "./telegram";
import { verifyTelegramInitData, parseTelegramUser, isInitDataExpired } from "./telegram-verify";
import {
  TELEGRAM_SESSION_COOKIE, TELEGRAM_SESSION_MAX_AGE_MS,
  createTelegramSessionToken, isAdminTelegramId,
  type TelegramSession,
} from "./telegram-session";
import { getLivePrices } from "./price-service";
import { getCachedArashPosts } from "./channel-scraper";

async function buildSessionPayload(session: TelegramSession) {
  let profile = null;
  try {
    profile = (await getTelegramUserByTelegramId(session.telegramId)) ?? null;
  } catch (error) {
    // DB being down must not lock users out of the app shell.
    console.warn("[TelegramAuth] Could not load profile:", error);
  }
  return { telegramUser: session, profile };
}

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
    /**
     * The ONLY entry point into an authenticated Telegram session:
     * verifies initData signature server-side, then issues a signed
     * httpOnly session cookie. All protected procedures read the
     * telegramId from that cookie.
     */
    login: publicProcedure
      .input(z.object({ initData: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Bot token not configured" });
        }
        if (!verifyTelegramInitData(input.initData, botToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "داده‌های تلگرام معتبر نیستند" });
        }
        if (isInitDataExpired(input.initData)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "نشست تلگرام منقضی شده است؛ مینی‌اپ را دوباره باز کنید" });
        }
        const tgUser = parseTelegramUser(input.initData);
        if (!tgUser) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "اطلاعات کاربر تلگرام یافت نشد" });
        }

        const session: TelegramSession = {
          telegramId: String(tgUser.id),
          firstName: tgUser.first_name,
          lastName: tgUser.last_name,
          username: tgUser.username,
          isAdmin: isAdminTelegramId(String(tgUser.id)),
        };

        const token = await createTelegramSessionToken(session);
        if (!token) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در ایجاد نشست" });
        }
        ctx.res.cookie(TELEGRAM_SESSION_COOKIE, token, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: TELEGRAM_SESSION_MAX_AGE_MS,
        });

        if (session.isAdmin) {
          await promoteTelegramUserToAdmin(session.telegramId);
        }

        return buildSessionPayload(session);
      }),

    /**
     * Dev-only login for working outside Telegram. Hard-disabled in
     * production regardless of client behavior.
     */
    devLogin: publicProcedure.mutation(async ({ ctx }) => {
      if (process.env.NODE_ENV === "production") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Dev login is disabled in production" });
      }
      const session: TelegramSession = {
        telegramId: "999999999",
        firstName: "آرش",
        lastName: "صفری",
        username: "arash_safari_dev",
        isAdmin: true,
      };
      const token = await createTelegramSessionToken(session);
      if (token) {
        ctx.res.cookie(TELEGRAM_SESSION_COOKIE, token, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: TELEGRAM_SESSION_MAX_AGE_MS,
        });
      }
      return buildSessionPayload(session);
    }),

    /** Current Telegram session + registered profile (null when logged out). */
    session: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.telegramSession) return null;
      return buildSessionPayload(ctx.telegramSession);
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(TELEGRAM_SESSION_COOKIE, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    /** Complete profile (name + phone). Identity comes from the session. */
    registerUser: telegramProcedure
      .input(z.object({
        name: z.string().min(1),
        phone: z.string().min(10),
      }))
      .mutation(async ({ input, ctx }) => {
        const s = ctx.telegramSession;
        try {
          await createOrUpdateTelegramUser({
            telegramId: s.telegramId,
            firstName: s.firstName,
            lastName: s.lastName,
            username: s.username,
            name: input.name,
            phone: input.phone,
          });
          return { success: true, message: "کاربر با موفقیت ثبت شد" };
        } catch (error) {
          console.error("Error registering telegram user:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در ثبت کاربر" });
        }
      }),
  }),

  // ── Consultations ──────────────────────────────────────────────────────
  consultation: router({
    submit: telegramProcedure
      .input(z.object({
        name: z.string().min(1),
        phone: z.string().min(10),
        topic: z.enum(["gold", "stock", "currency", "portfolio", "other"]),
        message: z.string().max(4000).optional(),
        preferredDate: z.string().max(20).optional(),
        preferredTime: z.string().max(20).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const s = ctx.telegramSession;
        try {
          await createConsultation({
            telegramId: s.telegramId,
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
            telegramUsername: s.username,
          });

          // Webhook: copy lead to Supabase platform (fire-and-forget)
          const PLATFORM_URL = process.env.PLATFORM_WEBHOOK_URL || "https://portfolio-platform-fawn.vercel.app";
          fetch(`${PLATFORM_URL}/api/leads/webhook`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Webhook-Secret": process.env.PLATFORM_WEBHOOK_SECRET || "" },
            body: JSON.stringify({
              source: "miniapp",
              name: input.name,
              phone: input.phone,
              topic: input.topic,
              message: input.message || null,
              preferred_date: input.preferredDate || null,
              preferred_time: input.preferredTime || null,
              telegram_username: s.username || null,
              telegram_id: s.telegramId || null,
            }),
          }).catch(err => console.error("[Lead webhook] Failed:", err));

          return { success: true, message: "درخواست مشاوره شما با موفقیت ثبت شد. به زودی با شما تماس خواهیم گرفت." };
        } catch (error) {
          console.error("Failed to create consultation:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در ثبت درخواست مشاوره" });
        }
      }),

    myList: telegramProcedure.query(async ({ ctx }) => {
      try {
        return await getConsultationsByTelegramId(ctx.telegramSession.telegramId);
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در دریافت لیست مشاوره‌ها" });
      }
    }),

    // Admin: list all consultations (foundation for the admin panel)
    listAll: telegramAdminProcedure.query(async () => {
      try {
        return await getAllConsultations();
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در دریافت مشاوره‌ها" });
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

    create: telegramAdminProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        content: z.string().optional(),
        category: z.enum(["gold", "stock", "currency", "economy", "tech", "other"]),
        tags: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
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
    list: telegramProcedure.query(async ({ ctx }) => {
      try {
        return await getPortfolioByTelegramId(ctx.telegramSession.telegramId);
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در دریافت پرتفوی" });
      }
    }),

    addAsset: telegramProcedure
      .input(z.object({
        assetType: z.enum(["gold", "stock", "currency", "crypto", "other"]),
        name: z.string().min(1),
        quantity: z.string(),
        buyPrice: z.string(),
        currentPrice: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          await addPortfolioAsset({
            telegramId: ctx.telegramSession.telegramId,
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

    updateAsset: telegramProcedure
      .input(z.object({
        id: z.number(),
        currentPrice: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          await updatePortfolioAsset(input.id, ctx.telegramSession.telegramId, { currentPrice: input.currentPrice });
          return { success: true };
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطا در به‌روزرسانی دارایی" });
        }
      }),

    deleteAsset: telegramProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        try {
          await deletePortfolioAsset(input.id, ctx.telegramSession.telegramId);
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

  // ── Social / Channel Posts ─────────────────────────────────────────────
  social: router({
    getChannelPosts: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(20).default(8),
      }))
      .query(async ({ input }) => {
        try {
          return await getCachedArashPosts(input.limit);
        } catch (error) {
          console.error("[Social] Failed to fetch channel posts:", error);
          return [];
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
