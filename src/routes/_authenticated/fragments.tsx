import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Fragments } from "@/components/Fragments";
export const Route = createFileRoute("/_authenticated/fragments")({
  head: () => ({
    meta: [
      { title: "Frammenti — Paginae" },
      {
        name: "description",
        content: "Il tuo archivio privato di citazioni, sottolineature e note.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <PageHeader title="Frammenti" subtitle="Una raccolta delle parole che ti accompagnano" />
      <Fragments />
    </AppShell>
  ),
});
