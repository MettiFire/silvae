import type { LibraryItem } from "./library";
import type { Book } from "./books";
import { sameBook } from "./book-metadata.ts";
export type LibraryOrder = "last-read" | "first-read" | "added" | "title";
const timestamp = (value: string | null | undefined) => {
  const time = Date.parse(value ?? "");
  return Number.isFinite(time) ? time : 0;
};
export function lastReadAt(item: LibraryItem) {
  return Math.max(timestamp(item.finished_at), timestamp(item.last_reread_at));
}
export function sortLibrary(items: LibraryItem[], order: LibraryOrder): LibraryItem[] {
  return [...items].sort((a, b) => {
    if (order === "title") return (a.books?.title ?? "").localeCompare(b.books?.title ?? "", "it");
    if (order === "added") return timestamp(b.created_at) - timestamp(a.created_at);
    const aDate = lastReadAt(a),
      bDate = lastReadAt(b);
    if (!aDate || !bDate)
      return aDate === bDate ? timestamp(b.created_at) - timestamp(a.created_at) : aDate ? -1 : 1;
    return (
      (order === "first-read" ? aDate - bDate : bDate - aDate) ||
      timestamp(b.created_at) - timestamp(a.created_at)
    );
  });
}
export function hasReadBook(book: Book, library: LibraryItem[]): boolean {
  const isbns = new Set(book.isbns ?? []);
  return library.some((item) => {
    if (item.status !== "read") return false;
    if (item.book_id === book.id) return true;
    if (item.book_id.startsWith("csv:isbn:") && isbns.has(item.book_id.slice(9))) return true;
    return (
      !!item.books &&
      ((item.books.isbns ?? []).some((i) => isbns.has(i)) || sameBook(item.books, book))
    );
  });
}
