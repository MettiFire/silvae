import { pageSeo } from "@/lib/site-seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, RefreshCw } from "lucide-react";
import { AppShell, PageHeader, SectionHeading } from "@/components/AppShell";
import { BookCard, BookCover } from "@/components/BookCard";
import { BookGridSizeControl } from "@/components/BookGridSizeControl";
import { useBookRecommendations } from "@/lib/use-book-recommendations";
import { DailyFragment } from "@/components/DailyFragment";
import { ProgressBar } from "@/components/ProgressBar";
export const Route = createFileRoute("/")({
  head: () =>
    pageSeo(
      "Silvae — Una vita tra le pagine",
      "Custodisci le tue letture, raccogli libri in liste, conserva citazioni e scopri la tua prossima storia.",
      "/",
      false,
    ),
  component: Home,
});
function Home() {
  const { user, library, recommended, recsLoading, recsError, retryRecs, refresh } =
    useBookRecommendations();
  const reading = library.filter((i) => i.status === "reading");
  const finished = library.filter((i) => i.status === "read");
  return (
    <AppShell>
      {!user ? (
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="eyebrow">Un posto per le tue letture</p>
            <h1>
              Tieni il filo.
              <br />
              Di ogni <em>storia.</em>
            </h1>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              I libri che hai amato, quelli che ti aspettano. Uno spazio per raccoglierli e trovare
              la tua prossima lettura, insieme agli altri.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/auth" className="button-ink">
                Comincia la tua libreria
                <ArrowRight size={14} />
              </Link>
              <Link to="/discover" className="button-outline">
                Sfoglia il catalogo
              </Link>
            </div>
          </div>
          <div className="home-hero-art" aria-label="Dal catalogo di Silvae">
            {recommended.length ? (
              recommended.slice(0, 2).map(({ book }, index) => (
                <Link
                  key={book.id}
                  to="/book/$bookId"
                  params={{ bookId: book.id }}
                  className="hero-book"
                >
                  <BookCover book={book} priority={index === 0} />
                </Link>
              ))
            ) : (
              <div className="max-w-64 py-16 text-center font-display text-3xl italic leading-relaxed text-[var(--hero-ink)]">
                C’è sempre
                <br />
                un’altra pagina.
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          <PageHeader
            title="Il tuo diario di lettura"
            subtitle="Le storie in cui sei adesso. E quelle che verranno."
            action={
              <Link to="/profile" className="button-outline">
                Il mio profilo ↗
              </Link>
            }
          />
          <section>
            <SectionHeading title="Dove eravamo rimasti" number="01">
              <Link to="/library">La tua libreria ↗</Link>
            </SectionHeading>
            {reading.length ? (
              <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                {reading.slice(0, 4).map((item) => (
                  <Link
                    key={item.id}
                    to="/book/$bookId"
                    params={{ bookId: item.book_id }}
                    className="flex items-center gap-6 border-b pb-6"
                  >
                    <div className="w-20 shrink-0">
                      {item.books && <BookCover book={item.books} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="eyebrow mb-2">In lettura</p>
                      <h3 className="font-display text-xl leading-snug">{item.books?.title}</h3>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.books?.authors.join(", ")}
                      </p>
                      <ProgressBar
                        className="mt-5"
                        current={item.current_page}
                        percentage={item.progress_percent}
                        total={item.total_pages ?? item.books?.page_count ?? 0}
                      />
                    </div>
                    <ArrowRight size={16} className="hidden shrink-0 sm:block" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="editorial-empty">
                Nessuna lettura in corso.{" "}
                <Link to="/discover" className="underline">
                  Trova il prossimo libro.
                </Link>
              </p>
            )}
          </section>
          <div className="stats-line">
            <Stat label="Libri letti" value={finished.length} />
            <Stat label="In lettura" value={reading.length} />
            <Stat label="Da leggere" value={library.filter((i) => i.status === "to_read").length} />
            <Stat
              label="Autori nella libreria"
              value={new Set(library.flatMap((i) => i.books?.authors ?? [])).size}
            />
          </div>
        </>
      )}
      <DailyFragment />
      <section>
        <SectionHeading
          title={user ? "La prossima lettura" : "Una storia chiama l’altra"}
          number={user ? "02" : "01"}
        >
          <div className="flex items-center gap-4">
            <span className="inline-flex">
              <BookGridSizeControl />
            </span>
            <button
              aria-label="Rinnova suggerimenti"
              className="inline-flex items-center gap-2 text-xs"
              onClick={refresh}
            >
              <RefreshCw size={13} />
              Altri libri
            </button>
          </div>
        </SectionHeading>
        <p className="mb-7 max-w-xl text-xs leading-relaxed text-muted-foreground">
          {user
            ? "Suggerimenti dai tuoi gusti e dai libri che hai già raccolto, letti e ancora da leggere."
            : "Percorsi nel catalogo, per incontrare qualcosa che non stavi cercando."}
        </p>
        {recsLoading && (
          <div className="book-grid grid" role="status" aria-label="Caricamento suggerimenti">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse bg-muted" />
            ))}
          </div>
        )}
        {recsError && (
          <p role="alert" className="editorial-empty">
            Il catalogo non è disponibile.{" "}
            <button onClick={() => void retryRecs()} className="underline">
              Riprova
            </button>
          </p>
        )}
        {!recsLoading && !recsError && !recommended.length && (
          <p className="editorial-empty">
            Nessun suggerimento al momento. Rinnova i libri o aggiorna i gusti nelle impostazioni.
          </p>
        )}
        {!recsLoading && (
          <div className="book-grid grid gap-y-8">
            {recommended.map(({ book, reason }) => (
              <div key={book.id}>
                <BookCard book={book} />
                <p className="mt-3 border-t pt-2 text-[10px] leading-relaxed text-muted-foreground">
                  {reason}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 flex justify-end">
          <Link to="/discover" className="inline-flex items-center gap-3 text-xs font-medium">
            Continua a esplorare
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
