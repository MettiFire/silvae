import { supplementSearch, SUPPLEMENT_AUTHOR } from "@/lib/catalogue-supplement";
import { useLibrary } from "@/lib/library";
import { unifiedSearchResults, preferOwnedManga } from "@/lib/unified-search";
import { isMangaId } from "@/lib/manga-model";
import { UiText, UiElement } from "@/lib/ui-language-context";
import { mangaCatalogue } from "@/lib/manga-client";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScanBarcode, UserRound } from "lucide-react";
import { toast } from "@/lib/localized-toast";
import { authorSearchResults, authorMatchesQuery } from "@/lib/author-search";
import { findAuthors, type AuthorCandidate } from "@/lib/authors";
import { searchBookSuggestions, searchByIsbn, type Book } from "@/lib/books";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useAuth } from "@/lib/auth";
import { useBookLanguage } from "@/lib/use-book-language";
import { parsePreferences, PREFERENCES_FIELD } from "@/lib/reading-preferences";
import { BookCover } from "@/components/BookCard";

export function GlobalSearch() {
  const [term, setTerm] = useState("");
  const [mode, setMode] = useState<"all" | "books" | "manga">("all");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [scanning, setScanning] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [resultHeight, setResultHeight] = useState(320);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: library = [] } = useLibrary(user?.id);
  const preferences = parsePreferences(user?.user_metadata[PREFERENCES_FIELD]);
  const { language, ready: languageReady } = useBookLanguage(preferences?.language);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const {
    data: results = [],
    isFetching,
    isError,
    refetch: retryBooks,
  } = useQuery<Book[]>({
    queryKey: ["global-search-works-v2", debounced, language ?? "any"],
    placeholderData: () => supplementSearch(debounced),
    enabled: mode !== "manga" && languageReady && debounced.trim().length >= 2,
    queryFn: ({ signal }) => searchBookSuggestions(debounced, signal, language),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const authors = useQuery<AuthorCandidate[]>({
    queryKey: ["author-candidates-v3", debounced.trim(), language ?? "any"],
    placeholderData: () =>
      authorMatchesQuery(SUPPLEMENT_AUTHOR, debounced) ? [SUPPLEMENT_AUTHOR] : [],
    enabled:
      mode !== "manga" &&
      languageReady &&
      debounced.trim().length >= 3 &&
      !/^[\d\s-]+$/.test(debounced),
    queryFn: ({ signal }) => findAuthors(debounced.trim(), language, signal),
    staleTime: 3600000,
    retry: false,
  });
  const manga = useQuery({
    queryKey: ["manga-search-v3", debounced, language ?? "it"],
    enabled:
      mode !== "books" &&
      languageReady &&
      debounced.trim().length >= 2 &&
      !/^[\d\s-]+$/.test(debounced),
    queryFn: ({ signal }) =>
      mangaCatalogue({ signal, data: { query: debounced, ...(language ? { language } : {}) } }),
    staleTime: 3600000,
    retry: false,
  });
  const mangaResults = preferOwnedManga(
    manga.data ?? [],
    library.flatMap((item) => (item.books ? [item.books] : [])),
  );
  const visibleResults =
    mode === "all"
      ? unifiedSearchResults(results, mangaResults, debounced)
      : mode === "manga"
        ? mangaResults
        : results;
  const fetching =
    mode === "all"
      ? manga.isFetching || isFetching
      : mode === "manga"
        ? manga.isFetching
        : isFetching;
  const searchError =
    mode === "all" ? manga.isError && isError : mode === "manga" ? manga.isError : isError;
  const authorResults =
    mode === "manga" || /^[\d\s-]+$/.test(debounced)
      ? []
      : authorSearchResults(authors.data ?? [], 3, debounced);
  const options = [
    ...authorResults.map((author) => ({ kind: "author" as const, author })),
    ...visibleResults.map((book) => ({ kind: "book" as const, book })),
  ];
  const current = debounced.trim().length >= 2 && term.trim() === debounced.trim();
  const visible = open && current;
  const optionIds = options
    .map((option) => (option.kind === "author" ? `a:${option.author.id}` : `b:${option.book.id}`))
    .join("|");
  useEffect(() => setActive(-1), [optionIds]);
  useEffect(() => {
    if (!visible) return;
    const update = () => {
      const rect = boxRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const viewportBottom = (viewport?.height ?? window.innerHeight) + (viewport?.offsetTop ?? 0);
      const navigation = document
        .querySelector<HTMLElement>(".mobile-nav")
        ?.getBoundingClientRect();
      const bottom =
        navigation && navigation.height > 0
          ? Math.min(viewportBottom, navigation.top)
          : viewportBottom;
      setResultHeight(Math.max(80, Math.min(440, bottom - rect.bottom - 12)));
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [visible]);
  useEffect(() => {
    if (visible && active >= 0)
      resultsRef.current
        ?.querySelector<HTMLElement>(`#book-search-option-${active}`)
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active, visible, resultHeight]);

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    setOpen(false);
    setTerm("");
    setActive(-1);
    if (option.kind === "author") {
      void navigate({
        to: "/author/$author",
        params: { author: option.author.name },
        search: { olid: option.author.id },
      });
    } else {
      void navigate({ to: "/book/$bookId", params: { bookId: option.book.id } });
    }
  }

  const handleScan = async (code: string) => {
    setScanning(false);
    try {
      const hits = await searchByIsbn(code);
      const first = hits[0];
      if (!first) {
        toast.error(`Nessun libro trovato per il codice ${code}`);
        setTerm(code);
        setOpen(true);
        return;
      }
      void navigate({ to: "/book/$bookId", params: { bookId: first.id } });
    } catch {
      toast.error("Errore nella ricerca del codice");
    }
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <UiElement
        as="select"
        aria-label="Tipo di ricerca"
        value={mode}
        onChange={(e) => {
          setMode(e.target.value as "all" | "books" | "manga");
          setActive(-1);
          setOpen(true);
        }}
        className="absolute left-2 top-1/2 z-10 h-7 w-20 -translate-y-1/2 rounded border-0 bg-card pl-1 text-xs"
      >
        <option value="all">
          <UiText text="Tutto" />
        </option>
        <option value="books">
          <UiText text="Libri" />
        </option>
        <option value="manga">
          <UiText text="Manga" />
        </option>
      </UiElement>
      <UiElement
        as="input"
        value={term}
        onChange={(e) => {
          setActive(-1);
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        placeholder={mode === "manga" ? "Cerca una serie manga…" : "Cerca libri, manga, autori…"}
        aria-label={mode === "manga" ? "Cerca manga" : "Cerca libri, manga e autori"}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls="global-search-results"
        aria-activedescendant={
          visible && active >= 0 && active < options.length
            ? `book-search-option-${active}`
            : undefined
        }
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setActive(-1);
          } else if (e.key === "ArrowDown" && current && options.length) {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (i + 1) % options.length);
          } else if (e.key === "ArrowUp" && visible && options.length) {
            e.preventDefault();
            setActive((i) =>
              i < 0 ? options.length - 1 : (i - 1 + options.length) % options.length,
            );
          } else if (e.key === "Home" && visible && options.length && active >= 0) {
            e.preventDefault();
            setActive(0);
          } else if (e.key === "End" && visible && options.length && active >= 0) {
            e.preventDefault();
            setActive(options.length - 1);
          } else if (e.key === "Enter" && visible && options.length) {
            e.preventDefault();
            choose(Math.max(0, active));
          }
        }}

        className="h-10 w-full rounded-xl border border-border bg-card pl-24 pr-11 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
      />
      {mode !== "manga" && (
        <UiElement
          as="button"
          type="button"
          onClick={() => setScanning(true)}
          aria-label="Scansiona codice a barre"
          title="Scansiona codice a barre"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-primary"
        >
          <ScanBarcode className="h-4 w-4" />
        </UiElement>
      )}
      {scanning && (
        <BarcodeScanner onDetected={(c) => void handleScan(c)} onClose={() => setScanning(false)} />
      )}
      {visible && (
        <UiElement
          as="div"
          ref={resultsRef}
          role="listbox"
          id="global-search-results"
          aria-label="Risultati libri e autori"
          style={{ maxHeight: resultHeight, WebkitOverflowScrolling: "touch" }}
          className="absolute z-50 mt-2 w-full touch-pan-y overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover shadow-paper"
        >
          {searchError && (
            <div role="alert" className="px-3 py-3 text-sm text-destructive">
              <p>
                <UiText text="Ricerca non disponibile. Riprova tra poco." />
              </p>
              <button
                type="button"
                disabled={fetching}
                className="mt-2 underline disabled:opacity-50"
                onClick={() => {
                  void (mode === "all"
                    ? Promise.allSettled([manga.refetch(), retryBooks()])
                    : mode === "manga"
                      ? manga.refetch()
                      : retryBooks());
                }}
              >
                <UiText text="Riprova" />
              </button>
            </div>
          )}
          {(fetching || (mode !== "manga" && authors.isFetching)) && (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              <UiText text="Ricerca in corso…" />
            </p>
          )}
          {!fetching &&
            !(mode !== "manga" && authors.isFetching) &&
            !searchError &&
            options.length === 0 && (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                <UiText text="Nessun risultato" />
              </p>
            )}
          {mode !== "manga" && authors.isError && (
            <p role="status" className="px-3 py-2 text-xs text-muted-foreground">
              <UiText text="Ricerca autori temporaneamente non disponibile." />
            </p>
          )}
          {authorResults.map((author, index) => (
            <button
              key={author.id}
              id={`book-search-option-${index}`}
              role="option"
              aria-selected={active === index}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(index)}
              className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-3 text-left transition hover:bg-accent aria-selected:bg-accent"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{author.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  <UiText text="Autore · Vai alla pagina" />
                  {author.birth ? ` · ${author.birth}` : ""}
                </span>
              </span>
            </button>
          ))}
          {visibleResults.length > 0 && (
            <p className="px-3 py-2 text-[11px] text-muted-foreground">
              <UiText
                text={
                  mode === "all"
                    ? "Libri e serie manga"
                    : mode === "manga"
                      ? "Serie manga · un risultato per serie, non per volume"
                      : "Libri · Le copertine alternative sono nella scheda del libro"
                }
              />
            </p>
          )}
          {visibleResults.map((b, index) => (
            <button
              key={b.id}
              id={`book-search-option-${index + authorResults.length}`}
              role="option"
              aria-selected={active === index + authorResults.length}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(index + authorResults.length)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-accent aria-selected:bg-accent"
            >
              <div className="w-8 shrink-0">
                <BookCover book={b} />
              </div>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{b.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {isMangaId(b.id) && (
                    <>
                      <UiText text="Serie manga" /> ·{" "}
                    </>
                  )}
                  {b.authors.join(", ")}
                  {b.published_year ? ` · ${b.published_year}` : ""}
                </span>
              </span>
            </button>
          ))}
        </UiElement>
      )}
    </div>
  );
}
