import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard,
  Calendar,
  Archive,
  Mail,
  RefreshCw,
  LogOut,
  Plane,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/upcoming", label: "Upcoming", icon: Calendar },
  { href: "/past", label: "Archive", icon: Archive },
  { href: "/emails", label: "Inbox", icon: Mail },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [syncing, setSyncing] = useState(false);

  const syncMutation = trpc.gmail.sync.useMutation({
    onSuccess: (result) => {
      setSyncing(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-sans text-sm text-muted-foreground tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="mb-8">
            <Plane className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
            <h1 className="font-serif text-4xl font-bold text-foreground mb-2">Rita's<br />Travel Journal</h1>
            <p className="font-sans text-sm text-muted-foreground mt-3 tracking-wide">Private access only</p>
          </div>
          <button
            onClick={() => startLogin()}
            className="w-full bg-foreground text-background font-sans text-sm font-medium tracking-widest uppercase px-6 py-3 hover:opacity-80 transition-opacity"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border flex flex-col bg-card">
        {/* Logo / masthead */}
        <div className="px-5 pt-7 pb-5 rule-bottom">
          <div className="flex items-center gap-2 mb-1">
            <Plane className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
            <span className="font-sans text-xs tracking-widest uppercase text-muted-foreground">Travel Journal</span>
          </div>
          <h2 className="font-serif text-xl font-bold text-foreground leading-tight">Rita</h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className={`sidebar-link ${location === href ? "active" : ""}`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
              {label}
            </a>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 rule-top space-y-0.5">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="sidebar-link w-full text-left"
          >
            <RefreshCw className={`w-3.5 h-3.5 flex-shrink-0 ${syncing ? "animate-spin" : ""}`} strokeWidth={1.75} />
            {syncing ? "Syncing…" : "Sync Gmail"}
          </button>
          <button
            onClick={logout}
            className="sidebar-link w-full text-left"
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
