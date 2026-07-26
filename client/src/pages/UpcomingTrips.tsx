import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Calendar, ChevronRight, Plane } from "lucide-react";
import {
  StatusBadge,
  BookingTypeIcon,
  countryFlag,
  formatDate,
  formatDateRange,
  formatTime,
  SectionHeader,
  EmptyState,
  TripSkeleton,
} from "@/components/TravelUI";

import { useAuthEnabled } from "@/hooks/useOwnerQuery";

export default function UpcomingTrips() {
  const [, navigate] = useLocation();
  const { enabled } = useAuthEnabled();
  const { data: trips, isLoading } = trpc.trips.upcoming.useQuery(undefined, { enabled });

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8 rule-double-top pt-4">
        <p className="font-sans text-xs tracking-widest uppercase text-muted-foreground mb-1">What's ahead</p>
        <h1 className="font-serif text-5xl font-bold text-foreground leading-none">
          Upcoming<br />Trips
        </h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <TripSkeleton />
          <TripSkeleton />
          <TripSkeleton />
        </div>
      ) : trips?.length === 0 ? (
        <EmptyState icon={Plane} title="No upcoming trips" subtitle="Sync your Gmail to pull in new bookings." />
      ) : (
        <div className="space-y-4">
          {trips?.map((trip, i) => (
            <TripTimelineCard
              key={trip.id}
              trip={trip}
              delay={i}
              onClick={() => navigate(`/trips/${trip.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TripTimelineCard({ trip, delay, onClick }: { trip: any; delay: number; onClick: () => void }) {
  const { data } = trpc.trips.byId.useQuery({ id: trip.id });
  const bookings = data?.bookings ?? [];
  const confirmed = bookings.filter((b: any) => b.status === "confirmed");
  const missing = bookings.filter((b: any) => b.status === "missing");
  const pending = bookings.filter((b: any) => b.status === "pending");

  return (
    <button
      onClick={onClick}
      className={`w-full text-left border border-border rounded-sm hover:border-foreground transition-all duration-200 group animate-fade-up animate-fade-up-delay-${Math.min(delay + 1, 4)}`}
    >
      {/* Trip header */}
      <div className="px-5 pt-4 pb-3 rule-bottom flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">{countryFlag(trip.country)}</span>
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground leading-tight">{trip.destination}</h2>
            <p className="font-sans text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDateRange(trip.dateStart, trip.dateEnd)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            {missing.length > 0 && (
              <span className="font-sans text-xs text-[oklch(0.55_0.18_25)] font-medium">
                {missing.length} missing
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>

      {/* Bookings preview */}
      {bookings.length > 0 && (
        <div className="px-5 py-3 space-y-2">
          {bookings.slice(0, 4).map((booking: any) => (
            <div key={booking.id} className="flex items-center gap-3">
              <BookingTypeIcon type={booking.type} />
              <div className="flex-1 min-w-0">
                <p className="font-sans text-xs text-foreground truncate">
                  {booking.routeOrProperty ?? booking.provider ?? "—"}
                </p>
                {booking.dateTime && (
                  <p className="font-sans text-xs text-muted-foreground">
                    {formatDate(booking.dateTime)}
                    {formatTime(booking.dateTime) && ` · ${formatTime(booking.dateTime)}`}
                  </p>
                )}
              </div>
              <StatusBadge status={booking.status} />
            </div>
          ))}
          {bookings.length > 4 && (
            <p className="font-sans text-xs text-muted-foreground pl-9">
              +{bookings.length - 4} more
            </p>
          )}
        </div>
      )}
    </button>
  );
}
