import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BookClubs } from "@/components/BookClubs";
import { pageSeo } from "@/lib/site-seo";
export const Route = createFileRoute("/_authenticated/clubs")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { club?: string | undefined; topic?: string | undefined } => ({
    club:
      typeof s["club"] === "string" && /^[a-f0-9-]{36}$/i.test(s["club"]) ? s["club"] : undefined,
    topic:
      typeof s["topic"] === "string" && /^[a-f0-9-]{36}$/i.test(s["topic"])
        ? s["topic"]
        : undefined,
  }),
  head: () =>
    pageSeo(
      "Book club — Silvae",
      "Incontra altri lettori, scegli un libro e condividi le tue letture nei book club di Silvae.",
      undefined,
      true,
    ),
  component: ClubPage,
});
function ClubPage() {
  const { club, topic } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <AppShell>
      <PageHeader
        title="Book club"
        subtitle="Lo stesso libro, tante prospettive. Uno spazio per leggere insieme."
      />
      <BookClubs
        key={`${club ?? "all"}:${topic ?? ""}`}
        clubId={club}
        topicId={topic}
        onOpen={(club, topic) => void navigate({ to: "/clubs", search: { club, topic } })}
      />
    </AppShell>
  );
}
