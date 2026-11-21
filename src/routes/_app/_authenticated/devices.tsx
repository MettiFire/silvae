import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_app/_authenticated/devices")({
  beforeLoad: () => {
    throw redirect({ to: "/settings", search: { section: "devices" } });
  },
});
