/**
 * Run once to register the periodic Gmail sync Heartbeat job.
 * Called from the system router on first boot if not already registered.
 */
import { createHeartbeatJob, listHeartbeatJobs } from "./_core/heartbeat";

export async function ensureGmailSyncHeartbeat(): Promise<void> {
  try {
    // List existing jobs to avoid duplicates
    const existing = await listHeartbeatJobs(""); // empty string = owner identity
    const alreadyExists = (existing.jobs ?? []).some((j) => j.name === "gmail-sync-periodic");
    if (alreadyExists) {
      console.log("[Heartbeat] gmail-sync-periodic already registered.");
      return;
    }

    const result = await createHeartbeatJob(
      {
        name: "gmail-sync-periodic",
        // Every 6 hours: 0 0 */6 * * *
        cron: "0 0 */6 * * *",
        path: "/api/scheduled/gmail-sync",
        method: "POST",
        description: "Periodic Gmail sync — scans inbox for new travel confirmations every 6 hours",
      },
      "" // owner identity
    );

    console.log(`[Heartbeat] gmail-sync-periodic registered. taskUid: ${result.taskUid}`);
  } catch (err) {
    // Non-fatal — sync can still be triggered manually
    console.warn("[Heartbeat] Failed to register gmail-sync-periodic:", err);
  }
}
