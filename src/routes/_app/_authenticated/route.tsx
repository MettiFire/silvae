import { UiText } from "@/lib/ui-language-context";
import { createFileRoute, Outlet, Navigate, useLocation } from "@tanstack/react-router";
import { authDestination } from "@/lib/auth-destination";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/_authenticated")({
  ssr: false,
  head: () => ({ meta: [{ name: "robots", content: "noindex, follow" }] }),
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  // The existing session provider gates the outlet; RLS authenticates data access.
  const { user, loading } = useAuth();
  const href = useLocation({ select: (location) => location.href });
  if (loading)
    return (
      <p role="status" className="p-8 text-sm">
        <UiText text="Verifica dell’accesso…" />
      </p>
    );
  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/auth" search={{ returnTo: authDestination(href) }} replace />
  );
}
