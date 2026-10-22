import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ReaderConnections } from "@/components/ReaderConnections";
export const Route = createFileRoute("/_authenticated/devices")({
  head: () => ({ meta: [{ title: "Dispositivi — Paginae" }] }),
  component: () => (
    <AppShell>
      <PageHeader
        title="Dispositivi"
        subtitle="Kindle, Kobo e KOReader: scegli come collegare il tuo lettore"
      />
      <ReaderConnections />
    </AppShell>
  ),
});
