import { trpc } from "@/lib/trpc";
import { Mail, RefreshCw, Inbox, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useAuthEnabled } from "@/hooks/useOwnerQuery";

// ── Shared helpers ─────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function extractSenderName(from?: string | null) {
  if (!from) return "Unknown";
  const match = from.match(/^([^<]+)</);
  if (match) return match[1].trim().replace(/"/g, "");
  return from.split("@")[0] ?? from;
}

function formatSyncTime(syncedAt?: Date | string | null) {
  if (!syncedAt) return null;
  try {
    const d = new Date(syncedAt as string);
    return d.toLocaleString("en-GB", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return null;
  }
}

// ── Email row component ────────────────────────────────────────────────────

function EmailRow({ email, icon: Icon }: { email: any; icon: typeof Mail }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left border border-border rounded-sm p-4 hover:border-foreground transition-all duration-150"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-sans text-xs text-muted-foreground mb-0.5">
                {extractSenderName(email.fromAddress)}
              </p>
              <p className="font-serif text-sm font-semibold text-foreground leading-tight truncate">
                {email.subject ?? "(no subject)"}
              </p>
            </div>
            <span className="font-sans text-xs text-muted-foreground flex-shrink-0 mt-0.5">
              {formatDate(email.dateReceived)}
            </span>
          </div>
          {email.snippet && (
            <p className={`font-sans text-xs text-muted-foreground mt-1.5 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
              {email.snippet}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Email section ──────────────────────────────────────────────────────────

function EmailSection({
  title,
  subtitle,
  icon: Icon,
  emails,
  isLoading,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  icon: typeof Mail;
  emails: any[] | undefined;
  isLoading: boolean;
  emptyMessage: string;
}) {
  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4 pb-2 border-b border-border">
        <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        <div>
          <h2 className="font-serif text-xl font-semibold text-foreground leading-none">{title}</h2>
          <p className="font-sans text-xs text-muted-foreground mt-0.5 tracking-wide">{subtitle}</p>
        </div>
        {emails && emails.length > 0 && (
          <span className="ml-auto font-sans text-xs text-muted-foreground">{emails.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded p-4 animate-pulse">
              <div className="h-3 w-2/3 bg-muted rounded mb-2" />
              <div className="h-3 w-1/3 bg-muted rounded mb-2" />
              <div className="h-3 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : !emails || emails.length === 0 ? (
        <div className="border border-dashed border-border rounded-sm p-6 text-center">
          <p className="font-sans text-xs text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {emails.map((email) => (
            <EmailRow key={email.id} email={email} icon={Icon} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function EmailFeed() {
  const [syncing, setSyncing] = useState(false);
  const { enabled } = useAuthEnabled();

  const { data: jobEmails, isLoading: jobsLoading, refetch: refetchJobs } =
    trpc.gmail.emailsByCategory.useQuery({ category: "jobs", limit: 40 }, { enabled });

  const { data: otherEmails, isLoading: otherLoading, refetch: refetchOther } =
    trpc.gmail.emailsByCategory.useQuery({ category: "other", limit: 40 }, { enabled });

  const { data: lastSync } = trpc.gmail.lastSync.useQuery(undefined, { enabled });

  const syncMutation = trpc.gmail.sync.useMutation({
    onSuccess: (result) => {
      setSyncing(false);
      refetchJobs();
      refetchOther();
      toast.success(`Sync complete — ${result.emailsProcessed} emails scanned`);
    },
    onError: () => {
      setSyncing(false);
      toast.error("Sync failed. Please try again.");
    },
  });

  const handleSync = () => {
    setSyncing(true);
    syncMutation.mutate();
  };

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Page header */}
      <div className="mb-8 rule-double-top pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-sans text-xs tracking-widest uppercase text-muted-foreground mb-1">What matters</p>
            <h1 className="font-serif text-5xl font-bold text-foreground leading-none">
              Inbox
            </h1>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 font-sans text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors mt-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} strokeWidth={1.75} />
            {syncing ? "Syncing…" : "Sync"}
          </button>
        </div>
        {lastSync?.syncedAt && (
          <p className="font-sans text-xs text-muted-foreground mt-2">
            Last synced {formatSyncTime(lastSync.syncedAt)}
          </p>
        )}
      </div>

      {/* Jobs section */}
      <EmailSection
        title="Jobs"
        subtitle="Roles, alerts, recruiter outreach, applications"
        icon={Briefcase}
        emails={jobEmails}
        isLoading={jobsLoading}
        emptyMessage="No job emails found. Sync your Gmail to pull in LinkedIn alerts and recruiter messages."
      />

      {/* Other important section */}
      <EmailSection
        title="Other Important"
        subtitle="Flagged and starred emails outside travel and jobs"
        icon={Inbox}
        emails={otherEmails}
        isLoading={otherLoading}
        emptyMessage="No other important emails found. Sync your Gmail to pull in starred and flagged messages."
      />
    </div>
  );
}
