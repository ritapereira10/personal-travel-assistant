import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  AlertCircle,
  X,
  ChevronRight,
  Calendar,
  Plane,
} from "lucide-react";
import {
  StatusBadge,
  PriorityBadge,
  countryFlag,
  formatDate,
  formatDateRange,
  SectionHeader,
  EmptyState,
  TripSkeleton,
} from "@/components/TravelUI";
import { useState } from "react";
import { toast } from "sonner";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [noteInputId, setNoteInputId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");

  const { data: actionItems, isLoading: loadingActions, refetch: refetchActions } =
    trpc.actionItems.active.useQuery();
  const { data: upcomingTrips, isLoading: loadingTrips } = trpc.trips.upcoming.useQuery();

  const dismissMutation = trpc.actionItems.dismiss.useMutation({
    onSuccess: () => { refetchActions(); toast.success("Item dismissed"); },
  });

  const addNoteMutation = trpc.actionItems.addNote.useMutation({
    onSuccess: () => {
      refetchActions();
      setNoteInputId(null);
      setNoteText("");
      toast.success("Note saved");
    },
  });

  const highPriority = actionItems?.filter((a) => a.priority === "high") ?? [];
  const otherPriority = actionItems?.filter((a) => a.priority !== "high") ?? [];

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Masthead */}
      <div className="mb-8 rule-double-top pt-4">
        <p className="font-sans text-xs tracking-widest uppercase text-muted-foreground mb-1">{todayStr}</p>
        <h1 className="font-serif text-5xl font-bold text-foreground leading-none mb-1">
          Good morning,<br />Rita.
        </h1>
        <p className="font-sans text-sm text-muted-foreground mt-2">
          {upcomingTrips?.length
            ? `${upcomingTrips.length} upcoming ${upcomingTrips.length === 1 ? "trip" : "trips"} ahead`
            : "No upcoming trips found"}
        </p>
      </div>

      {/* Action Required panel */}
      <div className="mb-10">
        <SectionHeader label="Action Required" count={actionItems?.length} />

        {loadingActions ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border rounded p-4 animate-pulse bg-muted h-16" />
            ))}
          </div>
        ) : actionItems?.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="Nothing requires your attention"
            subtitle="All bookings are in order."
          />
        ) : (
          <div className="space-y-2">
            {/* High priority items first */}
            {highPriority.map((item, i) => (
              <ActionCard
                key={item.id}
                item={item}
                delay={i}
                onDismiss={() => dismissMutation.mutate({ id: item.id })}
                onNote={() => { setNoteInputId(item.id); setNoteText(item.userNote ?? ""); }}
                noteInputId={noteInputId}
                noteText={noteText}
                setNoteText={setNoteText}
                onSaveNote={() => addNoteMutation.mutate({ id: item.id, note: noteText })}
                onCancelNote={() => setNoteInputId(null)}
                navigate={navigate}
              />
            ))}
            {otherPriority.map((item, i) => (
              <ActionCard
                key={item.id}
                item={item}
                delay={highPriority.length + i}
                onDismiss={() => dismissMutation.mutate({ id: item.id })}
                onNote={() => { setNoteInputId(item.id); setNoteText(item.userNote ?? ""); }}
                noteInputId={noteInputId}
                noteText={noteText}
                setNoteText={setNoteText}
                onSaveNote={() => addNoteMutation.mutate({ id: item.id, note: noteText })}
                onCancelNote={() => setNoteInputId(null)}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming trips overview */}
      <div>
        <SectionHeader label="Upcoming Trips" count={upcomingTrips?.length} />

        {loadingTrips ? (
          <div className="space-y-3">
            <TripSkeleton />
            <TripSkeleton />
          </div>
        ) : upcomingTrips?.length === 0 ? (
          <EmptyState icon={Plane} title="No upcoming trips" subtitle="Add a trip or sync your Gmail to get started." />
        ) : (
          <div className="space-y-2">
            {upcomingTrips?.map((trip, i) => (
              <button
                key={trip.id}
                onClick={() => navigate(`/trips/${trip.id}`)}
                className={`w-full text-left border border-border rounded p-4 hover:border-foreground hover:bg-accent transition-all duration-150 group animate-fade-up animate-fade-up-delay-${Math.min(i + 1, 4)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xl mt-0.5 flex-shrink-0">{countryFlag(trip.country)}</span>
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg font-bold text-foreground leading-tight truncate">
                        {trip.destination}
                      </h3>
                      <p className="font-sans text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateRange(trip.dateStart, trip.dateEnd)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}

        {upcomingTrips && upcomingTrips.length > 0 && (
          <button
            onClick={() => navigate("/upcoming")}
            className="mt-4 font-sans text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            View all upcoming trips →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Action Card ─────────────────────────────────────────────────────────────

function ActionCard({
  item,
  delay,
  onDismiss,
  onNote,
  noteInputId,
  noteText,
  setNoteText,
  onSaveNote,
  onCancelNote,
  navigate,
}: {
  item: any;
  delay: number;
  onDismiss: () => void;
  onNote: () => void;
  noteInputId: number | null;
  noteText: string;
  setNoteText: (v: string) => void;
  onSaveNote: () => void;
  onCancelNote: () => void;
  navigate: (path: string) => void;
}) {
  const isNoteOpen = noteInputId === item.id;

  return (
    <div className={`border border-border rounded p-4 animate-fade-up animate-fade-up-delay-${Math.min(delay + 1, 4)} ${item.priority === "high" ? "border-l-2 border-l-[oklch(0.55_0.18_25)]" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${item.priority === "high" ? "text-[oklch(0.55_0.18_25)]" : "text-muted-foreground"}`} strokeWidth={2} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-sans text-sm font-medium text-foreground">{item.title}</p>
              <PriorityBadge priority={item.priority} />
            </div>
            {item.detail && (
              <p className="font-sans text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
            )}
            {item.userNote && !isNoteOpen && (
              <p className="font-sans text-xs text-muted-foreground mt-1.5 italic border-l-2 border-border pl-2">
                Note: {item.userNote}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {item.tripId && (
            <button
              onClick={() => navigate(`/trips/${item.tripId}`)}
              className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              View trip
            </button>
          )}
          <button
            onClick={onNote}
            className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            Note
          </button>
          <button
            onClick={onDismiss}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isNoteOpen && (
        <div className="mt-3 pt-3 border-t border-border">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note or reminder…"
            className="w-full font-sans text-xs text-foreground bg-background border border-border rounded p-2.5 resize-none focus:outline-none focus:border-foreground transition-colors"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={onSaveNote}
              className="font-sans text-xs font-medium bg-foreground text-background px-3 py-1.5 rounded hover:opacity-80 transition-opacity"
            >
              Save
            </button>
            <button
              onClick={onCancelNote}
              className="font-sans text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
