import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  Compass,
  Home,
  Library,
  LogOut,
  Moon,
  Sun,
  Target,
  Upload,
  User,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { ReadingPreferences } from "@/components/ReadingPreferences";
import { BookGridSizeControl } from "@/components/BookGridSizeControl";
import { useBookDensity } from "@/lib/book-density";
import { Logo } from "@/components/Logo";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/library", label: "La mia libreria", icon: Library },
  { to: "/challenges", label: "Sfide", icon: Target },
  { to: "/calendar", label: "Calendario", icon: CalendarDays },
  { to: "/social", label: "Social", icon: Users },
  { to: "/stats", label: "Statistiche", icon: BarChart3 },
  { to: "/profile", label: "Profilo", icon: User },
  { to: "/import", label: "Importa CSV", icon: Upload },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const density = useBookDensity();
  const { resolved, toggle } = useTheme();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div data-book-density={density} className="flex min-h-screen bg-background">
      <ReadingPreferences onboarding />
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 md:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 px-2">
          <Logo className="h-7 w-7 text-primary" />
          <span className="font-display text-lg font-bold tracking-tight">Paginae</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-primary" }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        {user ? (
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              void navigate({ to: "/auth" });
            }}
            className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
            Esci {profile?.username ? `(@${profile.username})` : ""}
          </button>
        ) : (
          <Link
            to="/auth"
            className="mt-4 rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
          >
            Accedi
          </Link>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <Link to="/" className="md:hidden">
            <Logo className="h-6 w-6 text-primary" />
          </Link>
          <GlobalSearch />
          <button
            type="button"
            onClick={toggle}
            aria-label="Cambia tema"
            className="ml-auto rounded-lg border border-border bg-card p-2 transition hover:bg-accent"
          >
            {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>
        <nav
          aria-label="Altre sezioni"
          className="flex gap-4 overflow-x-auto border-b border-border px-4 py-2 text-xs md:hidden"
        >
          {NAV.slice(5).map(({ to, label }) => (
            <Link key={to} to={to} className="shrink-0 py-1">
              {label}
            </Link>
          ))}
          {!user && (
            <Link to="/auth" className="shrink-0 py-1 text-primary">
              Accedi
            </Link>
          )}
        </nav>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mb-4 flex justify-end">
            <BookGridSizeControl />
          </div>
          {children}
        </main>
        <nav className="sticky bottom-0 flex justify-around border-t border-border bg-background/95 py-2 backdrop-blur md:hidden">
          {NAV.slice(0, 5).map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 px-2 text-[10px] text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="h-5 w-5" />
              {label.split(" ")[0]}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-3")}>
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
