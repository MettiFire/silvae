import { isServer, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { RoutePending } from "./components/RoutePending";
import { routeTree } from "./routeTree.gen";

// After a new publish, old tabs may request page files that no longer exist.
// Reload once to pick up the fresh version instead of showing a blank screen.
if (typeof window !== "undefined") {
  const KEY = "silvae-chunk-reload";
  const reloadOnce = () => {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 10000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
    return true;
  };
  // Never call preventDefault here: it makes the failed import resolve to
  // undefined, and the router then crashes reading `.component` of it.
  window.addEventListener("vite:preloadError", () => {
    reloadOnce();
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = String((e.reason as Error)?.message ?? e.reason ?? "");
    if (/dynamically imported module|Importing a module script failed/i.test(msg)) reloadOnce();
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, gcTime: isServer ? Infinity : 15 * 60_000 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPendingComponent: RoutePending,
    defaultPendingMs: 200,
    defaultPendingMinMs: 0,
    defaultPreloadDelay: 80,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
