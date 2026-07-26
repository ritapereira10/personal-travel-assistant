import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  AlertCircle,
  X,
  ChevronRight,
  Calendar,
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
import { useAuthEnabled } from "@/hooks/useOwnerQuery";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [noteInputId, setNoteInputId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const { enabled } = useAuthEnabled();

  const { data: actionItems, isLoading: loadingActions, refetch: refetchActions } =
    trpc.actionItems.active.useQuery(undefined, { enabled });
  const { data: upcomingTrips, isLoading: loadingTrips } =
    trpc.trips.upcoming.useQuery(undefined, { enabled });

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
          {!enabled
            ? "Loading…"
            : upcomingTrips?.length
              ? `${upcomingTrips.length} upcoming trip${upcomingTrips.length !== 1 ? "s" : ""} ahead`
              : "No upcoming trips found"}
        </p>
      </div>

      {/* Action Required */}
      <section className="mb-10">
        <SectionHeader label="Action Required" count={actionItems?.filter(a => !a.dismissed).length} />

        {!enabled || loadingActions ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border rounded p-4 animate-pulse">
                <div className="h-3 w-2/3 bg-muted rounded mb-2" />
                <div className="h-3 w-full bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : !actionItems || actionItems.length === 0 ? (
          <EmptyState title="All clear" subtitle="No action items right now." />
        ) : (
          <div className="space-y-2">
            {[...highPriority, ...otherPriority].map((item) => {
              const isNoteOpen = noteInputId === item.id;
              return (
                <div
                  key={item.id}
                  className={`border rounded-sm p-4 transition-all ${item.priority === "high" ? "border-l-4 border-l-red-400 border-border" : "border-border"}`}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${item.priority === "high" ? "text-red-500" : "text-muted-foreground"}`}
                      strokeWidth={1.5}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-sans text-sm font-semibold text-foreground">{item.title}</span>
                        <PriorityBadge priority={item.priority} />
                      </div>
                      {item.detail && (
                        <p className="font-sans text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                      )}
                      {item.userNote && !isNoteOpen && (
                        <p className="font-sans text-xs text-foreground mt-1.5 italic">
                          Note: {item.userNote}
                        </p>
                      )}
                      {isNoteOpen && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add a note…"
                            className="flex-1 font-sans text-xs border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:border-foreground"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addNoteMutation.mutate({ id: item.id, note: noteText });
                              if (e.key === "Escape") setNoteInputId(null);
                            }}
                          />
                          <button
                            onClick={() => addNoteMutation.mutate({ id: item.id, note: noteText })}
                            className="font-sans text-xs text-foreground border border-border rounded px-2 py-1 hover:bg-muted transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {item.tripId && (
                        <button
                          onClick={() => navigate(`/trips/${item.tripId}`)}
                          className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                        >
                          View trip <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => { setNoteInputId(isNoteOpen ? null : item.id); setNoteText(item.userNote ?? ""); }}
                        className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Note
                      </button>
                      <button
                        onClick={() => dismissMutation.mutate({ id: item.id })}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming Trips */}
      <section>
        <SectionHeader label="Upcoming Trips" count={upcomingTrips?.length} />

        {!enabled || loadingTrips ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <TripSkeleton key={i} />)}
          </div>
        ) : !upcomingTrips || upcomingTrips.length === 0 ? (
          <EmptyState title="No upcoming trips" subtitle="Your schedule is clear." />
        ) : (
          <div className="space-y-2">
            {upcomingTrips.map((trip) => {
              const missingCount = 0; // computed in detail view
              return (
                <button
                  key={trip.id}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  className="w-full text-left border border-border rounded-sm p-4 hover:border-foreground transition-all duration-150 group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl flex-shrink-0">{countryFlag(trip.country ?? "")}</span>
                      <div className="min-w-0">
                        <h3 className="font-serif text-lg font-semibold text-foreground leading-tight truncate">
                          {trip.destination}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
                          <span className="font-sans text-xs text-muted-foreground">
                            {trip.dateStart && trip.dateEnd
                              ? formatDateRange(trip.dateStart, trip.dateEnd)
                              : trip.dateStart
                                ? formatDate(trip.dateStart)
                                : "Dates TBC"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={trip.status === "upcoming" ? "confirmed" : trip.status as any} />
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
