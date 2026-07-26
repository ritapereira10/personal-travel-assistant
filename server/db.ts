import { and, desc, eq, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, trips, bookings, actionItems, emailCache, syncLog } from "../drizzle/schema";
import type { InsertTrip, InsertBooking, InsertActionItem, InsertEmailCache } from "../drizzle/schema";
import { ENV } from "./_core/env";

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

// ── Users ──────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Trips ──────────────────────────────────────────────────────────────────

export async function getAllTrips() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trips).orderBy(desc(trips.dateStart));
}

export async function getUpcomingTrips() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(trips)
    .where(or(eq(trips.status, "upcoming"), eq(trips.status, "ongoing")))
    .orderBy(trips.dateStart);
}

export async function getPastTrips() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(trips)
    .where(eq(trips.status, "past"))
    .orderBy(desc(trips.dateStart));
}

export async function getTripById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function insertTrip(trip: InsertTrip) {
  const db = await getDb();
  if (!db) return;
  return db.insert(trips).values(trip);
}

export async function updateTrip(id: number, data: Partial<InsertTrip>) {
  const db = await getDb();
  if (!db) return;
  return db.update(trips).set(data).where(eq(trips.id, id));
}

// ── Bookings ───────────────────────────────────────────────────────────────

export async function getBookingsByTripId(tripId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bookings).where(eq(bookings.tripId, tripId)).orderBy(bookings.dateTime);
}

export async function insertBooking(booking: InsertBooking) {
  const db = await getDb();
  if (!db) return;
  return db.insert(bookings).values(booking);
}

export async function updateBooking(id: number, data: Partial<InsertBooking>) {
  const db = await getDb();
  if (!db) return;
  return db.update(bookings).set(data).where(eq(bookings.id, id));
}

export async function getBookingByGmailThread(threadId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(bookings)
    .where(eq(bookings.gmailThreadId, threadId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Action Items ───────────────────────────────────────────────────────────

export async function getActiveActionItems() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(actionItems)
    .where(eq(actionItems.dismissed, false))
    .orderBy(actionItems.priority, actionItems.createdAt);
}

export async function getAllActionItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(actionItems).orderBy(actionItems.priority, actionItems.createdAt);
}

export async function dismissActionItem(id: number) {
  const db = await getDb();
  if (!db) return;
  return db.update(actionItems).set({ dismissed: true }).where(eq(actionItems.id, id));
}

export async function addNoteToActionItem(id: number, note: string) {
  const db = await getDb();
  if (!db) return;
  return db.update(actionItems).set({ userNote: note }).where(eq(actionItems.id, id));
}

export async function insertActionItem(item: InsertActionItem) {
  const db = await getDb();
  if (!db) return;
  return db.insert(actionItems).values(item);
}

// ── Email Cache ────────────────────────────────────────────────────────────

export async function getImportantEmails(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(emailCache)
    .where(and(eq(emailCache.isImportant, true), eq(emailCache.isTravel, false)))
    .orderBy(desc(emailCache.dateReceived))
    .limit(limit);
}

export async function upsertEmailCache(email: InsertEmailCache) {
  const db = await getDb();
  if (!db) return;
  return db
    .insert(emailCache)
    .values(email)
    .onDuplicateKeyUpdate({
      set: {
        subject: email.subject,
        snippet: email.snippet,
        isImportant: email.isImportant,
        isStarred: email.isStarred,
        isTravel: email.isTravel,
      },
    });
}

// ── Sync Log ───────────────────────────────────────────────────────────────

export async function getLastSync() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(syncLog).orderBy(desc(syncLog.syncedAt)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function insertSyncLog(data: {
  emailsProcessed: number;
  newBookingsFound: number;
  status: string;
  errorMessage?: string;
}) {
  const db = await getDb();
  if (!db) return;
  return db.insert(syncLog).values({
    emailsProcessed: data.emailsProcessed,
    newBookingsFound: data.newBookingsFound,
    status: data.status,
    errorMessage: data.errorMessage ?? null,
  });
}
