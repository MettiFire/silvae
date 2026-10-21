import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Grid2x2, List } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BookCard, BookCover } from "@/components/BookCard";
import { BookmarkRating } from "@/components/BookmarkRating";
import { ProgressBar } from "@/components/ProgressBar";
import { useAuth } from "@/lib/auth";
import { STATUS_LABEL, useLibrary, useUpdateItem, type ReadingStatus } from "@/lib/library";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "La mia libreria — Paginae" },
      {
        name: "description",
        content: "Tutti i tuoi libri per stato di lettura, con filtri, voti e progresso.",
      },
      { property: "og:title", content: "La mia libreria — Paginae" },
      { property: "og:description", content: "I tuoi libri per stato, voto e genere." },
    ],
  }),
  component: LibraryPage,
});

type View = "grid" | "list";

function LibraryPage() {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useLibrary(user?.id);
  const update = useUpdateItem();
  const [tab, setTab] = useState<ReadingStatus>("reading");
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("grid");
  const [onlyReview, setOnlyReview] = useState(false);
  const [onlyFav, setOnlyFav] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [genre, setGenre] = useState("all");
  const [year, setYear] = useState("all");

  const genres = useMemo(
    () => [...new Set(items.flatMap((i) => i.books?.categories ?? []))].sort(),
    [items],
  );
  const years = useMemo(
    () =>
      [...new Set(items.map((i) => i.books?.published_year).filter(Boolean))].sort(
        (a, b) => Number(b) - Number(a),
      ),
    [items],
  );

  const filtered = items.filter((i) => {
    if (i.status !== tab) return false;
    if (onlyReview && !i.needs_review) return false;
    if (onlyFav && !i.favorite) return false;
    if (minRating && Number(i.rating ?? 0) < minRating) return false;
    if (genre !== "all" && !(i.books?.categories ?? []).includes(genre)) return false;
    if (year !== "all" && String(i.books?.published_year ?? "") !== year) return false;
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return (
      (i.books?.title ?? "").toLowerCase().includes(term) ||
      (i.books?.authors ?? []).join(" ").toLowerCase().includes(term)
    );
  });

  return (
    <AppShell>
      <PageHeader title="La mia libreria" subtitle={`${items.length} libri in totale`} />

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTab(s)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              tab === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-accent"
            }`}
          >
            {STATUS_LABEL[s]} ({items.filter((i) => i.status === s).length})
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per titolo o autore"
          aria-label="Cerca nella libreria"
          className="h-9 min-w-[200px] flex-1 rounded-lg border border-border bg-card px-3 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} />{" "}
          Preferiti
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyReview}
            onChange={(e) => setOnlyReview(e.target.checked)}
          />{" "}
          Da verificare
        </label>
        <select
          value={minRating}
          onChange={(e) => setMinRating(Number(e.target.value))}
          aria-label="Voto minimo"
          className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
        >
          <option value={0}>Ogni voto</option>
          <option value={3}>3+</option>
          <option value={4}>4+</option>
          <option value={4.5}>4.5+</option>
        </select>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          aria-label="Genere"
          className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
        >
          <option value="all">Ogni genere</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          aria-label="Anno"
          className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
        >
          <option value="all">Ogni anno</option>
          {years.map((y) => (
            <option key={String(y)} value={String(y)}>
              {String(y)}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-1">
          {(
            [
              ["grid", Grid2x2],
              ["list", List],
            ] as const
          ).map(([v, Icon]) => (
            <button
              key={v}
              type="button"
              aria-label={v === "grid" ? "Vista griglia" : "Vista elenco"}
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`rounded-lg border p-2 ${view === v ? "border-primary text-primary" : "border-border"}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Caricamento…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Nessun libro in questa sezione.
        </p>
      )}

      {view === "list" ? (
        <div className="space-y-3">
          {filtered.map((i) => (
            <div key={i.id} className="flex gap-4 rounded-xl border border-border bg-card p-3">
              <Link to="/book/$bookId" params={{ bookId: i.book_id }} className="w-12 shrink-0">
                {i.books && <BookCover book={i.books} />}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  to="/book/$bookId"
                  params={{ bookId: i.book_id }}
                  className="font-display font-semibold hover:underline"
                >
                  {i.books?.title}
                </Link>
                <p className="text-xs text-muted-foreground">{i.books?.authors.join(", ")}</p>
                {i.needs_review && (
                  <p className="mt-1 text-xs text-primary">Dati CSV da verificare</p>
                )}
                {i.status === "reading" && (
                  <ProgressBar
                    className="mt-2 max-w-sm"
                    current={i.current_page}
                    total={i.total_pages ?? 0}
                  />
                )}
              </div>
              <BookmarkRating
                value={i.rating != null ? Number(i.rating) : null}
                size={16}
                onChange={(v) => update.mutate({ id: i.id, patch: { rating: v } })}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="book-grid grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {filtered.map((i) =>
            i.books ? (
              <BookCard
                key={i.id}
                book={i.books}
                rating={i.rating != null ? Number(i.rating) : null}
                favorite={i.favorite}
                onToggleFavorite={() =>
                  update.mutate({ id: i.id, patch: { favorite: !i.favorite } })
                }
                footer={
                  <>
                    {i.needs_review && (
                      <p className="mt-1 text-xs text-primary">Dati CSV da verificare</p>
                    )}
                    {i.status === "reading" && (
                      <ProgressBar
                        className="mt-1"
                        current={i.current_page}
                        total={i.total_pages ?? 0}
                        showLabel={false}
                      />
                    )}
                  </>
                }
              />
            ) : null,
          )}
        </div>
      )}
    </AppShell>
  );
}
