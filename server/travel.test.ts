import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module so tests don't need a real database
vi.mock("./db", () => ({
  getAllTrips: vi.fn().mockResolvedValue([
    {
      id: 1,
      destination: "Munich / Ettal (Bavaria)",
      country: "Germany",
      dateStart: "2026-07-30",
      dateEnd: "2026-08-05",
      status: "upcoming",
      notes: "Train arrives Jul 30",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getUpcomingTrips: vi.fn().mockResolvedValue([
    {
      id: 1,
      destination: "Munich / Ettal (Bavaria)",
      country: "Germany",
      dateStart: "2026-07-30",
      dateEnd: "2026-08-05",
      status: "upcoming",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getPastTrips: vi.fn().mockResolvedValue([
    {
      id: 5,
      destination: "Bilbao",
      country: "Spain",
      dateStart: "2026-07-08",
      dateEnd: "2026-07-12",
      status: "past",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getTripById: vi.fn().mockImplementation(async (id: number) => {
    if (id === 1) {
      return {
        id: 1,
        destination: "Munich / Ettal (Bavaria)",
        country: "Germany",
        dateStart: "2026-07-30",
        dateEnd: "2026-08-05",
        status: "upcoming",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return undefined;
  }),
  getBookingsByTripId: vi.fn().mockResolvedValue([
    {
      id: 1,
      tripId: 1,
      type: "train",
      provider: "Deutsche Bahn",
      reference: "755841566102",
      routeOrProperty: "Amsterdam Centraal → München Hbf",
      dateTime: "2026-07-30T08:31",
      dateTimeEnd: "2026-07-30T15:40",
      status: "confirmed",
      notes: null,
      gmailThreadId: "19dff46ccd42fbfa",
      bookedOn: "2026-05-06",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getActiveActionItems: vi.fn().mockResolvedValue([
    {
      id: 1,
      tripId: 1,
      bookingId: null,
      priority: "high",
      type: "missing_booking",
      title: "Book Munich accommodation for Jul 30–31",
      detail: "Your train arrives Jul 30. No hotel found for those nights.",
      dismissed: false,
      userNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getAllActionItems: vi.fn().mockResolvedValue([]),
  dismissActionItem: vi.fn().mockResolvedValue(undefined),
  addNoteToActionItem: vi.fn().mockResolvedValue(undefined),
  getImportantEmails: vi.fn().mockResolvedValue([]),
  getLastSync: vi.fn().mockResolvedValue(null),
  updateBooking: vi.fn().mockResolvedValue(undefined),
  insertBooking: vi.fn().mockResolvedValue(undefined),
  insertTrip: vi.fn().mockResolvedValue(undefined),
  updateTrip: vi.fn().mockResolvedValue(undefined),
  insertActionItem: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getBookingByGmailThread: vi.fn().mockResolvedValue(undefined),
  upsertEmailCache: vi.fn().mockResolvedValue(undefined),
  insertSyncLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./gmailSync", () => ({
  runGmailSync: vi.fn().mockResolvedValue({ emailsProcessed: 5, newBookingsFound: 0, status: "success" }),
}));

function createOwnerContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: process.env.OWNER_OPEN_ID ?? "owner-test-id",
      email: "rita@example.com",
      name: "Rita",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createGuestContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("trips router", () => {
  it("blocks authenticated non-owner with FORBIDDEN", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 99,
        openId: "some-other-user-id",
        email: "other@example.com",
        name: "Other User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.trips.upcoming()).rejects.toThrow("owner access only");
  });

  it("returns upcoming trips for owner", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const trips = await caller.trips.upcoming();
    expect(Array.isArray(trips)).toBe(true);
    expect(trips.length).toBeGreaterThan(0);
    expect(trips[0].destination).toBe("Munich / Ettal (Bavaria)");
  });

  it("returns past trips for owner", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const trips = await caller.trips.past();
    expect(Array.isArray(trips)).toBe(true);
    expect(trips[0].status).toBe("past");
  });

  it("returns trip detail with bookings", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.trips.byId({ id: 1 });
    expect(result.trip.id).toBe(1);
    expect(Array.isArray(result.bookings)).toBe(true);
    expect(result.bookings[0].type).toBe("train");
  });

  it("throws NOT_FOUND for unknown trip id", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.trips.byId({ id: 9999 })).rejects.toThrow("Trip not found");
  });

  it("blocks non-owner access", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.trips.upcoming()).rejects.toThrow();
  });
});

describe("actionItems router", () => {
  it("returns active action items for owner", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const items = await caller.actionItems.active();
    expect(Array.isArray(items)).toBe(true);
    expect(items[0].priority).toBe("high");
  });

  it("dismisses an action item", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.actionItems.dismiss({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("adds a note to an action item", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.actionItems.addNote({ id: 1, note: "Checking Booking.com" });
    expect(result.success).toBe(true);
  });
});

describe("gmail router", () => {
  it("triggers sync and returns result", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.gmail.sync();
    expect(result.status).toBe("success");
    expect(typeof result.emailsProcessed).toBe("number");
  });

  it("returns important emails list", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const emails = await caller.gmail.importantEmails({ limit: 10 });
    expect(Array.isArray(emails)).toBe(true);
  });
});

describe("auth router", () => {
  it("returns null user when not authenticated", async () => {
    const ctx = createGuestContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });

  it("clears session cookie on logout", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
