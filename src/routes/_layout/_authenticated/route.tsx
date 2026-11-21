import { UiText } from "@/lib/ui-language-context";
import {
  createFileRoute,
  Outlet,
  Navigate,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { authDestination } from "@/lib/auth-destination";
import { useAuth } from "@/lib/auth";
import { resolvedSignIn } from "@/lib/auth-session";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_layout/_authenticated")({
  ssr: false,
  head: () => ({ meta: [{ name: "robots", content: "noindex, follow" }] }),
  beforeLoad: ({ context, location }) => {
    const signedIn = resolvedSignIn.get(context.queryClient);
    const requireLogin = () => {
      throw redirect({
        to: "/auth",
        search: { returnTo: authDestination(location.href) },
      });
    };
    if (signedIn === true) return;
    if (signedIn === false) return requireLogin();
    // Deep links can be matched before the session provider has initialized.
    return supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session?.user) requireLogin();
    });
  },
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
