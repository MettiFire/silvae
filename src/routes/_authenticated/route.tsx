import { UiText } from "@/lib/ui-language-context";
import { createFileRoute, Outlet, Navigate, redirect, useLocation } from "@tanstack/react-router";
import { authDestination } from "@/lib/auth-destination";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({ meta: [{ name: "robots", content: "noindex, follow" }] }),
  beforeLoad: async ({ location }) => {
    // This client-only gate chooses a screen; data access is enforced by RLS
    // and mutations still verify the current user on the server.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user)
      throw redirect({ to: "/auth", search: { returnTo: authDestination(location.href) } });
    return { user: data.session.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <p role="status" className="p-8 text-sm">
        <UiText text="Verifica dell’accesso…" />
      </p>
    );
  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/auth" search={{ returnTo: authDestination(location.href) }} replace />
  );
}
