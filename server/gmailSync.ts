/**
 * Gmail sync service — calls the Manus built-in data API to search Gmail
 * for travel-related emails and important inbox emails (jobs + other).
 *
 * Runs both on-demand (via tRPC) and on a Heartbeat schedule every 6 hours.
 */

import { ENV } from "./_core/env";
import {
  getBookingByGmailThread,
  insertSyncLog,
  upsertEmailCache,
} from "./db";

// ── Travel queries (transportation only — no hotel/accommodation) ────────────
const TRAVEL_QUERIES = [
  "from:transavia booking confirmation",
  "from:vueling booking confirmation",
  "from:deutschebahn.com booking confirmation",
  "from:eurostar.com ticket",
  "from:nsinternational booking confirmation",
  "subject:(flight OR train) (confirmation OR booking OR reservation)",
];

const TRAVEL_SENDERS = [
  "transavia", "vueling", "deutschebahn", "eurostar", "nsinternational",
  "klm", "easyjet", "ryanair", "thalys", "renfe", "sncf", "flixbus",
];

// ── Job / opportunity classification keywords ────────────────────────────────
const JOB_SENDERS_PATTERNS = [
  "linkedin.com", "jobalerts", "greenhouse.io", "lever.co", "workday",
  "recruitee.com", "teamtailor", "ashbyhq.com", "jobs@", "careers@",
  "talent@", "recruiting@", "recruiter@",
];

const JOB_SUBJECT_KEYWORDS = [
  "job alert", "job opportunity", "new role", "contract role", "contractor",
  "freelance", "consulting opportunity", "pm role", "product manager role",
  "head of product", "vp product", "chief product", "hiring", "interview",
  "your application", "application received", "we'd like to speak",
  "offer letter", "contract offer", "position", "vacancy",
];

function isTravelEmail(subject: string, from: string, snippet: string): boolean {
  const lower = `${subject} ${from} ${snippet}`.toLowerCase();
  if (TRAVEL_SENDERS.some((s) => lower.includes(s))) return true;
  const travelKeywords = [
    "booking confirmation", "your flight", "your train", "your reservation",
    "boarding pass", "check-in", "itinerary", "e-ticket",
  ];
  return travelKeywords.some((k) => lower.includes(k));
}

function isJobEmail(subject: string, from: string, snippet: string): boolean {
  const lowerFrom = from.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  const lowerSnippet = snippet.toLowerCase();
  if (JOB_SENDERS_PATTERNS.some((p) => lowerFrom.includes(p))) return true;
  if (JOB_SUBJECT_KEYWORDS.some((k) => lowerSubject.includes(k))) return true;
  // Snippet check for recruiter-style language
  const recruiterPhrases = ["i came across your profile", "i found your profile",
    "we are looking for", "we're looking for", "exciting opportunity",
    "great fit for", "reach out about a role"];
  if (recruiterPhrases.some((p) => lowerSnippet.includes(p))) return true;
  return false;
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
    const messages: GmailMessage[] = [];

    if (data?.result?.threads) {
      for (const thread of data.result.threads) {
        for (const msg of thread.messages ?? []) {
          const headers = msg.pickedHeaders ?? {};
          messages.push({
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

    return messages;
  } catch (err) {
    console.error("[GmailSync] Error searching Gmail:", err);
    return [];
  }
}

function toIsoDate(internalDate?: string): string | null {
  if (!internalDate) return null;
  try {
    return new Date(parseInt(internalDate)).toISOString().slice(0, 10);
  } catch {
    return null;
  }
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
    // ── 1. Travel emails (transportation only) ─────────────────────────────
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

    for (const msg of travelMessages) {
      await upsertEmailCache({
        gmailMessageId: msg.id,
        gmailThreadId: msg.threadId,
        subject: msg.subject ?? null,
        fromAddress: msg.from ?? null,
        dateReceived: toIsoDate(msg.internalDate),
        snippet: msg.snippet ?? null,
        isTravel: true,
        isImportant: false,
        isStarred: false,
        emailCategory: "other",
      });

      if (msg.threadId) {
        const existing = await getBookingByGmailThread(msg.threadId);
        if (!existing && isTravelEmail(msg.subject ?? "", msg.from ?? "", msg.snippet ?? "")) {
          newBookingsFound++;
        }
      }
    }

    // ── 2. Job emails ──────────────────────────────────────────────────────
    const jobQueries = [
      "from:linkedin.com subject:(job alert OR job opportunity OR new role)",
      "subject:(contract role OR contractor OR freelance OR PM role OR product manager) newer_than:30d",
      "subject:(interview OR offer letter OR your application) newer_than:60d",
    ];

    const jobSeen = new Set<string>();
    for (const query of jobQueries) {
      const msgs = await searchGmailMessages(query, 20);
      for (const msg of msgs) {
        if (!jobSeen.has(msg.id) && !isTravelEmail(msg.subject ?? "", msg.from ?? "", msg.snippet ?? "")) {
          jobSeen.add(msg.id);
          await upsertEmailCache({
            gmailMessageId: msg.id,
            gmailThreadId: msg.threadId,
            subject: msg.subject ?? null,
            fromAddress: msg.from ?? null,
            dateReceived: toIsoDate(msg.internalDate),
            snippet: msg.snippet ?? null,
            isTravel: false,
            isImportant: true,
            isStarred: false,
            emailCategory: "jobs",
          });
        }
      }
    }

    // ── 3. Other important emails ──────────────────────────────────────────
    const importantMsgs = await searchGmailMessages("is:important -label:travel newer_than:30d", 50);
    for (const msg of importantMsgs) {
      if (!seen.has(msg.id) && !jobSeen.has(msg.id) &&
          !isTravelEmail(msg.subject ?? "", msg.from ?? "", msg.snippet ?? "")) {
        const category = isJobEmail(msg.subject ?? "", msg.from ?? "", msg.snippet ?? "") ? "jobs" : "other";
        await upsertEmailCache({
          gmailMessageId: msg.id,
          gmailThreadId: msg.threadId,
          subject: msg.subject ?? null,
          fromAddress: msg.from ?? null,
          dateReceived: toIsoDate(msg.internalDate),
          snippet: msg.snippet ?? null,
          isTravel: false,
          isImportant: true,
          isStarred: false,
          emailCategory: category,
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
