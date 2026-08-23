import { bigint, boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** حساب المستخدم الأساسي الذي يدعم المصادقة. */
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

/** محادثة محفوظة وخطتها الأخيرة ضمن مساحة عمل المستخدم. */
export const plannerConversations = mysqlTable("plannerConversations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  workspaceId: varchar("workspaceId", { length: 64 }).notNull(),
  title: varchar("title", { length: 400 }).notNull(),
  messagesJson: text("messagesJson").notNull(),
  planJson: text("planJson"),
  status: mysqlEnum("status", ["draft", "planned", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** ذاكرة منتقاة للتفضيلات والقيود والعوائق والأنماط الناجحة. */
export const plannerMemories = mysqlTable("plannerMemories", {
  id: varchar("id", { length: 64 }).primaryKey(),
  workspaceId: varchar("workspaceId", { length: 64 }).notNull(),
  conversationId: varchar("conversationId", { length: 64 }),
  kind: mysqlEnum("kind", ["preference", "constraint", "obstacle", "success_pattern"]).notNull(),
  content: text("content").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** جلسة تركيز مرتبطة بخطوة، ويحدد وقت نهايتها الحقيقي استمرار العداد. */
export const plannerFocusSessions = mysqlTable("plannerFocusSessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  workspaceId: varchar("workspaceId", { length: 64 }).notNull(),
  conversationId: varchar("conversationId", { length: 64 }).notNull(),
  stepOrder: int("stepOrder").notNull(),
  stepTitle: varchar("stepTitle", { length: 400 }).notNull(),
  durationSeconds: int("durationSeconds").notNull(),
  startedAt: bigint("startedAt", { mode: "number" }).notNull(),
  endsAt: bigint("endsAt", { mode: "number" }).notNull(),
  status: mysqlEnum("status", ["running", "awaiting_reflection", "completed", "needs_replan", "cancelled"]).default("running").notNull(),
  obstacle: text("obstacle"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** إعداد واحد لكل مساحة عمل للتحكم بالقفل الصارم والاستمرار بين خطوات الخطة. */
export const plannerFocusModes = mysqlTable("plannerFocusModes", {
  workspaceId: varchar("workspaceId", { length: 64 }).primaryKey(),
  strictEndsAt: bigint("strictEndsAt", { mode: "number" }),
  continuePlan: boolean("continuePlan").default(false).notNull(),
  conversationId: varchar("conversationId", { length: 64 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlannerConversation = typeof plannerConversations.$inferSelect;
export type PlannerMemory = typeof plannerMemories.$inferSelect;
export type PlannerFocusSession = typeof plannerFocusSessions.$inferSelect;
export type PlannerFocusMode = typeof plannerFocusModes.$inferSelect;
