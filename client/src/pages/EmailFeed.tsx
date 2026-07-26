import { trpc } from "@/lib/trpc";
import { Mail, RefreshCw, Inbox } from "lucide-react";
import { EmptyState, SectionHeader } from "@/components/TravelUI";
import { toast } from "sonner";
import { useState } from "react";

export default function EmailFeed() {
  const [syncing, setSyncing] = useState(false);
  const { data: emails, isLoading, refetch } = trpc.gmail.importantEmails.useQuery({ limit: 40 });
  const { data: lastSync } = trpc.gmail.lastSync.useQuery();

  const syncMutation = trpc.gmail.sync.useMutation({
    onSuccess: (result) => {
      setSyncing(false);
      refetch();
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

  const formatSyncTime = (syncedAt?: Date | string | null) => {
    if (!syncedAt) return null;
    try {
      const d = new Date(syncedAt);
      return d.toLocaleString("en-GB", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8 rule-double-top pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-sans text-xs tracking-widest uppercase text-muted-foreground mb-1">What matters</p>
            <h1 className="font-serif text-5xl font-bold text-foreground leading-none">
              Important<br />Emails
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

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border border-border rounded p-4 animate-pulse">
              <div className="h-3 w-2/3 bg-muted rounded mb-2" />
              <div className="h-3 w-1/3 bg-muted rounded mb-2" />
              <div className="h-3 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : emails?.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No important emails found"
          subtitle="Sync your Gmail to pull in starred and important messages."
        />
      ) : (
        <div className="space-y-2">
          {emails?.map((email, i) => (
            <EmailRow key={email.id} email={email} delay={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmailRow({ email, delay }: { email: any; delay: number }) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const extractSenderName = (from?: string | null) => {
    if (!from) return "Unknown";
    const match = from.match(/^([^<]+)</);
    if (match) return match[1].trim().replace(/"/g, "");
    return from.split("@")[0] ?? from;
  };

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={`w-full text-left border border-border rounded-sm p-4 hover:border-foreground transition-all duration-150 animate-fade-up animate-fade-up-delay-${Math.min(delay + 1, 4)}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
          <Mail className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-sans text-xs text-muted-foreground mb-0.5">{extractSenderName(email.fromAddress)}</p>
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
