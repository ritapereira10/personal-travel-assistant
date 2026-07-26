/**
 * Gmail sync service — calls the Manus built-in data API to search Gmail
 * for travel-related emails and upsert new bookings into the database.
 *
 * This runs both on-demand (via tRPC) and on a Heartbeat schedule.
 */

import { ENV } from "./_core/env";
import {
  getBookingByGmailThread,
  getLastSync,
  insertBooking,
  insertSyncLog,
  upsertEmailCache,
  getAllTrips,
} from "./db";

const TRAVEL_QUERIES = [
  "from:transavia booking confirmation",
  "from:vueling booking confirmation",
  "from:deutschebahn.com booking confirmation",
  "from:eurostar.com ticket",
  "from:nsinternational booking confirmation",
  "from:booking.com confirmed",
  "from:airbnb reservation confirmed",
  "subject:(flight OR train OR hotel) (confirmation OR booking OR reservation)",
];

const TRAVEL_SENDERS = [
  "transavia", "vueling", "deutschebahn", "eurostar", "nsinternational",
  "booking.com", "airbnb", "klm", "easyjet", "ryanair", "thalys", "renfe", "sncf",
];

function isTravelEmail(subject: string, from: string, snippet: string): boolean {
  const lower = `${subject} ${from} ${snippet}`.toLowerCase();
  if (TRAVEL_SENDERS.some((s) => lower.includes(s))) return true;
  const travelKeywords = ["booking confirmation", "your flight", "your train", "your reservation",
    "boarding pass", "check-in", "hotel confirmed", "car rental confirmed", "itinerary"];
  return travelKeywords.some((k) => lower.includes(k));
}

function isImportantEmail(subject: string, snippet: string): boolean {
  const lower = `${subject} ${snippet}`.toLowerCase();
  const importantKeywords = ["action required", "urgent", "important", "deadline", "invoice",
    "payment", "contract", "offer", "interview", "signed", "approved", "rejected"];
  return importantKeywords.some((k) => lower.includes(k));
}

interface GmailMessage {
  id: string;
  threadId: string;
  subject?: string;
  from?: string;
  date?: string;
  snippet?: string;
  internalDate?: string;
}

async function searchGmailMessages(query: string, maxResults = 20): Promise<GmailMessage[]> {
  try {
    const url = `${ENV.forgeApiUrl}/data_api/mcp/gmail/search_messages`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({ q: query, max_results: maxResults }),
    });

    if (!resp.ok) {
      console.warn(`[GmailSync] Search failed for query "${query}": ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    const threads: GmailMessage[] = [];

    if (data?.result?.threads) {
      for (const thread of data.result.threads) {
        for (const msg of thread.messages ?? []) {
          const headers = msg.pickedHeaders ?? {};
          threads.push({
            id: msg.id,
            threadId: msg.threadId,
            subject: headers.subject ?? "",
            from: headers.from ?? "",
            date: headers.date ?? "",
            snippet: msg.snippet ?? "",
            internalDate: msg.internalDate,
          });
        }
      }
    }

    return threads;
  } catch (err) {
    console.error("[GmailSync] Error searching Gmail:", err);
    return [];
  }
}

async function searchImportantEmails(): Promise<GmailMessage[]> {
  return searchGmailMessages("is:important -label:travel", 50);
}

export async function runGmailSync(): Promise<{
  emailsProcessed: number;
  newBookingsFound: number;
  status: string;
  error?: string;
}> {
  console.log("[GmailSync] Starting sync...");

  let emailsProcessed = 0;
  let newBookingsFound = 0;

  try {
    // Fetch travel emails
    const travelMessages: GmailMessage[] = [];
    const seen = new Set<string>();

    for (const query of TRAVEL_QUERIES.slice(0, 4)) {
      const msgs = await searchGmailMessages(query, 20);
      for (const msg of msgs) {
        if (!seen.has(msg.id)) {
          seen.add(msg.id);
          travelMessages.push(msg);
        }
      }
    }

    emailsProcessed = travelMessages.length;

    // Cache travel emails and check for new bookings
    for (const msg of travelMessages) {
      await upsertEmailCache({
        gmailMessageId: msg.id,
        gmailThreadId: msg.threadId,
        subject: msg.subject ?? null,
        fromAddress: msg.from ?? null,
        dateReceived: msg.internalDate
          ? new Date(parseInt(msg.internalDate)).toISOString().slice(0, 10)
          : null,
        snippet: msg.snippet ?? null,
        isTravel: true,
        isImportant: false,
        isStarred: false,
      });

      // Check if this thread already has a booking
      if (msg.threadId) {
        const existing = await getBookingByGmailThread(msg.threadId);
        if (!existing && isTravelEmail(msg.subject ?? "", msg.from ?? "", msg.snippet ?? "")) {
          // New travel email — we log it but don't auto-create bookings
          // (bookings are managed manually or via seed; sync just surfaces new emails)
          newBookingsFound++;
        }
      }
    }

    // Fetch important non-travel emails
    const importantMsgs = await searchImportantEmails();
    for (const msg of importantMsgs) {
      if (!isTravelEmail(msg.subject ?? "", msg.from ?? "", msg.snippet ?? "")) {
        await upsertEmailCache({
          gmailMessageId: msg.id,
          gmailThreadId: msg.threadId,
          subject: msg.subject ?? null,
          fromAddress: msg.from ?? null,
          dateReceived: msg.internalDate
            ? new Date(parseInt(msg.internalDate)).toISOString().slice(0, 10)
            : null,
          snippet: msg.snippet ?? null,
          isTravel: false,
          isImportant: true,
          isStarred: false,
        });
      }
    }

    await insertSyncLog({ emailsProcessed, newBookingsFound, status: "success" });
    console.log(`[GmailSync] Done. Processed: ${emailsProcessed}, new: ${newBookingsFound}`);

    return { emailsProcessed, newBookingsFound, status: "success" };
  } catch (err: any) {
    const errorMessage = err?.message ?? "Unknown error";
    console.error("[GmailSync] Sync failed:", errorMessage);
    await insertSyncLog({ emailsProcessed, newBookingsFound, status: "error", errorMessage });
    return { emailsProcessed, newBookingsFound, status: "error", error: errorMessage };
  }
}
