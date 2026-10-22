import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  Compass,
  Home,
  Quote,
  Library,
  LogOut,
  Moon,
  Sun,
  Target,
  User,
  Users,
  Settings,
  MoreHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { ReadingPreferences } from "@/components/ReadingPreferences";
import { useBookDensity } from "@/lib/book-density";
import { Logo } from "@/components/Logo";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
const NAV = [
  { to: "/", label: "Il diario", icon: Home },
  { to: "/discover", label: "Esplora", icon: Compass },
  { to: "/library", label: "Libreria", icon: Library },
  { to: "/challenges", label: "Sfide", icon: Target },
  { to: "/fragments", label: "Frammenti", icon: Quote },
  { to: "/social", label: "Lettori", icon: Users },
  { to: "/calendar", label: "Calendario", icon: CalendarDays },
  { to: "/stats", label: "Statistiche", icon: BarChart3 },
] as const;
export function AppShell({ children }: { children: ReactNode }) {
  const density = useBookDensity();
  const { resolved, toggle } = useTheme();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [more, setMore] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  async function signOut() {
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      void navigate({ to: "/auth" });
    } catch {
      toast.error("Non è stato possibile uscire. Riprova.");
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <div data-book-density={density} className="app-shell min-h-screen bg-background">
      <a href="#contenuto" className="skip-link">
        Vai al contenuto
      </a>
      <ReadingPreferences onboarding />
      <header className="site-header">
        <div className="masthead site-width">
          <Link
            to="/"
            className="wordmark inline-flex items-center gap-2"
            aria-label="Silvae, pagina iniziale"
          >
            <Logo className="h-12 w-12 text-primary" />
            <span className="!text-foreground">
              Silvae<span>.</span>
            </span>
          </Link>
          <span className="masthead-caption">
            Una vita
            <br />
            tra le pagine
          </span>
          <div className="masthead-search">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggle}
              aria-label={resolved === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro"}
              className="icon-button"
            >
              {resolved === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {user ? (
              <>
                <Link to="/settings" aria-label="Impostazioni del profilo" className="icon-button">
                  <Settings size={17} />
                </Link>
                <Link to="/profile" className="account-link" aria-label="Il mio profilo">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      width={32}
                      height={32}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="account-initial">
                      {(profile?.display_name || profile?.username || "L")
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                  )}
                  <span className="hidden text-xs font-medium lg:inline">
                    {profile?.display_name || profile?.username || "Il mio profilo"}
                  </span>
                </Link>
              </>
            ) : (
              <Link to="/auth" className="button-ink whitespace-nowrap">
                Accedi <ArrowUpRight size={14} />
              </Link>
            )}
          </div>
        </div>
        <div className="site-width nav-rule">
          <nav aria-label="Navigazione principale" className="desktop-nav">
            {NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="nav-link"
                activeProps={{ className: "nav-link is-active" }}
              >
                {label}
              </Link>
            ))}
          </nav>
          <span className="nav-note">Il tuo prossimo capitolo.</span>
        </div>
      </header>
      <main id="contenuto" tabIndex={-1} className="app-page site-width">
        {children}
      </main>
      <footer className="site-footer site-width">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-display text-2xl"
          aria-label="Silvae, pagina iniziale"
        >
          <Logo className="h-10 w-10 text-primary" />
          Silvae.
        </Link>
        <p>Le storie passano. Qualcosa resta.</p>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {user && (
            <>
              <Link to="/settings">Impostazioni</Link>
              <button
                disabled={loggingOut}
                onClick={() => void signOut()}
                className="inline-flex items-center gap-1"
              >
                <LogOut size={12} />
                Esci
              </button>
            </>
          )}
          <Link to="/discover">Esplora il catalogo</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Termini e condizioni</Link>
        </div>
      </footer>
      <nav aria-label="Navigazione mobile" className="mobile-nav">
        {[NAV[0], NAV[1], NAV[2], { to: "/profile", label: "Profilo", icon: User } as const].map(
          ({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "is-active" }}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ),
        )}
        <button
          aria-expanded={more}
          aria-controls="mobile-other-nav"
          onClick={() => setMore(!more)}
        >
          <MoreHorizontal size={20} />
          <span>Altro</span>
        </button>
      </nav>
      {more && (
        <div className="mobile-menu" id="mobile-other-nav">
          <div className="mb-4 flex items-center justify-between">
            <span className="eyebrow">Il tuo spazio</span>
            <button onClick={() => setMore(false)} className="text-sm">
              Chiudi
            </button>
          </div>
          {NAV.slice(3).map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setMore(false)}>
              <Icon size={17} />
              {label}
            </Link>
          ))}
          <Link to="/settings" onClick={() => setMore(false)}>
            <Settings size={17} />
            Impostazioni
          </Link>
        </div>
      )}
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
    <header className="page-heading">
      <div>
        <p className="eyebrow">Silvae / Il tuo spazio</p>
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="page-actions">{action}</div>}
    </header>
  );
}
export function SectionHeading({
  title,
  number,
  children,
}: {
  title: string;
  number?: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>
        {number && <span>{number}</span>}
        {title}
      </h2>
      {children}
    </div>
  );
}
