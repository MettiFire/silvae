import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BookCard } from "@/components/BookCard";
import { booksByAuthor } from "@/lib/books";

export const Route = createFileRoute("/author/$author")({
  head: () => ({
    meta: [
      { title: "Autore — Paginae" },
      { name: "description", content: "Tutti i libri dell'autore disponibili su Paginae." },
      { property: "og:title", content: "Autore — Paginae" },
      { property: "og:description", content: "Tutti i libri dell'autore." },
    ],
  }),
  component: AuthorPage,
});

function AuthorPage() {
  const { author } = Route.useParams();
  const { data = [], isLoading } = useQuery({
    queryKey: ["author", author],
    queryFn: () => booksByAuthor(author),
  });

  return (
    <AppShell>
      <PageHeader title={author} subtitle={`${data.length} libri trovati`} />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {data.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
