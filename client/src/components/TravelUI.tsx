import { Plane, Train, Hotel, Car, UtensilsCrossed, Package, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

// ── Status Badge ────────────────────────────────────────────────────────────

type Status = "confirmed" | "pending" | "missing";

export function StatusBadge({ status }: { status: Status }) {
  const cls = {
    confirmed: "badge-confirmed",
    pending: "badge-pending",
    missing: "badge-missing",
  }[status] ?? "badge-pending";

  const Icon = {
    confirmed: CheckCircle2,
    pending: Clock,
    missing: AlertCircle,
  }[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-sans font-medium tracking-wide ${cls}`}>
      <Icon className="w-3 h-3" strokeWidth={2} />
      {status}
    </span>
  );
}

// ── Priority Badge ──────────────────────────────────────────────────────────

type Priority = "high" | "medium" | "low";

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cls = {
    high: "badge-high",
    medium: "badge-medium",
    low: "badge-low",
  }[priority] ?? "badge-low";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-sans font-medium tracking-wide ${cls}`}>
      {priority}
    </span>
  );
}

// ── Booking Type Icon ───────────────────────────────────────────────────────

type BookingType = "flight" | "train" | "hotel" | "car_rental" | "restaurant" | "other";

export function BookingTypeIcon({ type }: { type: BookingType }) {
  const icons: Record<BookingType, React.ElementType> = {
    flight: Plane,
    train: Train,
    hotel: Hotel,
    car_rental: Car,
    restaurant: UtensilsCrossed,
    other: Package,
  };
  const Icon = icons[type] ?? Package;
  return (
    <span className="type-icon">
      <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
    </span>
  );
}

// ── Booking Type Label ──────────────────────────────────────────────────────

export function bookingTypeLabel(type: BookingType): string {
  const labels: Record<BookingType, string> = {
    flight: "Flight",
    train: "Train",
    hotel: "Hotel",
    car_rental: "Car Rental",
    restaurant: "Restaurant",
    other: "Other",
  };
  return labels[type] ?? type;
}

// ── Country Flag ────────────────────────────────────────────────────────────

const countryFlags: Record<string, string> = {
  Germany: "🇩🇪",
  Portugal: "🇵🇹",
  Spain: "🇪🇸",
  Netherlands: "🇳🇱",
  "United Kingdom": "🇬🇧",
  France: "🇫🇷",
  Italy: "🇮🇹",
  Belgium: "🇧🇪",
};

export function countryFlag(country?: string | null): string {
  if (!country) return "✈️";
  return countryFlags[country] ?? "🌍";
}

// ── Format date ─────────────────────────────────────────────────────────────

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "TBC";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function formatTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    if (!dateStr.includes("T")) return "";
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start) return "Dates TBC";
  const s = formatDate(start);
  if (!end || end === start) return s;
  const e = formatDate(end);
  return `${s} — ${e}`;
}

// ── Section header ──────────────────────────────────────────────────────────

export function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="rule-thick-top pt-3 mb-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-sans text-xs font-semibold tracking-widest uppercase text-muted-foreground">{label}</h2>
        {count !== undefined && (
          <span className="font-sans text-xs text-muted-foreground">{count}</span>
        )}
      </div>
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, subtitle }: {
  icon?: React.ElementType;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon className="w-8 h-8 text-muted-foreground mb-4" strokeWidth={1} />}
      <p className="font-serif text-lg text-foreground mb-1">{title}</p>
      {subtitle && <p className="font-sans text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded ${className}`} />;
}

export function TripSkeleton() {
  return (
    <div className="border border-border rounded p-5 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
