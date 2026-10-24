import { useTranslate } from "@/lib/use-ui-language";
import { UiText, UiElement } from "@/lib/ui-language-context";
import { UiLanguageSwitch } from "@/lib/ui-language-context";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
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
import { BackButton } from "@/components/BackButton";
import { Logo } from "@/components/Logo";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { profileLabel } from "@/lib/profile-model";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/localized-toast";
const NAV = [
  { to: "/", label: "Il diario", icon: Home },
  { to: "/discover", label: "Esplora", icon: Compass },
  { to: "/library", label: "Libreria", icon: Library },
  { to: "/challenges", label: "Sfide", icon: Target },
  { to: "/fragments", label: "Frammenti", icon: Quote },
  { to: "/social", label: "Lettori", icon: Users },
  { to: "/clubs", label: "Book club", icon: Users },
  { to: "/calendar", label: "Calendario", icon: CalendarDays },
  { to: "/stats", label: "Statistiche", icon: BarChart3 },
] as const;
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const density = useBookDensity();
  const { resolved, toggle } = useTheme();
  const { user, profile } = useAuth();
  const accountName = profile ? profileLabel(profile) : "Il mio profilo";
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
        <UiText text="Vai al contenuto" />
      </a>
      <ReadingPreferences onboarding />
      <header className="site-header">
        <div className="masthead site-width">
          <Link to="/" className="wordmark brand-lockup" aria-label={t("Silvae, pagina iniziale")}>
            <Logo className="brand-tree text-primary" />
            <span className="!text-foreground">
              <UiText text="Silvae" />
              <span>.</span>
            </span>
          </Link>
          <span className="masthead-caption">
            <UiText text="Una vita" />
            <br />
            <UiText text="tra le pagine" />
          </span>
          <div className="masthead-search">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <UiElement
              as="button"
              onClick={toggle}
              aria-label={resolved === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro"}
              className="icon-button"
            >
              {resolved === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </UiElement>
            {user ? (
              <>
                <Link
                  to="/settings"
                  aria-label={t("Impostazioni del profilo")}
                  className="icon-button"
                >
                  <Settings size={17} />
                </Link>
                <Link to="/profile" className="account-link" aria-label={t("Il mio profilo")}>
                  {profile?.avatar_url ? (
                    <UiElement
                      as="img"
                      src={profile.avatar_url}
                      alt=""
                      width={32}
                      height={32}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="account-initial">{accountName.slice(0, 1).toUpperCase()}</span>
                  )}
                  <span className="hidden max-w-40 truncate text-xs font-medium lg:inline">
                    {accountName}
                  </span>
                </Link>
              </>
            ) : (
              <Link to="/auth" className="button-ink whitespace-nowrap">
                <UiText text="Accedi " />
                <ArrowUpRight size={14} />
              </Link>
            )}
          </div>
        </div>
        <div className="site-width nav-rule">
          <UiElement as="nav" aria-label="Navigazione principale" className="desktop-nav">
            {NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="nav-link"
                activeProps={{ className: "nav-link is-active" }}
              >
                <UiText text={label} />
              </Link>
            ))}
          </UiElement>
          <span className="nav-note">
            <UiText text="Il tuo prossimo capitolo." />
          </span>
        </div>
      </header>
      <main
        id="contenuto"
        tabIndex={-1}
        className={`app-page site-width${pathname !== "/" ? " has-back" : ""}`}
      >
        {pathname !== "/" && <BackButton className="mb-5" />}
        {children}
      </main>
      <footer className="site-footer site-width">
        <UiLanguageSwitch />
        <Link
          to="/"
          className="brand-lockup font-display text-2xl"
          aria-label={t("Silvae, pagina iniziale")}
        >
          <Logo className="brand-tree text-primary" />
          <UiText text="Silvae." />
        </Link>
        <p>
          <UiText text="Le storie passano. Qualcosa resta." />
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {user && (
            <>
              <Link to="/settings">
                <UiText text="Impostazioni" />
              </Link>
              <button
                disabled={loggingOut}
                onClick={() => void signOut()}
                className="inline-flex items-center gap-1"
              >
                <LogOut size={12} />
                <UiText text="Esci" />
              </button>
            </>
          )}
          <Link to="/discover">
            <UiText text="Esplora il catalogo" />
          </Link>
          <Link to="/privacy">
            <UiText text="Privacy" />
          </Link>
          <Link to="/terms">
            <UiText text="Termini e condizioni" />
          </Link>
        </div>
      </footer>
      <UiElement as="nav" aria-label="Navigazione mobile" className="mobile-nav">
        {[NAV[0], NAV[1], NAV[2], { to: "/profile", label: "Profilo", icon: User } as const].map(
          ({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "is-active" }}
            >
              <Icon size={19} />
              <span>
                <UiText text={label} />
              </span>
            </Link>
          ),
        )}
        <button
          aria-expanded={more}
          aria-controls="mobile-other-nav"
          onClick={() => setMore(!more)}
        >
          <MoreHorizontal size={20} />
          <span>
            <UiText text="Altro" />
          </span>
        </button>
      </UiElement>
      {more && (
        <div className="mobile-menu" id="mobile-other-nav">
          <div className="mb-4 flex items-center justify-between">
            <span className="eyebrow">
              <UiText text="Il tuo spazio" />
            </span>
            <button onClick={() => setMore(false)} className="text-sm">
              <UiText text="Chiudi" />
            </button>
          </div>
          {NAV.slice(3).map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setMore(false)}>
              <Icon size={17} />
              <UiText text={label} />
            </Link>
          ))}
          <Link to="/settings" onClick={() => setMore(false)}>
            <Settings size={17} />
            <UiText text="Impostazioni" />
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
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">
          <UiText text="Silvae / Il tuo spazio" />
        </p>
        <h1>
          <UiText text={title} />
        </h1>
        {subtitle && (
          <p className="page-subtitle">
            <UiText text={subtitle} />
          </p>
        )}
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
        <UiText text={title} />
      </h2>
      {children}
    </div>
  );
}
