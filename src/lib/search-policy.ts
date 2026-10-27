import type { Book } from "./books";
import { bookSuggestions, matchesCatalogueCompletion } from "./search-suggestions.ts";
import { workTitle } from "./work-identity.ts";

export function normalizeSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

export function searchProviders(mode: "all" | "books" | "manga", query: string, ready: boolean) {
  const valid = ready && query.length >= 2;
  const numeric = /^[\d\s-]+$/.test(query);
  return {
    books: valid && mode !== "manga",
    manga: valid && mode !== "books" && !numeric,
    authors: valid && mode !== "manga" && query.length >= 3 && !numeric,
  };
}

/** Owned books are immediately searchable without waiting on an external catalogue. */
export function ownedBookSuggestions(books: Book[], query: string, manga: boolean) {
  return bookSuggestions(
    books
      .filter((book) => book.id.startsWith("manga:") === manga && matchesCatalogueCompletion(book, query))
      .sort((a, b) => Number(workTitle(b.title) === workTitle(query)) - Number(workTitle(a.title) === workTitle(query))),
    8,
  );
}