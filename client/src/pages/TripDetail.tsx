import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Calendar,
  AlertCircle,
  Plus,
} from "lucide-react";
import {
  StatusBadge,
  BookingTypeIcon,
  bookingTypeLabel,
  countryFlag,
  formatDate,
  formatDateRange,
  formatTime,
  SectionHeader,
  EmptyState,
} from "@/components/TravelUI";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthEnabled } from "@/hooks/useOwnerQuery";

interface TripDetailProps {
  id: number;
}

export default function TripDetail({ id }: TripDetailProps) {
  const [, navigate] = useLocation();
  const [noteBookingId, setNoteBookingId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const { enabled } = useAuthEnabled();

  const { data, isLoading, refetch } = trpc.trips.byId.useQuery({ id }, { enabled });

  const updateNotesMutation = trpc.bookings.updateNotes.useMutation({
    onSuccess: () => {
      refetch();
      setNoteBookingId(null);
      setNoteText("");
      toast.success("Note saved");
    },
  });

  if (isLoading) {
    return (
      <div className="px-8 py-8 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-12 w-2/3 bg-muted rounded" />
          <div className="h-4 w-1/3 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-8 py-8">
        <EmptyState icon={AlertCircle} title="Trip not found" subtitle="This trip may have been removed." />
      </div>
    );
  }

  const { trip, bookings } = data;
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const pending = bookings.filter((b) => b.status === "pending");
  const missing = bookings.filter((b) => b.status === "missing");

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => navigate(trip.status === "past" ? "/past" : "/upcoming")}
        className="flex items-center gap-1.5 font-sans text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {trip.status === "past" ? "Archive" : "Upcoming"}
      </button>

      {/* Trip header */}
      <div className="mb-8 rule-double-top pt-4">
        <div className="flex items-start gap-4">
          <span className="text-4xl mt-1">{countryFlag(trip.country)}</span>
          <div>
            <h1 className="font-serif text-5xl font-bold text-foreground leading-none mb-2">
              {trip.destination}
            </h1>
            <p className="font-sans text-sm text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDateRange(trip.dateStart, trip.dateEnd)}
            </p>
          </div>
        </div>
        {trip.notes && (
          <p className="font-sans text-sm text-muted-foreground mt-4 leading-relaxed border-l-2 border-border pl-3">
            {trip.notes}
          </p>
        )}
      </div>

      {/* Missing bookings — shown prominently at top */}
      {missing.length > 0 && (
        <div className="mb-8">
          <SectionHeader label="Missing Bookings" count={missing.length} />
          <div className="space-y-2">
            {missing.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                noteBookingId={noteBookingId}
                noteText={noteText}
                setNoteText={setNoteText}
                onNote={() => { setNoteBookingId(booking.id); setNoteText(booking.notes ?? ""); }}
                onSaveNote={() => updateNotesMutation.mutate({ id: booking.id, notes: noteText })}
                onCancelNote={() => setNoteBookingId(null)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Confirmed bookings */}
      {confirmed.length > 0 && (
        <div className="mb-8">
          <SectionHeader label="Confirmed Bookings" count={confirmed.length} />
          <div className="space-y-2">
            {confirmed.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                noteBookingId={noteBookingId}
                noteText={noteText}
                setNoteText={setNoteText}
                onNote={() => { setNoteBookingId(booking.id); setNoteText(booking.notes ?? ""); }}
                onSaveNote={() => updateNotesMutation.mutate({ id: booking.id, notes: noteText })}
                onCancelNote={() => setNoteBookingId(null)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending bookings */}
      {pending.length > 0 && (
        <div className="mb-8">
          <SectionHeader label="Pending Confirmation" count={pending.length} />
          <div className="space-y-2">
            {pending.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                noteBookingId={noteBookingId}
                noteText={noteText}
                setNoteText={setNoteText}
                onNote={() => { setNoteBookingId(booking.id); setNoteText(booking.notes ?? ""); }}
                onSaveNote={() => updateNotesMutation.mutate({ id: booking.id, notes: noteText })}
                onCancelNote={() => setNoteBookingId(null)}
              />
            ))}
          </div>
        </div>
      )}

      {bookings.length === 0 && (
        <EmptyState
          icon={AlertCircle}
          title="No bookings yet"
          subtitle="Sync your Gmail to pull in confirmations for this trip."
        />
      )}
    </div>
  );
}

// ── Booking Row ─────────────────────────────────────────────────────────────

function BookingRow({
  booking,
  noteBookingId,
  noteText,
  setNoteText,
  onNote,
  onSaveNote,
  onCancelNote,
}: {
  booking: any;
  noteBookingId: number | null;
  noteText: string;
  setNoteText: (v: string) => void;
  onNote: () => void;
  onSaveNote: () => void;
  onCancelNote: () => void;
}) {
  const isNoteOpen = noteBookingId === booking.id;

  return (
    <div className={`border rounded-sm p-4 transition-colors ${
      booking.status === "missing"
        ? "border-[oklch(0.82_0.12_25)] bg-[oklch(0.98_0.02_25)]"
        : booking.status === "pending"
        ? "border-[oklch(0.82_0.1_70)] bg-[oklch(0.99_0.01_70)]"
        : "border-border bg-card"
    }`}>
      <div className="flex items-start gap-3">
        <BookingTypeIcon type={booking.type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {/* Type label */}
              <p className="font-sans text-xs tracking-widest uppercase text-muted-foreground mb-0.5">
                {bookingTypeLabel(booking.type)}
              </p>
              {/* Route / property */}
              <p className="font-serif text-base font-semibold text-foreground leading-tight">
                {booking.routeOrProperty ?? booking.provider ?? "—"}
              </p>
              {/* Date and time */}
              {booking.dateTime && (
                <p className="font-sans text-xs text-muted-foreground mt-0.5">
                  {formatDate(booking.dateTime)}
                  {formatTime(booking.dateTime) && ` · ${formatTime(booking.dateTime)}`}
                  {booking.dateTimeEnd && ` → ${formatDate(booking.dateTimeEnd)}`}
                </p>
              )}
              {/* Provider and reference */}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {booking.provider && (
                  <span className="font-sans text-xs text-muted-foreground">{booking.provider}</span>
                )}
                {booking.reference && (
                  <span className="font-sans text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                    {booking.reference}
                  </span>
                )}
                {booking.bookedOn && (
                  <span className="font-sans text-xs text-muted-foreground">
                    Booked {formatDate(booking.bookedOn)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2 flex-shrink-0">
              <StatusBadge status={booking.status} />
              <button
                onClick={onNote}
                className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Note
              </button>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && !isNoteOpen && (
            <p className="font-sans text-xs text-muted-foreground mt-2 leading-relaxed border-l-2 border-border pl-2">
              {booking.notes}
            </p>
          )}

          {/* Note input */}
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
      </div>
    </div>
  );
}
