import { pageSeo } from "@/lib/site-seo";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { Fragments } from "@/components/Fragments";
export const Route = createFileRoute("/_app/_authenticated/fragments")({
  head: () =>
    pageSeo(
      "Frammenti: citazioni e note — Silvae",
      "Il tuo archivio privato di frasi, sottolineature e note, con importazione da Kindle, Kobo e Bookshelf.",
      undefined,
      true,
    ),
  component: () => (
    <>
      <PageHeader title="Frammenti" subtitle="Una raccolta delle parole che ti accompagnano" />
      <Fragments />
    </>
  ),
});
