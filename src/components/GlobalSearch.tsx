import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ScanBarcode, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { authorSearchResults } from "@/lib/author-search";
import { findAuthors } from "@/lib/authors";
import { searchBooks, searchByIsbn } from "@/lib/books";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { BookCover } from "@/components/BookCard";

export function GlobalSearch() {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [scanning, setScanning] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
  } = useQuery({
    queryKey: ["global-search", debounced],
    enabled: debounced.trim().length > 2,
    queryFn: () => searchBooks(debounced, { max: 6 }),
  });

  const authors = useQuery({
    queryKey: ["author-candidates", debounced.trim()],
    enabled: debounced.trim().length > 2 && !/^[\d\s-]+$/.test(debounced),
    queryFn: () => findAuthors(debounced.trim()),
    staleTime: 3600000,
    retry: false,
  });
  const authorResults = /^[\d\s-]+$/.test(debounced)
    ? []
    : authorSearchResults(authors.data ?? [], 3, debounced);
  const options = [
    ...authorResults.map((author) => ({ kind: "author" as const, author })),
    ...results.map((book) => ({ kind: "book" as const, book })),
  ];
  const visible = open && debounced.trim().length > 2 && term.trim() === debounced.trim();
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
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={term}
        onChange={(e) => {
          setActive(-1);
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Cerca libri, autori…"
        aria-label="Cerca libri e autori"
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
          } else if (e.key === "ArrowDown" && options.length) {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (i + 1) % options.length);
          } else if (e.key === "ArrowUp" && visible && options.length) {
            e.preventDefault();
            setActive((i) =>
              i < 0 ? options.length - 1 : (i - 1 + options.length) % options.length,
            );
          } else if (e.key === "Enter" && visible && options.length) {
            e.preventDefault();
            choose(Math.max(0, active));
          }
        }}

        className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-11 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="button"
        onClick={() => setScanning(true)}
        aria-label="Scansiona codice a barre"
        title="Scansiona codice a barre"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-primary"
      >
        <ScanBarcode className="h-4 w-4" />
      </button>
      {scanning && (
        <BarcodeScanner onDetected={(c) => void handleScan(c)} onClose={() => setScanning(false)} />
      )}
      {visible && (
        <div
          role="listbox"
          id="global-search-results"
          aria-label="Risultati libri e autori"
          className="absolute z-50 mt-2 w-full max-h-[min(70vh,32rem)] overflow-y-auto rounded-xl border border-border bg-popover shadow-paper"
        >
          {isError && (
            <p role="alert" className="px-3 py-3 text-sm text-destructive">
              Ricerca libri non disponibile. Riprova tra poco.
            </p>
          )}
          {(isFetching || authors.isFetching) && (
            <p className="px-3 py-3 text-sm text-muted-foreground">Ricerca in corso…</p>
          )}
          {!isFetching && !isError && options.length === 0 && (
            <p className="px-3 py-3 text-sm text-muted-foreground">Nessun risultato</p>
          )}
          {authors.isError && (
            <p role="status" className="px-3 py-2 text-xs text-muted-foreground">
              Ricerca autori temporaneamente non disponibile.
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
                  Autore · Vai alla pagina{author.birth ? ` · ${author.birth}` : ""}
                </span>
              </span>
            </button>
          ))}
          {results.map((b, index) => (
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
                  {b.authors.join(", ")}
                  {b.published_year ? ` · ${b.published_year}` : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
