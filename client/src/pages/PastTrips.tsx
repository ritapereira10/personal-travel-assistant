import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Archive, Calendar, ChevronRight } from "lucide-react";
import {
  BookingTypeIcon,
  countryFlag,
  formatDate,
  formatDateRange,
  SectionHeader,
  EmptyState,
  TripSkeleton,
  StatusBadge,
} from "@/components/TravelUI";

import { useAuthEnabled } from "@/hooks/useOwnerQuery";

export default function PastTrips() {
  const [, navigate] = useLocation();
  const { enabled } = useAuthEnabled();
  const { data: trips, isLoading } = trpc.trips.past.useQuery(undefined, { enabled });

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-8 rule-double-top pt-4">
        <p className="font-sans text-xs tracking-widest uppercase text-muted-foreground mb-1">Where you've been</p>
        <h1 className="font-serif text-5xl font-bold text-foreground leading-none">
          Travel<br />Archive
        </h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <TripSkeleton />
          <TripSkeleton />
          <TripSkeleton />
        </div>
      ) : trips?.length === 0 ? (
        <EmptyState icon={Archive} title="No past trips yet" subtitle="Completed trips will appear here." />
      ) : (
        <div className="space-y-2">
          {trips?.map((trip, i) => (
            <PastTripRow
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

function PastTripRow({ trip, delay, onClick }: { trip: any; delay: number; onClick: () => void }) {
  const { data } = trpc.trips.byId.useQuery({ id: trip.id });
  const bookings = data?.bookings ?? [];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left border border-border rounded-sm p-4 hover:border-foreground hover:bg-accent transition-all duration-150 group animate-fade-up animate-fade-up-delay-${Math.min(delay + 1, 4)}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">{countryFlag(trip.country)}</span>
          <div className="min-w-0">
            <h3 className="font-serif text-lg font-bold text-foreground leading-tight">{trip.destination}</h3>
            <p className="font-sans text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDateRange(trip.dateStart, trip.dateEnd)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {bookings.length > 0 && (
            <div className="flex items-center gap-1">
              {Array.from(new Set(bookings.map((b: any) => b.type))).slice(0, 3).map((type: any) => (
                <BookingTypeIcon key={type} type={type} />
              ))}
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </button>
  );
}
