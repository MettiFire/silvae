import { UiText, UiElement } from "@/lib/ui-language-context";
import { UiLanguageProvider } from "@/lib/ui-language-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { WebApp } from "@/components/WebApp";
import { BackButton } from "@/components/BackButton";
import { Toaster } from "@/components/ui/sonner";

import { pageSeo, hasNotFoundMatch } from "@/lib/site-seo";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider, themeInitScript } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <BackButton className="mb-6" fallback="/" />
        <p className="mb-8 font-display text-2xl">
          <UiText text="Silvae." />
        </p>
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          <UiText text="Questa pagina è fuori catalogo." />
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          <UiText text="Il collegamento potrebbe essere cambiato. Puoi tornare al diario o cercare la tua prossima lettura nel catalogo." />
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <UiText text="Torna al diario" />
          </Link>
          <Link to="/discover" className="button-outline">
            <UiText text="Esplora i libri" />
          </Link>
        </div>
        <UiElement
          as="nav"
          aria-label="Documenti legali"
          className="mt-10 flex justify-center gap-5 text-xs text-muted-foreground"
        >
          <Link to="/privacy">
            <UiText text="Privacy" />
          </Link>
          <Link to="/terms">
            <UiText text="Termini e condizioni" />
          </Link>
        </UiElement>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: import("@tanstack/react-router").ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <BackButton className="mb-6" fallback="/" />
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          <UiText text="Questa pagina non si è caricata" />
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <UiText text="Qualcosa è andato storto. Riprova o torna alla home." />
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <UiText text="Riprova" />
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <UiText text="Home" />
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: ({ matches }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "theme-color", content: "#f5f3eb" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Silvae" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      ...pageSeo(
        hasNotFoundMatch(matches)
          ? "Pagina non trovata — Silvae"
          : "Silvae — Una vita tra le pagine",
        "Organizza le tue letture, crea liste, conserva citazioni e scopri nuovi libri su Silvae.",
        undefined,
        hasNotFoundMatch(matches),
      ).meta,
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preload",
        href: "/fonts/dm-sans-0.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/lora-1.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WebApp />
        <AuthProvider>
          <UiLanguageProvider>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            <Toaster position="top-right" />
          </UiLanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
