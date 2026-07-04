import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Telegram users table
export const telegramUsers = mysqlTable("telegram_users", {
  id: int("id").autoincrement().primaryKey(),
  telegramId: varchar("telegramId", { length: 64 }).notNull().unique(),
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }),
  username: varchar("username", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TelegramUser = typeof telegramUsers.$inferSelect;
export type InsertTelegramUser = typeof telegramUsers.$inferInsert;

// Consultations table
export const consultations = mysqlTable("consultations", {
  id: int("id").autoincrement().primaryKey(),
  telegramId: varchar("telegramId", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  topic: mysqlEnum("topic", ["gold", "stock", "currency", "portfolio", "other"]).notNull(),
  message: text("message"),
  preferredDate: varchar("preferredDate", { length: 20 }),
  preferredTime: varchar("preferredTime", { length: 20 }),
  status: mysqlEnum("status", ["pending", "confirmed", "completed", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = typeof consultations.$inferInsert;

// Economic analyses table
export const analyses = mysqlTable("analyses", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  content: text("content"),
  category: mysqlEnum("category", ["gold", "stock", "currency", "economy", "tech", "other"]).notNull(),
  tags: varchar("tags", { length: 500 }),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;

// Portfolio assets table
export const portfolioAssets = mysqlTable("portfolio_assets", {
  id: int("id").autoincrement().primaryKey(),
  telegramId: varchar("telegramId", { length: 64 }).notNull(),
  assetType: mysqlEnum("assetType", ["gold", "stock", "currency", "crypto", "other"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 6 }).notNull(),
  buyPrice: decimal("buyPrice", { precision: 18, scale: 2 }).notNull(),
  currentPrice: decimal("currentPrice", { precision: 18, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortfolioAsset = typeof portfolioAssets.$inferSelect;
export type InsertPortfolioAsset = typeof portfolioAssets.$inferInsert;
