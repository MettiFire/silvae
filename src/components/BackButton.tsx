import { useCanGoBack, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type BackFallback = "/" | "/discover" | "/profile" | "/library" | "/settings";

function pageFallback(pathname: string): BackFallback {
  if (
    pathname.startsWith("/book/") ||
    pathname.startsWith("/author/") ||
    pathname.startsWith("/list/")
  )
    return "/discover";
  if (pathname === "/devices") return "/settings";
  if (pathname === "/settings") return "/profile";
  if (pathname === "/import") return "/library";
  return "/";
}

/** Use actual navigation history; direct links fall back to a relevant section. */
export function BackButton({
  fallback,
  className,
}: {
  fallback?: BackFallback;
  className?: string;
}) {
  const router = useRouter();
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <button
      type="button"
      aria-label="Torna alla pagina precedente"
      onClick={() => {
        if (canGoBack) router.history.back();
        else void navigate({ to: fallback ?? pageFallback(pathname), replace: true });
      }}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-sm pr-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary",
        className,
      )}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      Indietro
    </button>
  );
}
