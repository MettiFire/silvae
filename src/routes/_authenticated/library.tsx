import { useRememberedState } from "@/lib/use-remembered-state";
import { UiText, UiElement } from "@/lib/ui-language-context";
import { isMangaId } from "@/lib/manga-model";
import { GENRE_GROUPS, genreGroups } from "@/lib/genre-groups";
import { pageSeo } from "@/lib/site-seo";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { BookGridSizeControl } from "@/components/BookGridSizeControl";
import { List } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BookCard, BookCover } from "@/components/BookCard";
import { LeafRating } from "@/components/LeafRating";
import { ProgressBar } from "@/components/ProgressBar";
import { useAuth } from "@/lib/auth";
import { STATUS_LABEL, useLibrary, useUpdateItem, type ReadingStatus } from "@/lib/library";
import { sortLibrary, type LibraryOrder } from "@/lib/library-order";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/library")({
  head: () =>
    pageSeo(
      "La mia libreria — Silvae",
      "Organizza libri letti, in lettura e da leggere, con voti, date e filtri per genere.",
      undefined,
      true,
    ),
  component: LibraryPage,
});

type View = "grid" | "list";

function LibraryPage() {
  const { user } = useAuth();
  const { data: items = [], isLoading, isError, refetch } = useLibrary(user?.id);
  const update = useUpdateItem();
  const [visible, setVisible] = useRememberedState<number>("library.visible", 40);
  const [tab, setTab] = useRememberedState<ReadingStatus>(
    "library.tab",
    "read",
    (value) => typeof value === "string" && Object.hasOwn(STATUS_LABEL, value),
  );
  const [order, setOrder] = useRememberedState<LibraryOrder>("library.order", "last-read");
  const [q, setQ] = useRememberedState<string>("library.q", "");
  const [view, setView] = useRememberedState<View>("library.view", "grid");
  const [onlyReview, setOnlyReview] = useRememberedState<boolean>("library.onlyReview", false);
  const [onlyFav, setOnlyFav] = useRememberedState<boolean>("library.onlyFav", false);
  const [minRating, setMinRating] = useRememberedState<number>("library.minRating", 0);
  const [genre, setGenre] = useRememberedState<string>("library.genre", "all");
  const [format, setFormat] = useRememberedState<string>("library.format", "all");
  const [year, setYear] = useRememberedState<string>("library.year", "all");

  const genres = useMemo(() => {
    const available = new Set(items.flatMap((i) => genreGroups(i.books?.categories ?? [])));
    return [...GENRE_GROUPS, { id: "other", label: "Altri / non classificati" }].filter((g) =>
      available.has(g.id),
    );
  }, [items]);
  const years = useMemo(
    () =>
      [...new Set(items.map((i) => i.books?.published_year).filter(Boolean))].sort(
        (a, b) => Number(b) - Number(a),
      ),
    [items],
  );

  const filtered = sortLibrary(
    items.filter((i) => {
      if (i.status !== tab) return false;
      if (format === "manga" && !isMangaId(i.book_id)) return false;
      if (format === "books" && isMangaId(i.book_id)) return false;
      if (onlyReview && !i.needs_review) return false;
      if (onlyFav && !i.favorite) return false;
      if (minRating && Number(i.rating ?? 0) < minRating) return false;
      if (genre !== "all" && !genreGroups(i.books?.categories ?? []).includes(genre)) return false;
      if (year !== "all" && String(i.books?.published_year ?? "") !== year) return false;
      const term = q.trim().toLowerCase();
      if (!term) return true;
      return (
        (i.books?.title ?? "").toLowerCase().includes(term) ||
        (i.books?.authors ?? []).join(" ").toLowerCase().includes(term)
      );
    }),
    order,
  );

  return (
    <AppShell>
      <PageHeader
        title="La mia libreria"
        subtitle={`${items.length} libri raccolti, una storia alla volta`}
      />

      <UiElement as="div" className="shelf-tabs" role="tablist" aria-label="Stato di lettura">
        {(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={tab === s}
            onClick={() => {
              setVisible(40);
              setTab(s);
              setOrder(s === "read" ? "last-read" : "added");
            }}
          >
            <UiText text={STATUS_LABEL[s]} /> ({items.filter((i) => i.status === s).length})
          </button>
        ))}
      </UiElement>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <UiElement
          as="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per titolo o autore"
          aria-label="Cerca nella libreria"
          className="h-9 min-w-[200px] flex-1 rounded-lg border border-border bg-card px-3 text-sm"
        />
        <UiElement
          as="select"
          aria-label="Formato"
          value={format}
          onChange={(e) => {
            setFormat(e.target.value);
            setVisible(40);
          }}
          className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
        >
          <option value="all">
            <UiText text="Libri e manga" />
          </option>
          <option value="books">
            <UiText text="Solo libri" />
          </option>
          <option value="manga">
            <UiText text="Serie manga" />
          </option>
        </UiElement>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} />{" "}
          <UiText text="Preferiti" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyReview}
            onChange={(e) => setOnlyReview(e.target.checked)}
          />{" "}
          <UiText text="Da verificare" />
        </label>
        <UiElement
          as="select"
          value={minRating}
          onChange={(e) => setMinRating(Number(e.target.value))}
          aria-label="Voto minimo"
          className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
        >
          <option value={0}>
            <UiText text="Ogni voto" />
          </option>
          <option value={3}>3+</option>
          <option value={4}>4+</option>
          <option value={4.5}>4.5+</option>
        </UiElement>
        <UiElement
          as="select"
          value={genre}
          onChange={(e) => {
            setGenre(e.target.value);
            setVisible(40);
          }}
          aria-label="Genere"
          className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
        >
          <option value="all">
            <UiText text="Ogni genere" />
          </option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>
              <UiText text={g.label} />
            </option>
          ))}
        </UiElement>
        <UiElement
          as="select"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          aria-label="Anno"
          className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
        >
          <option value="all">
            <UiText text="Ogni anno" />
          </option>
          {years.map((y) => (
            <option key={String(y)} value={String(y)}>
              {String(y)}
            </option>
          ))}
        </UiElement>
        <label className="flex items-center gap-2 text-sm">
          <UiText text="Ordina" />
          <UiElement
            as="select"
            aria-label="Ordina la libreria"
            value={order}
            onChange={(e) => setOrder(e.target.value as LibraryOrder)}
            className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
          >
            {tab === "read" && (
              <>
                <option value="last-read">
                  <UiText text="Ultimi letti" />
                </option>
                <option value="first-read">
                  <UiText text="Primi letti" />
                </option>
              </>
            )}
            <option value="added">
              <UiText text="Ultimi aggiunti" />
            </option>
            <option value="title">
              <UiText text="Titolo A–Z" />
            </option>
          </UiElement>
        </label>
        <div className="ml-auto flex gap-1">
          <BookGridSizeControl active={view === "grid"} onSelect={() => setView("grid")} />
          <UiElement
            as="button"
            type="button"
            title="Vista elenco"
            aria-label="Vista elenco"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            className={`rounded-lg border p-2 ${view === "list" ? "border-primary text-primary" : "border-border"}`}
          >
            <List className="h-4 w-4" />
          </UiElement>
        </div>
      </div>

      {tab === "read" && (order === "last-read" || order === "first-read") && (
        <p className="mb-4 text-xs text-muted-foreground">
          <UiText text="Ordine per data di fine lettura o ultima rilettura. I libri senza data sono in fondo." />
        </p>
      )}
      {isLoading && (
        <p className="text-sm text-muted-foreground">
          <UiText text="Caricamento…" />
        </p>
      )}
      {isError && (
        <p role="alert" className="editorial-empty">
          <UiText text="La libreria non si è caricata." />{" "}
          <button onClick={() => void refetch()} className="underline">
            <UiText text="Riprova" />
          </button>
        </p>
      )}
      {!isLoading && !isError && filtered.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          <UiText text="Nessun libro in questa sezione." />
        </p>
      )}

      {view === "list" ? (
        <div className="space-y-3">
          {filtered.slice(0, visible).map((i) => (
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
                  <p className="mt-1 text-xs text-primary">
                    <UiText text="Dati CSV da verificare" />
                  </p>
                )}
                {!isMangaId(i.book_id) && i.status === "reading" && (
                  <ProgressBar
                    className="mt-2 max-w-sm"
                    percentage={i.progress_percent}
                    current={i.current_page}
                    total={i.total_pages ?? 0}
                  />
                )}
              </div>
              <LeafRating
                value={i.rating != null ? Number(i.rating) : null}
                size={16}
                onChange={(v) => update.mutate({ id: i.id, patch: { rating: v } })}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="book-grid grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {filtered.slice(0, visible).map((i) =>
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
                      <p className="mt-1 text-xs text-primary">
                        <UiText text="Dati CSV da verificare" />
                      </p>
                    )}
                    {!isMangaId(i.book_id) && i.status === "reading" && (
                      <ProgressBar
                        className="mt-1"
                        percentage={i.progress_percent}
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
      {filtered.length > visible && (
        <button className="button-outline mt-8" onClick={() => setVisible(visible + 40)}>
          <UiText text="Mostra altri libri" />
        </button>
      )}
    </AppShell>
  );
}
