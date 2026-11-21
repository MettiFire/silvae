import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_layout")({ component: SiteLayout });

function SiteLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
