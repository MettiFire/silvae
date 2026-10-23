import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Quote } from "lucide-react";
import { dailyFragment, fragmentDay } from "@/lib/daily-fragment";
import { searchBooks } from "@/lib/books";
import { sameAuthorName, workTitle } from "@/lib/work-identity";
import { BookCover } from "./BookCard";
export function DailyFragment() {
  const [day, setDay] = useState<string | null>(null);
  const [discover, setDiscover] = useState(false);
  useEffect(() => {
    const update = () => setDay(fragmentDay());
    update();
    const timer = setInterval(update, 60000);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);
  const fragment = day ? dailyFragment(day) : null;
  const books = useQuery({
    queryKey: ["daily-fragment-book", fragment?.id],
    enabled: !!fragment && discover,
    queryFn: () =>
      searchBooks(`intitle:"${fragment!.title}" inauthor:"${fragment!.author}"`, { max: 6 }),
    staleTime: 86400000,
  });
  const candidates = books.data?.filter(
    (b) =>
      workTitle(b.title) === workTitle(fragment!.title) &&
      b.authors.some((a) => sameAuthorName(a, fragment!.author)),
  );
  return (
    <section
      className="my-10 min-h-80 border-y border-border py-8"
      aria-labelledby="daily-fragment-title"
    >
      <div className="mb-5 flex items-center gap-3">
        <Quote className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 id="daily-fragment-title" className="eyebrow">
          Il frammento del giorno
        </h2>
      </div>
      {fragment ? (
        <>
          <figure>
            <blockquote className="max-w-3xl whitespace-pre-line font-display text-2xl leading-relaxed md:text-3xl">
              «{fragment.quote}
              {/[,;]$/.test(fragment.quote) ? " […]" : ""}»
            </blockquote>
            <figcaption className="mt-5 text-sm text-muted-foreground">
              {fragment.author} ·{" "}
              <cite className="font-medium not-italic text-foreground">{fragment.title}</cite>
              <span className="block mt-1 text-xs">{fragment.section}</span>
            </figcaption>
          </figure>
          <div className="mt-6 flex flex-wrap items-center gap-5">
            <button
              className="inline-flex items-center gap-2 text-sm text-primary"
              onClick={() => setDiscover((v) => !v)}
            >
              {discover ? "Chiudi il catalogo" : "Scopri questo libro"}
              <ArrowRight size={14} />
            </button>
            <a
              href={fragment.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground underline underline-offset-4"
            >
              Leggi il brano su Wikisource ↗
            </a>
            <a
              href={`https://creativecommons.org/licenses/by-sa/${fragment.license}/deed.it`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground"
            >
              Trascrizione: CC BY-SA {fragment.license}
            </a>
          </div>
          {discover && (
            <div className="mt-5 space-y-3">
              {books.isFetching && (
                <p role="status" className="text-sm">
                  Cerco il libro nel catalogo…
                </p>
              )}
              {books.isError && (
                <p role="alert" className="text-sm">
                  Catalogo non disponibile.{" "}
                  <button className="underline" onClick={() => void books.refetch()}>
                    Riprova
                  </button>
                </p>
              )}
              {books.isSuccess && !candidates?.length && (
                <p className="text-sm text-muted-foreground">
                  Questa edizione non è al momento nel catalogo. Puoi leggere il testo su Wikisource
                  o{" "}
                  <Link
                    to="/author/$author"
                    params={{ author: fragment.author }}
                    className="underline"
                  >
                    scoprire l’autore
                  </Link>
                  .
                </p>
              )}
              {candidates?.slice(0, 3).map((book) => (
                <Link
                  key={book.id}
                  to="/book/$bookId"
                  params={{ bookId: book.id }}
                  className="flex items-center gap-3 rounded border p-3"
                >
                  <div className="w-10 shrink-0">
                    <BookCover book={book} />
                  </div>
                  <span>
                    <span className="block text-sm font-medium">{book.title}</span>
                    <span className="text-xs text-muted-foreground">{book.authors.join(", ")}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="font-display text-xl text-muted-foreground" role="status">
          Una pagina da incontrare, ogni giorno.
        </p>
      )}
    </section>
  );
}
