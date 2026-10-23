import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchBooks, type Book } from "@/lib/books";
import { BookCover } from "./BookCard";
export function ClubBookPicker({
  onSelect,
  disabled,
}: {
  onSelect: (book: Book) => Promise<void>;
  disabled: boolean;
}) {
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const books = useQuery({
    queryKey: ["club-book-search", query],
    queryFn: () => searchBooks(query, { max: 8 }),
    enabled: query.length > 2,
    staleTime: 300000,
  });
  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(term.trim());
        }}
      >
        <input
          aria-label="Libro da leggere nel club"
          placeholder="Cerca il libro del club"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="min-w-0 flex-1 rounded border bg-background px-3 py-2 text-sm"
        />
        <button disabled={disabled || term.trim().length < 3} className="button-outline">
          Cerca
        </button>
      </form>
      {books.isFetching && (
        <p role="status" className="text-sm">
          Ricerca…
        </p>
      )}
      {books.isError && (
        <p role="alert" className="text-sm text-destructive">
          Catalogo non disponibile. Riprova.
        </p>
      )}
      {books.isSuccess && query && !books.data.length && (
        <p className="text-sm">Nessun libro trovato.</p>
      )}
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {books.data?.map((book) => (
          <button
            type="button"
            key={book.id}
            disabled={disabled}
            onClick={() => void onSelect(book)}
            className="flex w-full items-center gap-3 rounded p-2 text-left hover:bg-accent"
          >
            <div className="w-8 shrink-0">
              <BookCover book={book} />
            </div>
            <span className="min-w-0">
              <span className="block truncate text-sm">{book.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {book.authors.join(", ")}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
