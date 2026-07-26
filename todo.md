# Rita Travel Dashboard — TODO

## Database & Backend
- [x] Define schema: trips, bookings, action_items, email_cache tables
- [x] Run migration and apply SQL
- [x] Seed structured trip data from Gmail extraction
- [x] tRPC router: trips.list, trips.get, trips.upcoming, trips.past
- [x] tRPC router: bookings.listByTrip
- [x] tRPC router: actionItems.list, actionItems.dismiss, actionItems.addNote
- [x] tRPC router: gmail.sync (re-scan inbox for travel emails)
- [x] tRPC router: gmail.importantEmails (starred/important non-travel emails)
- [x] Single-user auth guard: only Rita (owner) can access

## Frontend — Design System
- [x] Editorial Didone serif typography (Playfair Display + DM Sans)
- [x] Cream background, high-contrast palette, fine geometric lines
- [x] Global CSS variables and index.css theming
- [x] DashboardLayout with sidebar navigation

## Frontend — Pages
- [x] Dashboard home with "Action Required" panel
- [x] Upcoming trips timeline page
- [x] Per-trip detail view with all bookings and status badges
- [x] Missing bookings tracker with note/reminder capability
- [x] Past trips archive page
- [x] Important emails feed page

## Gmail Sync
- [x] Periodic Heartbeat job to re-scan Gmail for new travel confirmations
- [x] Parse and upsert new bookings into database

## Tests
- [x] Vitest: trips router
- [x] Vitest: actionItems router
- [x] Vitest: auth guard (owner-only)

## Gaps to Resolve
- [x] Add non-owner FORBIDDEN test to travel.test.ts
- [x] Tighten owner guard to OWNER_OPEN_ID only (admin role alone is not sufficient)

## Update: Transportation focus + Inbox categories
- [x] Remove hotel/accommodation missing bookings and action items from DB
- [x] Remove accommodation from missing-booking logic in gmailSync.ts
- [x] Add emailCategory field (jobs, other) to email_cache table
- [x] Update Gmail sync to classify job-related emails vs other important
- [x] Split Inbox page into Jobs and Other Important sections
- [x] Update action items to only flag missing transportation (flights, trains)
