import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

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

// Trips — each represents a travel destination/journey
export const trips = mysqlTable("trips", {
  id: int("id").autoincrement().primaryKey(),
  destination: varchar("destination", { length: 256 }).notNull(),
  country: varchar("country", { length: 128 }),
  dateStart: varchar("dateStart", { length: 32 }), // ISO date string, may be partial
  dateEnd: varchar("dateEnd", { length: 32 }),
  status: mysqlEnum("status", ["upcoming", "past", "ongoing"]).default("upcoming").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = typeof trips.$inferInsert;

// Bookings — individual confirmed or missing bookings within a trip
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  type: mysqlEnum("type", ["flight", "train", "hotel", "car_rental", "restaurant", "other"]).notNull(),
  provider: varchar("provider", { length: 256 }),
  reference: varchar("reference", { length: 128 }),
  routeOrProperty: text("routeOrProperty"), // e.g. "AMS → LIS" or "Hotel Blaue Gams"
  dateTime: varchar("dateTime", { length: 64 }), // ISO string or partial
  dateTimeEnd: varchar("dateTimeEnd", { length: 64 }),
  status: mysqlEnum("status", ["confirmed", "pending", "missing"]).default("confirmed").notNull(),
  notes: text("notes"),
  gmailThreadId: varchar("gmailThreadId", { length: 128 }), // link back to source email
  bookedOn: varchar("bookedOn", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

// Action items — urgent tasks surfaced on the dashboard
export const actionItems = mysqlTable("action_items", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId"),
  bookingId: int("bookingId"),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).default("medium").notNull(),
  type: mysqlEnum("type", ["missing_booking", "action_required", "pending_confirmation", "payment_due"]).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  detail: text("detail"),
  dismissed: boolean("dismissed").default(false).notNull(),
  userNote: text("userNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = typeof actionItems.$inferInsert;

// Email cache — stores important/starred Gmail emails for the feed
export const emailCache = mysqlTable("email_cache", {
  id: int("id").autoincrement().primaryKey(),
  gmailMessageId: varchar("gmailMessageId", { length: 128 }).notNull().unique(),
  gmailThreadId: varchar("gmailThreadId", { length: 128 }),
  subject: text("subject"),
  fromAddress: text("fromAddress"),
  dateReceived: varchar("dateReceived", { length: 32 }),
  snippet: text("snippet"),
  isTravel: boolean("isTravel").default(false).notNull(),
  isImportant: boolean("isImportant").default(false).notNull(),
  isStarred: boolean("isStarred").default(false).notNull(),
  // Category for inbox grouping: 'jobs' | 'other'
  emailCategory: varchar("emailCategory", { length: 32 }).default("other").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailCache = typeof emailCache.$inferSelect;
export type InsertEmailCache = typeof emailCache.$inferInsert;

// Sync log — tracks the last Gmail sync timestamp
export const syncLog = mysqlTable("sync_log", {
  id: int("id").autoincrement().primaryKey(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  emailsProcessed: int("emailsProcessed").default(0),
  newBookingsFound: int("newBookingsFound").default(0),
  status: varchar("status", { length: 64 }).default("success"),
  errorMessage: text("errorMessage"),
});

export type SyncLog = typeof syncLog.$inferSelect;
