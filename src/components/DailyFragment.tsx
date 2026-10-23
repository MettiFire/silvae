import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Copy, Quote } from "lucide-react";
import { dailyFragment, fragmentDay } from "@/lib/daily-fragment";
import { searchBooks } from "@/lib/books";
import { sameAuthorName, workTitle } from "@/lib/work-identity";
import { BookCover } from "./BookCard";

export function DailyFragment() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [day, setDay] = useState<string | null>(null);
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
  useEffect(() => {
    setCopied(false);
    setCopyError(false);
  }, [day]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  const copyFragment = async () => {
    if (!fragment) return;
    try {
      await navigator.clipboard.writeText(
        `«${fragment.quote}»\n— ${fragment.author}, ${fragment.title} (${fragment.section})\n${fragment.source}`,
      );
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };
  const books = useQuery({
    queryKey: ["daily-fragment-book", fragment?.id],
    enabled: !!fragment,
    queryFn: () =>
      searchBooks(`intitle:"${fragment!.title}" inauthor:"${fragment!.author}"`, { max: 6 }),
    staleTime: 86400000,
    retry: false,
  });
  const candidates = books.data?.filter(
    (b) =>
      workTitle(b.title) === workTitle(fragment!.title) &&
      b.authors.some((a) => sameAuthorName(a, fragment!.author)),
  );
  const book = candidates?.find((b) => b.cover_url) ?? candidates?.[0];
  useEffect(() => setCoverUrl(""), [book?.id]);
  const cover = book ? (
    <BookCover
      key={book.id}
      book={book}
      fit="contain"
      onCoverLoad={setCoverUrl}
      className="!bg-transparent !shadow-none after:!hidden"
    />
  ) : (
    <div className="flex aspect-[2/3] flex-col items-center justify-center border border-border bg-card px-4 text-center">
      <span className="font-display text-lg">{fragment?.title}</span>
      <span className="mt-3 text-xs text-muted-foreground">{fragment?.author}</span>
    </div>
  );
  return (
    <section
      className="relative isolate my-10 min-h-80 overflow-hidden rounded-2xl border border-border/60 bg-muted/25 px-5 py-7 sm:px-10 sm:py-9"
      aria-labelledby="daily-fragment-title"
    >
      {coverUrl && (
        <div
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          aria-hidden="true"
        >
          <img
            src={coverUrl}
            alt=""
            decoding="async"
            width={300}
            height={450}
            className="absolute -inset-[20%] h-[140%] w-[140%] object-cover opacity-30 blur-3xl saturate-150 dark:opacity-25"
          />
          <div className="absolute inset-0 bg-background/45 dark:bg-background/35" />
        </div>
      )}
      <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-foreground/10 pb-4">
        <Quote className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 id="daily-fragment-title" className="eyebrow">
          Il frammento del giorno
        </h2>
        {day && (
          <time dateTime={day} className="ml-auto text-xs tabular-nums text-muted-foreground">
            {new Intl.DateTimeFormat("it-IT", {
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            }).format(new Date(`${day}T12:00:00Z`))}
          </time>
        )}
      </div>
      {fragment ? (
        <div className="grid items-center gap-7 sm:grid-cols-[9rem_minmax(0,1fr)] md:grid-cols-[11rem_minmax(0,1fr)] md:gap-10">
          <div className="mx-auto w-32 sm:w-full">
            {book ? (
              <Link
                to="/book/$bookId"
                params={{ bookId: book.id }}
                aria-label={`Scopri ${book.title}`}
                className="block transition-transform hover:-translate-y-1"
              >
                {cover}
              </Link>
            ) : (
              cover
            )}
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-xs tracking-wide text-primary">{fragment.theme}</p>
            <h3 className="mb-5 font-display text-xl sm:text-2xl">{fragment.heading}</h3>
            <figure>
              <blockquote className="max-w-3xl whitespace-pre-line font-display text-2xl leading-relaxed md:text-3xl">
                «{fragment.quote}
                {/[,;]$/.test(fragment.quote) ? " […]" : ""}»
              </blockquote>
              <figcaption className="mt-5 text-sm text-muted-foreground">
                {fragment.author} ·{" "}
                <cite className="font-medium not-italic text-foreground">{fragment.title}</cite>
                <span className="mt-1 block text-xs">{fragment.section}</span>
              </figcaption>
            </figure>
            <div className="mt-6 max-w-2xl border-l-2 border-primary/35 pl-4">
              <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                A margine · Silvae
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">{fragment.note}</p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              {book ? (
                <Link
                  to="/book/$bookId"
                  params={{ bookId: book.id }}
                  className="inline-flex items-center gap-2 text-sm text-primary"
                >
                  Scopri questo libro <ArrowRight size={14} />
                </Link>
              ) : books.isFetching ? (
                <p role="status" className="text-xs text-muted-foreground">
                  Cerco il libro nel catalogo…
                </p>
              ) : (
                <Link
                  to="/author/$author"
                  params={{ author: fragment.author }}
                  className="inline-flex items-center gap-2 text-sm text-primary"
                >
                  Scopri l’autore <ArrowRight size={14} />
                </Link>
              )}
              <button
                type="button"
                onClick={copyFragment}
                className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <Copy size={14} aria-hidden="true" />
                )}
                {copied ? "Copiato con la fonte" : "Copia il frammento"}
              </button>
              <span className="sr-only" role="status">
                {copied ? "Frammento e fonte copiati" : ""}
              </span>
              {copyError && (
                <p role="status" className="text-xs text-muted-foreground">
                  Non riesco ad accedere agli appunti. Puoi selezionare e copiare il testo.
                </p>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <a
                href={fragment.source}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                Leggi il brano su Wikisource ↗
              </a>
              <a
                href={`https://creativecommons.org/licenses/by-sa/${fragment.license}/deed.it`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Trascrizione: CC BY-SA {fragment.license}
              </a>
            </div>
          </div>
        </div>
      ) : (
        <p className="font-display text-xl text-muted-foreground" role="status">
          Una pagina da incontrare, ogni giorno.
        </p>
      )}
    </section>
  );
}
