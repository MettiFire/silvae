import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BookCard } from "@/components/BookCard";
import { discoverBooks, searchBooks, GENRES, type Book } from "@/lib/books";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Paginae" },
      { name: "description", content: "Scopri nuovi libri per genere, anno e rating, con consigli personalizzati." },
      { property: "og:title", content: "Discover — Paginae" },
      { property: "og:description", content: "Scopri nuovi libri e consigli su misura." },
    ],
  }),
  component: Discover,
});

function Discover() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: library = [] } = useLibrary(user?.id);
  const [genre, setGenre] = useState("all");
  const [year, setYear] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [order, setOrder] = useState<"relevance" | "newest">("relevance");
  const [seed, setSeed] = useState(0);

  const { data: dismissed = [] } = useQuery({
    queryKey: ["dismissed", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("dismissed_books").select("book_id").eq("user_id", user!.id);
      return (data ?? []).map((r) => r.book_id as string);
    },
  });

  const owned = useMemo(() => new Set(library.map((i) => i.book_id)), [library]);
  const exclude = (list: Book[]) => list.filter((b) => !owned.has(b.id) && !dismissed.includes(b.id));

  const { data: results = [], isFetching, isError, refetch } = useQuery({
    queryKey: ["discover", genre, year, order],
    queryFn: () => discoverBooks({ genre, year, order }),
  });

  // Client-side recommendations: favourite genres + highly rated + favourites.
  const topGenres = useMemo(() => {
    const counts = new Map<string, number>();
    library.forEach((i) => {
      const weight = (i.favorite ? 2 : 0) + (Number(i.rating ?? 0) >= 4 ? 2 : 0) + (i.status === "read" ? 1 : 0);
      (i.books?.categories ?? []).forEach((c) => counts.set(c, (counts.get(c) ?? 0) + Math.max(1, weight)));
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
  }, [library]);

  const { data: recs = [] } = useQuery({
    queryKey: ["recs", topGenres.join("|"), seed, user?.id],
    enabled: !!user && topGenres.length > 0,
    queryFn: async () => {
      const lists = await Promise.all(
        topGenres.map((g) => searchBooks(`subject:"${g}"`, { max: 12, startIndex: seed * 12 })),
      );
      return lists.flat();
    },
  });

  const dismiss = async (bookId: string) => {
    if (!user) return;
    await supabase.from("dismissed_books").insert({ user_id: user.id, book_id: bookId });
    void qc.invalidateQueries({ queryKey: ["dismissed"] });
  };

  const filtered = exclude(results).filter((b) => (b.average_rating ?? 0) >= minRating);
  const recommended = exclude(recs).filter((b) => (b.average_rating ?? 0) >= 0).slice(0, 12);

  return (
    <AppShell>
      <PageHeader title="Discover" subtitle="Trova la tua prossima lettura" />

      {user && recommended.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Consigliati per te</h2>
            <button
              type="button"
              onClick={() => setSeed((s) => s + 1)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
            >
              <RefreshCw className="h-4 w-4" /> Rinnova
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {recommended.map((b) => (
              <div key={b.id} className="relative">
                <BookCard book={b} />
                <button
                  type="button"
                  onClick={() => dismiss(b.id)}
                  aria-label="Non mi interessa"
                  className="absolute left-2 top-2 rounded-full bg-card/85 p-1.5 backdrop-blur transition hover:bg-accent"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={genre} onChange={setGenre} label="Genere" options={[["all", "Tutti i generi"], ...GENRES.map((g) => [g, g] as [string, string])]} />
        <Select
          value={year}
          onChange={setYear}
          label="Anno"
          options={[["all", "Qualsiasi anno"], ["2020", "Dal 2020"], ["2010", "Dal 2010"], ["2000", "Dal 2000"]]}
        />
        <Select
          value={String(minRating)}
          onChange={(v) => setMinRating(Number(v))}
          label="Rating minimo"
          options={[["0", "Qualsiasi rating"], ["3", "3+"], ["4", "4+"], ["4.5", "4.5+"]]}
        />
        <Select
          value={order}
          onChange={(v) => setOrder(v as "relevance" | "newest")}
          label="Ordina"
          options={[["relevance", "Popolarità"], ["newest", "Novità"]]}
        />
      </div>

      {isError && <p role="alert" className="mb-4 text-sm">Impossibile caricare il catalogo. <button className="text-primary" onClick={() => void refetch()}>Riprova</button></p>}
      {!isFetching && !isError && !filtered.length && <p className="text-sm text-muted-foreground">Nessun libro con questi filtri. Prova un altro genere o riduci il voto minimo.</p>}
      {isFetching ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {filtered.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Select({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: [string, string][];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
