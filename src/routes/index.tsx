import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Sparkles } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { BookCard } from "@/components/BookCard";
import { useBookRecommendations } from "@/lib/use-book-recommendations";
import { ProgressBar } from "@/components/ProgressBar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paginae — Traccia le tue letture" },
      {
        name: "description",
        content:
          "Home di Paginae: continua le letture in corso, segui gli amici e scopri nuovi libri.",
      },
      { property: "og:title", content: "Paginae — Traccia le tue letture" },
      { property: "og:description", content: "Continua le letture in corso e scopri nuovi libri." },
    ],
  }),
  component: Home,
});

function Home() {
  const {
    user,
    library,
    recommended,
    recsLoading: isPending,
    recsError: isError,
    retryRecs: refetch,
    refresh,
  } = useBookRecommendations();
  const reading = library.filter((i) => i.status === "reading");
  const finished = library.filter((i) => i.status === "read");

  return (
    <AppShell>
      {!user && (
        <section className="mb-10 overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-paper md:p-12">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Un Goodreads moderno, sobrio e
            letterario
          </p>
          <h1 className="max-w-2xl font-display text-3xl font-extrabold leading-tight md:text-5xl">
            Ogni libro che leggi, al suo posto.
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Traccia il progresso pagina per pagina, dai il tuo voto, crea liste, sfide annuali e
            segui cosa leggono gli amici.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              to="/auth"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Inizia ora
            </Link>
            <Link
              to="/discover"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold"
            >
              Esplora libri
            </Link>
          </div>
        </section>
      )}

      {user && (
        <>
          <PageHeader title="Bentornato" subtitle="Riprendi da dove avevi lasciato" />
          {reading.length === 0 ? (
            <p className="mb-10 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Nessuna lettura in corso.{" "}
              <Link to="/discover" className="text-primary">
                Scopri qualcosa di nuovo
              </Link>
              .
            </p>
          ) : (
            <div className="mb-10 grid gap-4 md:grid-cols-2">
              {reading.map((item) => (
                <Link
                  key={item.id}
                  to="/book/$bookId"
                  params={{ bookId: item.book_id }}
                  className="flex gap-4 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
                >
                  <div className="w-16 shrink-0">
                    {item.books && (
                      <img src={item.books.cover_url ?? ""} alt="" className="cover-frame" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 font-display font-semibold">{item.books?.title}</h3>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {item.books?.authors.join(", ")}
                    </p>
                    <ProgressBar
                      className="mt-3"
                      current={item.current_page}
                      percentage={item.progress_percent}
                      total={item.total_pages ?? item.books?.page_count ?? 0}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Libri letti" value={finished.length} />
            <Stat label="In lettura" value={reading.length} />
            <Stat label="Da leggere" value={library.filter((i) => i.status === "to_read").length} />
            <Stat
              label="Pagine lette"
              value={
                finished.reduce((s, i) => s + (i.total_pages ?? 0), 0) +
                reading.reduce((s, i) => s + i.current_page, 0)
              }
            />
          </div>
        </>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <BookOpen className="h-5 w-5 text-primary" /> Libri da scoprire
        </h2>
        <button onClick={refresh} className="rounded-lg border border-border px-3 py-2 text-sm">
          Rinnova
        </button>
      </div>
      {isPending && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          Caricamento libri e copertine…
        </p>
      )}
      {isError && (
        <p role="alert" className="mb-4 text-sm">
          Il catalogo non è disponibile al momento.{" "}
          <button className="text-primary" onClick={() => void refetch()}>
            Riprova
          </button>
        </p>
      )}
      {!isPending && !isError && !recommended.length && (
        <p className="mb-4 text-sm text-muted-foreground">
          Nessun suggerimento disponibile. Premi Rinnova oppure modifica i tuoi gusti nel profilo.
        </p>
      )}
      <div className="book-grid grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {recommended.map(({ book: b, reason }) => (
          <div key={b.id}>
            <BookCard book={b} />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{reason}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
