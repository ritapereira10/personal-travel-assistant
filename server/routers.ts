import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getAllTrips,
  getUpcomingTrips,
  getPastTrips,
  getTripById,
  getBookingsByTripId,
  getActiveActionItems,
  getAllActionItems,
  dismissActionItem,
  addNoteToActionItem,
  getImportantEmails,
  getEmailsByCategory,
  getLastSync,
  updateBooking,
  insertBooking,
  insertTrip,
  updateTrip,
  insertActionItem,
} from "./db";
import { runGmailSync } from "./gmailSync";
import { ENV } from "./_core/env";

// Owner-only guard: only Rita (the owner identified by OWNER_OPEN_ID) can access any data
const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Private dashboard — owner access only." });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Trips ────────────────────────────────────────────────────────────────
  trips: router({
    all: ownerProcedure.query(async () => {
      return getAllTrips();
    }),

    upcoming: ownerProcedure.query(async () => {
      return getUpcomingTrips();
    }),

    past: ownerProcedure.query(async () => {
      return getPastTrips();
    }),

    byId: ownerProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const trip = await getTripById(input.id);
        if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found." });
        const bookings = await getBookingsByTripId(input.id);
        return { trip, bookings };
      }),

    updateNotes: ownerProcedure
      .input(z.object({ id: z.number(), notes: z.string() }))
      .mutation(async ({ input }) => {
        await updateTrip(input.id, { notes: input.notes });
        return { success: true };
      }),
  }),

  // ── Bookings ─────────────────────────────────────────────────────────────
  bookings: router({
    byTrip: ownerProcedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ input }) => {
        return getBookingsByTripId(input.tripId);
      }),

    updateStatus: ownerProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["confirmed", "pending", "missing"]),
        })
      )
      .mutation(async ({ input }) => {
        await updateBooking(input.id, { status: input.status });
        return { success: true };
      }),

    updateNotes: ownerProcedure
      .input(z.object({ id: z.number(), notes: z.string() }))
      .mutation(async ({ input }) => {
        await updateBooking(input.id, { notes: input.notes });
        return { success: true };
      }),

    add: ownerProcedure
      .input(
        z.object({
          tripId: z.number(),
          type: z.enum(["flight", "train", "hotel", "car_rental", "restaurant", "other"]),
          provider: z.string().optional(),
          reference: z.string().optional(),
          routeOrProperty: z.string().optional(),
          dateTime: z.string().optional(),
          status: z.enum(["confirmed", "pending", "missing"]).default("confirmed"),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await insertBooking(input);
        return { success: true };
      }),
  }),

  // ── Action Items ──────────────────────────────────────────────────────────
  actionItems: router({
    active: ownerProcedure.query(async () => {
      return getActiveActionItems();
    }),

    all: ownerProcedure.query(async () => {
      return getAllActionItems();
    }),

    dismiss: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await dismissActionItem(input.id);
        return { success: true };
      }),

    addNote: ownerProcedure
      .input(z.object({ id: z.number(), note: z.string() }))
      .mutation(async ({ input }) => {
        await addNoteToActionItem(input.id, input.note);
        return { success: true };
      }),

    add: ownerProcedure
      .input(
        z.object({
          tripId: z.number().optional(),
          priority: z.enum(["high", "medium", "low"]).default("medium"),
          type: z.enum(["missing_booking", "action_required", "pending_confirmation", "payment_due"]),
          title: z.string(),
          detail: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await insertActionItem(input);
        return { success: true };
      }),
  }),

  // ── Gmail ─────────────────────────────────────────────────────────────────
  gmail: router({
    importantEmails: ownerProcedure
      .input(z.object({ limit: z.number().default(30) }).optional())
      .query(async ({ input }) => {
        return getImportantEmails(input?.limit ?? 30);
      }),

    emailsByCategory: ownerProcedure
      .input(z.object({ category: z.enum(["jobs", "other"]), limit: z.number().default(30) }))
      .query(async ({ input }) => {
        return getEmailsByCategory(input.category, input.limit);
      }),

    lastSync: ownerProcedure.query(async () => {
      return getLastSync();
    }),

    sync: ownerProcedure.mutation(async () => {
      const result = await runGmailSync();
      return result;
    }),
  }),
});

export type AppRouter = typeof appRouter;
