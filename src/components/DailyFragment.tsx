import { useTranslate } from "@/lib/use-ui-language";
import { useFragmentFeedback } from "@/lib/use-fragment-feedback";
import { preferredFragmentPool } from "@/lib/fragment-feedback";
import { DAILY_FRAGMENTS } from "@/data/daily-fragments";
import { selectDailyFragment } from "@/lib/daily-fragment";
import { toast } from "@/lib/localized-toast";
import { selectMultilingualFragment } from "@/lib/fragment-archive";
import { useFragmentArchive } from "@/lib/use-fragment-archive";
import { useAuth } from "@/lib/auth";
import { useBookLanguage } from "@/lib/use-book-language";
import { parsePreferences, PREFERENCES_FIELD } from "@/lib/reading-preferences";
import { UiText, UiElement } from "@/lib/ui-language-context";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ThumbsDown } from "lucide-react";
import { fragmentDay } from "@/lib/daily-fragment";
import { searchBooks } from "@/lib/books";
import { sameAuthorName, workTitle } from "@/lib/work-identity";
import { BookCover } from "./BookCard";

export function DailyFragment() {
  const t = useTranslate();
  const { user } = useAuth();
  const { language } = useBookLanguage(
    parsePreferences(user?.user_metadata[PREFERENCES_FIELD])?.language,
  );
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
  const archive = useFragmentArchive();
  const feedback = useFragmentFeedback();
  // Keep the bundled collection as a network-failure fallback; no third-party
  // quote API is contacted while rendering the home page.
  const fragment = day
    ? archive.data?.length
      ? selectMultilingualFragment(
          day,
          preferredFragmentPool(archive.data, feedback.feedback, day),
          archive.languages,
        )
      : archive.isError && archive.languages.includes("it")
        ? selectDailyFragment(day, preferredFragmentPool(DAILY_FRAGMENTS, feedback.feedback, day))
        : null
    : null;
  const englishTitles: Record<string, string> = {
    "collodi-pinocchio": "Pinocchio",
    "verga-malavoglia": "The House by the Medlar Tree",
    "pirandello-centomila": "One, No One and One Hundred Thousand",
    "svevo-zeno": "Zeno’s Conscience",
    "dante-inferno": "The Divine Comedy",
    "manzoni-promessi": "The Betrothed",
    "ariosto-orlando": "Orlando Furioso",
    "boccaccio-decameron": "The Decameron",
    "leopardi-pensieri-fama": "Thoughts",
    "canne-al-vento": "Reeds in the Wind",
    "fu-mattia-pascal": "The Late Mattia Pascal",
    "svevo-una-vita": "A Life",
    "mastro-don-gesualdo": "Mastro-don Gesualdo",
    "vita-dei-campi": "Life in the Fields",
    "tigri-mompracem": "The Tigers of Mompracem",
    "corsaro-nero": "The Black Corsair",
  };
  const searchTitle = fragment
    ? language === "en"
      ? (englishTitles[fragment.id] ?? fragment.title)
      : fragment.title
    : "";
  const books = useQuery({
    queryKey: ["daily-fragment-book", fragment?.id, language],
    enabled: !!fragment,
    queryFn: () =>
      searchBooks(`intitle:"${searchTitle}" inauthor:"${fragment!.author}"`, { max: 6, language }),
    staleTime: 86400000,
    retry: false,
  });
  const candidates = books.data?.filter(
    (b) =>
      (workTitle(b.title) === workTitle(fragment!.title) ||
        workTitle(b.title) === workTitle(searchTitle)) &&
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
    <UiElement
      as="section"
      className="relative isolate my-10 min-h-80 overflow-hidden rounded-2xl border border-border/60 bg-muted/25 px-5 py-7 sm:px-10 sm:py-9"
      aria-label="Il frammento del giorno"
    >
      {coverUrl && (
        <div
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          aria-hidden="true"
        >
          <UiElement
            as="img"
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
            <figure>
              <blockquote className="max-w-3xl whitespace-pre-line font-display text-2xl leading-relaxed md:text-3xl">
                «{fragment.quote}
                {/[,;]$/.test(fragment.quote) ? " […]" : ""}»
              </blockquote>
              <figcaption className="mt-5 text-sm text-muted-foreground">
                {fragment.author} ·{" "}
                <cite className="font-medium not-italic text-foreground">
                  <a
                    href={fragment.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${"sourceName" in fragment ? fragment.sourceName : "Wikisource"} · CC BY-SA ${fragment.license}`}
                    className="hover:underline"
                  >
                    {fragment.title}
                  </a>
                </cite>
              </figcaption>
            </figure>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              {book ? (
                <Link
                  to="/book/$bookId"
                  params={{ bookId: book.id }}
                  className="inline-flex items-center gap-2 text-sm text-primary"
                >
                  <UiText text="Scopri questo libro " />
                  <ArrowRight size={14} />
                </Link>
              ) : (
                <a
                  href={fragment.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary"
                >
                  <UiText text="Leggi l’opera " />
                  <ArrowRight size={14} aria-hidden="true" />
                </a>
              )}
              <button
                type="button"
                disabled={feedback.busy}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                onClick={async () => {
                  const author = fragment.author;
                  try {
                    await feedback.change(author, true);
                    toast.success("Ti proporremo meno frammenti di questo autore", {
                      action: {
                        label: t("Annulla"),
                        onClick: () => {
                          void feedback
                            .change(author, false)
                            .catch(() => toast.error("Preferenza non salvata. Riprova."));
                        },
                      },
                    });
                  } catch {
                    toast.error("Preferenza non salvata. Riprova.");
                  }
                }}
              >
                <ThumbsDown size={13} aria-hidden="true" />
                <UiText text="Mostra meno di questo autore" />
              </button>
            </div>
            <div className="sr-only">
              <a
                href={fragment.source}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                {"sourceName" in fragment ? fragment.sourceName : "Wikisource"}
              </a>
              <a
                href={`https://creativecommons.org/licenses/by-sa/${fragment.license}/deed.it`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <UiText text="Trascrizione: CC BY-SA " />
                {fragment.license}
              </a>
            </div>
          </div>
        </div>
      ) : (
        <p className="font-display text-xl text-muted-foreground" role="status">
          <UiText
            text={
              archive.isError
                ? "Frammento temporaneamente non disponibile."
                : "Una pagina da incontrare, ogni giorno."
            }
          />
        </p>
      )}
    </UiElement>
  );
}
