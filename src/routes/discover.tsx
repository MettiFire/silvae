import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BookGridSizeControl } from "@/components/BookGridSizeControl";
import { BookCard } from "@/components/BookCard";
import { discoverBooks, GENRES } from "@/lib/books";
import { toast } from "sonner";
import { useBookRecommendations } from "@/lib/use-book-recommendations";
import { useRecommendationWorkFilter } from "@/lib/use-recommendation-work-filter";
import { supabase } from "@/integrations/supabase/client";

const GENRE_LABELS: Record<string, string> = {
  Fiction: "Romanzi",
  Nonfiction: "Saggistica",
  Fantasy: "Fantasy",
  "Science Fiction": "Fantascienza",
  Mystery: "Gialli",
  Thriller: "Thriller",
  Romance: "Romance",
  History: "Storia",
  Biography: "Biografie e memoir",
  Philosophy: "Filosofia",
  Poetry: "Poesia",
  Science: "Scienza e natura",
  Business: "Economia e impresa",
};
export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Esplora — Paginae" },
      {
        name: "description",
        content: "Scopri nuovi libri per genere, anno e rating, con consigli personalizzati.",
      },
      { property: "og:title", content: "Discover — Paginae" },
      { property: "og:description", content: "Scopri nuovi libri e consigli su misura." },
    ],
  }),
  component: Discover,
});

function Discover() {
  const {
    user,
    library,
    preferences,
    language,
    languageReady,
    dismissed,
    recommended,
    recsLoading,
    recsError,
    retryRecs,
    refresh,
    libraryReady,
  } = useBookRecommendations();
  const qc = useQueryClient();
  const [genre, setGenre] = useState("all");
  const [year, setYear] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [order, setOrder] = useState<"relevance" | "newest">("relevance");

  const owned = useMemo(() => new Set(library.map((i) => i.book_id)), [library]);

  const {
    data: results = [],
    isFetching,
    isPending: cataloguePending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["discover", genre, year, order, language ?? "any"],
    enabled: languageReady,
    queryFn: () => discoverBooks({ genre, year, order, language }),
  });

  const dismiss = async (bookId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("dismissed_books")
      .insert({ user_id: user.id, book_id: bookId });
    if (error && error.code !== "23505") {
      toast.error("Non è stato possibile salvare la scelta. Riprova.");
      return;
    }
    void qc.invalidateQueries({ queryKey: ["dismissed"] });
  };

  const excluded = useMemo(
    () => library.flatMap((item) => (item.books ? [item.books] : [])),
    [library],
  );
  const { eligible, verifying: catalogueVerifying } = useRecommendationWorkFilter(
    results,
    excluded,
  );
  const filtered = libraryReady
    ? eligible.filter(
        (b) =>
          !owned.has(b.id) && !dismissed.includes(b.id) && (b.average_rating ?? 0) >= minRating,
      )
    : [];

  return (
    <AppShell>
      <PageHeader
        title="Esplora"
        subtitle="Segui una curiosità. Trova una storia."
        action={<BookGridSizeControl />}
      />

      {(recsLoading || recsError || recommended.length > 0 || user) && (
        <section className="mb-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">
                {user &&
                (preferences?.liked.length || library.some((i) => i.status !== "abandoned"))
                  ? "Consigliati per te"
                  : "Da dove iniziare"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {preferences?.status === "completed"
                  ? "Dai tuoi gusti e dai libri letti, in lettura e da leggere."
                  : library.some((i) => i.status !== "abandoned")
                    ? "Dai generi e dagli autori della tua libreria, anche dei libri da leggere."
                    : "Una selezione varia per iniziare a esplorare."}
              </p>
              {user && (
                <Link to="/profile" className="mt-1 inline-block text-xs text-primary">
                  {preferences?.status === "completed"
                    ? "Modifica i tuoi gusti"
                    : "Scegli i tuoi gusti per consigli più personali"}{" "}
                  →
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={refresh}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
            >
              <RefreshCw className="h-4 w-4" /> Rinnova
            </button>
          </div>
          {recsLoading && (
            <p className="mb-3 text-sm text-muted-foreground" role="status">
              Cerchiamo le tue prossime letture…
            </p>
          )}
          {recsError && (
            <p className="mb-3 text-sm" role="alert">
              I consigli non sono disponibili.{" "}
              <button onClick={() => void retryRecs()} className="text-primary">
                Riprova
              </button>
            </p>
          )}
          {!recsLoading && !recsError && !recommended.length && (
            <p className="mb-3 text-sm text-muted-foreground">
              Nessun nuovo consiglio in questa selezione. Premi Rinnova oppure modifica i tuoi
              gusti.
            </p>
          )}
          <div className="book-grid grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {recommended.map(({ book: b, reason }) => (
              <div key={b.id} className="relative">
                <BookCard book={b} />
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{reason}</p>
                {user && (
                  <button
                    type="button"
                    onClick={() => void dismiss(b.id)}
                    aria-label="Non mi interessa"
                    className="absolute left-2 top-2 rounded-full bg-card/85 p-1.5 backdrop-blur transition hover:bg-accent"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select
          value={genre}
          onChange={setGenre}
          label="Genere"
          options={[
            ["all", "Tutti i generi"],
            ...GENRES.map((g) => [g, GENRE_LABELS[g] ?? g] as [string, string]),
          ]}
        />
        <Select
          value={year}
          onChange={setYear}
          label="Anno"
          options={[
            ["all", "Qualsiasi anno"],
            ["2020", "Dal 2020"],
            ["2010", "Dal 2010"],
            ["2000", "Dal 2000"],
          ]}
        />
        <Select
          value={String(minRating)}
          onChange={(v) => setMinRating(Number(v))}
          label="Voto del catalogo"
          options={[
            ["0", "Qualsiasi voto"],
            ["3", "3+"],
            ["4", "4+"],
            ["4.5", "4.5+"],
          ]}
        />
        <Select
          value={order}
          onChange={(v) => setOrder(v as "relevance" | "newest")}
          label="Ordina"
          options={[
            ["relevance", "Rilevanza"],
            ["newest", "Novità"],
          ]}
        />
      </div>

      {catalogueVerifying && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          Controllo che i libri proposti siano letture nuove per te…
        </p>
      )}
      {isError && (
        <p role="alert" className="mb-4 text-sm">
          Impossibile caricare il catalogo.{" "}
          <button className="text-primary" onClick={() => void refetch()}>
            Riprova
          </button>
        </p>
      )}
      {!cataloguePending &&
        !isFetching &&
        !isError &&
        !catalogueVerifying &&
        libraryReady &&
        !filtered.length && (
          <p className="text-sm text-muted-foreground">
            Nessun libro con questi filtri. Prova un altro genere o riduci il voto minimo.
          </p>
        )}
      {cataloguePending || isFetching ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : (
        <div className="book-grid grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
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
