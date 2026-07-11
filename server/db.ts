import { and, eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  telegramUsers, InsertTelegramUser,
  consultations, InsertConsultation,
  analyses, InsertAnalysis,
  portfolioAssets, InsertPortfolioAsset,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── Users (Manus OAuth) ─────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Telegram Users ──────────────────────────────────────────────────────────
export async function getTelegramUserByTelegramId(telegramId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get telegram user: database not available"); return undefined; }
  try {
    const result = await db.select().from(telegramUsers).where(eq(telegramUsers.telegramId, telegramId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get telegram user:", error);
    throw error;
  }
}

export async function createOrUpdateTelegramUser(data: InsertTelegramUser) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot create telegram user: database not available"); return; }
  try {
    await db.insert(telegramUsers).values(data).onDuplicateKeyUpdate({
      set: {
        name: data.name,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[Database] Failed to create/update telegram user:", error);
    throw error;
  }
}

/** Promote a registered telegram user to admin (idempotent). */
export async function promoteTelegramUserToAdmin(telegramId: string) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(telegramUsers)
      .set({ role: "admin" })
      .where(eq(telegramUsers.telegramId, telegramId));
  } catch (error) {
    console.error("[Database] Failed to promote telegram user:", error);
  }
}

// ── Consultations ───────────────────────────────────────────────────────────
export async function createConsultation(data: InsertConsultation) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot create consultation: database not available"); return undefined; }
  try {
    const result = await db.insert(consultations).values(data);
    return result;
  } catch (error) {
    console.error("[Database] Failed to create consultation:", error);
    throw error;
  }
}

export async function getConsultationsByTelegramId(telegramId: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(consultations)
      .where(eq(consultations.telegramId, telegramId))
      .orderBy(desc(consultations.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get consultations:", error);
    throw error;
  }
}

export async function getAllConsultations() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(consultations).orderBy(desc(consultations.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get all consultations:", error);
    throw error;
  }
}

// ── Analyses ────────────────────────────────────────────────────────────────
export async function getAnalyses(category?: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    if (category && category !== "all") {
      return await db.select().from(analyses)
        .where(eq(analyses.category, category as any))
        .orderBy(desc(analyses.publishedAt));
    }
    return await db.select().from(analyses).orderBy(desc(analyses.publishedAt));
  } catch (error) {
    console.error("[Database] Failed to get analyses:", error);
    throw error;
  }
}

export async function getAnalysisById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get analysis:", error);
    throw error;
  }
}

export async function createAnalysis(data: InsertAnalysis) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    return await db.insert(analyses).values(data);
  } catch (error) {
    console.error("[Database] Failed to create analysis:", error);
    throw error;
  }
}

// ── Portfolio Assets ────────────────────────────────────────────────────────
export async function getPortfolioByTelegramId(telegramId: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(portfolioAssets)
      .where(eq(portfolioAssets.telegramId, telegramId))
      .orderBy(desc(portfolioAssets.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get portfolio:", error);
    throw error;
  }
}

export async function addPortfolioAsset(data: InsertPortfolioAsset) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    return await db.insert(portfolioAssets).values(data);
  } catch (error) {
    console.error("[Database] Failed to add portfolio asset:", error);
    throw error;
  }
}

// Ownership-scoped: the WHERE clause pins the row to the owner's telegramId,
// so one user can never touch another user's assets by guessing numeric ids.
export async function updatePortfolioAsset(id: number, telegramId: string, data: Partial<InsertPortfolioAsset>) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    return await db.update(portfolioAssets)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(portfolioAssets.id, id), eq(portfolioAssets.telegramId, telegramId)));
  } catch (error) {
    console.error("[Database] Failed to update portfolio asset:", error);
    throw error;
  }
}

export async function deletePortfolioAsset(id: number, telegramId: string) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    return await db.delete(portfolioAssets)
      .where(and(eq(portfolioAssets.id, id), eq(portfolioAssets.telegramId, telegramId)));
  } catch (error) {
    console.error("[Database] Failed to delete portfolio asset:", error);
    throw error;
  }
}
