import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Clear existing seed data
await connection.execute("DELETE FROM action_items");
await connection.execute("DELETE FROM bookings");
await connection.execute("DELETE FROM trips");

// Insert trips
const [upcomingTrips] = await connection.execute(`
  INSERT INTO trips (destination, country, dateStart, dateEnd, status, notes) VALUES
  ('Munich / Ettal (Bavaria)', 'Germany', '2026-07-30', '2026-08-05', 'upcoming', 'Train arrives Munich Jul 30 at 15:40. Hotel Blaue Gams in Ettal from Aug 1. Two nights in Munich unaccounted for.'),
  ('Lisbon', 'Portugal', '2026-08-01', NULL, 'upcoming', 'Flight NF1LGT confirmed. Forwarded to Josephine. Hotel not yet booked.'),
  ('Amsterdam — De Kas Dinner', 'Netherlands', '2026-09-04', '2026-09-04', 'upcoming', 'Two De Kas reservations: 13:00 lunch and 21:00 dinner, both for 4 people.'),
  ('Amsterdam — Buurtcafé De Tros', 'Netherlands', '2026-07-22', '2026-07-22', 'upcoming', 'Time change to 19:00 requested on Jul 20. Awaiting confirmation.'),
  ('Bilbao', 'Spain', '2026-07-08', '2026-07-12', 'past', 'Return from Bilbao to Amsterdam on Jul 12 via Vueling.'),
  ('Barcelona', 'Spain', '2026-07-02', '2026-07-07', 'past', 'Trip to Barcelona Jul 2 via Vueling AMS-BCN.'),
  ('London / Eurostar', 'United Kingdom', '2026-04-01', '2026-04-04', 'past', 'Eurostar journey back to Amsterdam Apr 4. NS International booking CWMQKPW.'),
  ('Lisbon (January)', 'Portugal', '2026-01-25', '2026-01-30', 'past', 'Transavia booking ICLJNZ.')
`);

// Get inserted trip IDs
const [tripRows] = await connection.execute("SELECT id, destination FROM trips ORDER BY id ASC");
const tripMap = {};
for (const row of tripRows) {
  tripMap[row.destination] = row.id;
}

const munichId = tripMap['Munich / Ettal (Bavaria)'];
const lisbonUpcomingId = tripMap['Lisbon'];
const dekasId = tripMap['Amsterdam — De Kas Dinner'];
const trosId = tripMap['Amsterdam — Buurtcafé De Tros'];
const bilbaoId = tripMap['Bilbao'];
const barcelonaId = tripMap['Barcelona'];
const londonId = tripMap['London / Eurostar'];
const lisbonPastId = tripMap['Lisbon (January)'];

