# Personal Travel Assistant

A private, single-user travel and inbox dashboard built for Rita. It pulls data directly from Gmail, surfaces upcoming trips with all confirmed transport bookings, flags missing return flights or unbooked legs, and organises important emails into two focused sections: Jobs and Other Important.

---

## What it does

**Travel command centre**
- Shows all upcoming trips with flights and trains grouped under each destination
- Flags missing transport bookings (e.g. no return flight found) as action items
- Surfaces urgent items in an "Action Required" panel on the dashboard home
- Keeps a full archive of past trips with their booking history

**Inbox digest**
- Jobs: LinkedIn job alerts, recruiter outreach, contract opportunities, and application updates
- Other Important: starred and flagged emails outside travel and jobs
- Manual sync button plus automatic background sync every 6 hours via Heartbeat

**Design**
- Editorial Didone serif aesthetic — Playfair Display headlines, DM Sans body text, cream background
- Single-user private access via Manus OAuth (only the account owner can log in)

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui |
| Backend | Express 4, tRPC 11 |
| Database | MySQL (TiDB) via Drizzle ORM |
| Auth | Manus OAuth |
| Email | Gmail via Manus MCP connector |
| Scheduling | Manus Heartbeat (6-hour Gmail sync) |
| Testing | Vitest (14 tests) |
| Hosting | Manus Autoscale |

---

## Project structure

```
client/
  src/
    pages/          Dashboard, UpcomingTrips, TripDetail, PastTrips, EmailFeed, Login
    components/     AppLayout, TravelUI (StatusBadge, BookingTypeIcon, TripCard)
    lib/trpc.ts     tRPC client binding
drizzle/
  schema.ts         trips, bookings, action_items, email_cache, sync_log tables
server/
  routers.ts        tRPC procedures (trips, bookings, actionItems, gmail)
  db.ts             Query helpers
  gmailSync.ts      Gmail scan and email classification logic
  setupHeartbeat.ts Registers the periodic sync job
  travel.test.ts    Vitest tests for all routers
```

---

## Data model

**Trips** — each destination with start and end dates and a status (upcoming, ongoing, past).

**Bookings** — individual transport or restaurant bookings linked to a trip. Status is one of `confirmed`, `pending`, or `missing`.

**Action Items** — urgent tasks surfaced on the dashboard. Types: `missing_booking`, `action_required`, `pending_confirmation`, `payment_due`.

**Email Cache** — non-travel important emails stored after each Gmail sync, tagged with a category (`jobs` or `other`).

---

## Running locally

This project is designed to run on the Manus platform and depends on Manus-managed environment variables (database, OAuth, Gmail connector, Heartbeat). It is not intended for standalone local development outside of the Manus sandbox.

If you are working inside the Manus sandbox:

```bash
pnpm install
pnpm dev
```

To run tests:

```bash
pnpm test
```

To push schema changes:

```bash
pnpm db:push
```

---

## Seeded trips (as of July 2026)

| Destination | Dates | Transport status |
|---|---|---|
| Amsterdam — Buurtcafé De Tros | 22 Jul 2026 | pending (time change unconfirmed) |
| Munich / Ettal (Bavaria) | 30 Jul — 5 Aug 2026 | confirmed both ways (DB train) |
| Lisbon | 1 Aug 2026 | outbound confirmed, return missing |
| Amsterdam — De Kas Dinner | 4 Sep 2026 | confirmed (two seatings) |

Past trips archived: Bilbao, Barcelona, London (Eurostar), Lisbon (January 2026).

---

## Action items at launch

1. Finalise payment for Transavia booking QL1VFR (payment reminder received 19 Jul)
2. Confirm time change at Buurtcafé De Tros from 20:00 to 19:00
3. Book return flight from Lisbon (only outbound NFILGT found in Gmail)