// Insert bookings
await connection.execute(`
  INSERT INTO bookings (tripId, type, provider, reference, routeOrProperty, dateTime, dateTimeEnd, status, notes, gmailThreadId, bookedOn) VALUES
  -- Munich / Ettal trip
  (${munichId}, 'train', 'Deutsche Bahn', '755841566102', 'Amsterdam Centraal → München Hbf', '2026-07-30T08:31', '2026-07-30T15:40', 'confirmed', 'ICE 225, 2nd class Sparpreis Europa. Seat: Wg. 23, Pl. 36. Ticket code P3G08ED7.', '19dff46ccd42fbfa', '2026-05-06'),
  (${munichId}, 'train', 'Deutsche Bahn', '755841566102', 'München Hbf → Amsterdam Centraal', '2026-08-05', NULL, 'confirmed', 'Return ticket included in same order 755841566102.', '19dff46ccd42fbfa', '2026-05-06'),
  (${munichId}, 'hotel', 'Booking.com', '6502849469', 'Hotel Blaue Gams ***S — Ettal, Bavaria', '2026-08-01', '2026-08-05', 'confirmed', 'PIN: 0837. Check-in Aug 1.', '19e28279467a2847', '2026-05-14'),
  (${munichId}, 'hotel', NULL, NULL, 'Munich accommodation (Jul 30–31)', '2026-07-30', '2026-08-01', 'missing', 'Two nights in Munich before Ettal hotel starts. No booking found.', NULL, NULL),

  -- Lisbon upcoming
  (${lisbonUpcomingId}, 'flight', 'Transavia', 'NF1LGT', 'AMS → LIS', '2026-08-01', NULL, 'confirmed', 'Booking confirmed Apr 13. Forwarded to Josephine.', '19d882b005e8e21a', '2026-04-13'),
  (${lisbonUpcomingId}, 'hotel', NULL, NULL, 'Lisbon accommodation', NULL, NULL, 'missing', 'No hotel booking found in email for this trip.', NULL, NULL),
  (${lisbonUpcomingId}, 'flight', NULL, NULL, 'LIS → AMS (return)', NULL, NULL, 'missing', 'No return flight or train found in email.', NULL, NULL),

  -- De Kas dinner
  (${dekasId}, 'restaurant', 'Restaurant De Kas', NULL, 'Restaurant De Kas — Amsterdam', '2026-09-04T13:00', NULL, 'confirmed', 'Lunch for 4 people at 13:00.', '19ecb43f56b631ed', '2026-06-15'),
  (${dekasId}, 'restaurant', 'Restaurant De Kas', NULL, 'Restaurant De Kas — Amsterdam', '2026-09-04T21:00', NULL, 'confirmed', 'Dinner for 4 people at 21:00.', '19ecbe922d4be861', '2026-06-15'),

  -- Buurtcafé De Tros
  (${trosId}, 'restaurant', 'Buurtcafé De Tros', NULL, 'Buurtcafé De Tros — Amsterdam', '2026-07-22T20:00', NULL, 'pending', 'Original booking 20:00. Time change to 19:00 requested Jul 20. Awaiting confirmation.', '19efe67200436d2a', '2026-06-25'),

  -- Bilbao (past)
  (${bilbaoId}, 'flight', 'Vueling', 'DKC18G', 'BIO → AMS', '2026-07-12', NULL, 'confirmed', 'Boarding passes were ready Jul 11.', '19f50f78a13fb32f', '2026-06-30'),

  -- Barcelona (past)
  (${barcelonaId}, 'flight', 'Vueling', 'FFRC4S', 'AMS → BCN', '2026-07-02', NULL, 'confirmed', 'Booked Jan 31. Forwarded to Josephine Jun 29.', NULL, '2026-01-31'),

  -- London (past)
  (${londonId}, 'train', 'Eurostar', 'MMKCR7', 'London → Amsterdam Centraal', '2026-04-04', NULL, 'confirmed', '1 passenger. Ticket for RITA PEREIRA.', '19d5841e1ecf8018', '2026-04-04'),
  (${londonId}, 'train', 'NS International', 'CWMQKPW', 'International journey to Amsterdam', '2026-04-04', NULL, 'confirmed', 'Booked Oct 29, 2025.', '19d5416c0dba9490', '2025-10-29'),

  -- Lisbon past
  (${lisbonPastId}, 'flight', 'Transavia', 'ICLJNZ', 'AMS → LIS', '2026-01-25', NULL, 'confirmed', 'Booking ICLJNZ.', '19bf5e8bc8a12721', '2026-01-25')
`);

// Insert action items
await connection.execute(`
  INSERT INTO action_items (tripId, priority, type, title, detail, dismissed) VALUES
  (${munichId}, 'high', 'missing_booking', 'Book Munich accommodation for Jul 30–31', 'Your train arrives München Hbf on Jul 30 at 15:40. Hotel Blaue Gams in Ettal only starts Aug 1. Two nights in Munich are unaccounted for.', false),
  (${lisbonUpcomingId}, 'high', 'missing_booking', 'Book hotel for Lisbon trip', 'Flight NF1LGT to Lisbon is confirmed but no hotel booking found in your email.', false),
  (NULL, 'high', 'payment_due', 'Finalise payment for Transavia booking QL1VFR', 'Transavia sent a payment reminder on Jul 19. Booking QL1VFR (trip to Amsterdam) may not be fully paid yet.', false),
  (${trosId}, 'medium', 'pending_confirmation', 'Confirm time change at Buurtcafé De Tros (Jul 22)', 'You requested a change from 20:00 to 19:00 on Jul 20. No confirmation received yet.', false),
  (${lisbonUpcomingId}, 'medium', 'missing_booking', 'Book return flight from Lisbon', 'Only the outbound flight NF1LGT was found. No return flight or train booking visible in email.', false)
`);

console.log("Seed complete!");
console.log("Trips:", tripRows.length);
await connection.end();
