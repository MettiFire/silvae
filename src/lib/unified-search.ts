import { mangaAuthorMatches } from "./manga-search-names.ts";
import type { Book } from "./books";
import { isMangaId } from "./manga-model.ts";
const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function unifiedSearchResults(books: Book[], manga: Book[], query: string, limit = 8) {
  const series = manga.filter((b) => isMangaId(b.id));
  const ordinary = books.filter(
    (b) =>
      !series.some((s) => {
        const title = norm(b.title),
          stem = norm(s.title);
        const sameAuthor = b.authors.some((a) =>
          [...s.authors, ...(s.author_aliases ?? [])].some(
            (c) => norm(a) === norm(c) || (mangaAuthorMatches(c, a) && mangaAuthorMatches(a, c)),
          ),
        );
        return (
          sameAuthor &&
          (title === stem ||
            (title.startsWith(stem) &&
              /^(?:(?:vol(?:ume|umi)?|tome|deluxe|maximum|omnibus|edition|edizione)\s*)*\d+\b/.test(
                title.slice(stem.length).trim(),
              )))
        );
      }),
  );
  const q = norm(query);
  return [...new Map([...series, ...ordinary].map((b) => [b.id, b])).values()]
    .map((book, index) => ({
      book,
      index,
      score:
        norm(book.title) === q
          ? 4
          : book.authors.some((name) => mangaAuthorMatches(name, query))
            ? 3.5
            : norm(book.title).startsWith(q)
              ? 3
              : ` ${norm(book.title)} `.includes(` ${q}`)
                ? 2
                : 1,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((r) => r.book);
}

/** Retain an already-owned series identity when catalogue providers differ. */
export function preferOwnedManga(results: Book[], owned: Book[]) {
  const authorKey = (name: string) =>
    norm(name)
      .replace(/kentarou/g, "kentaro")
      .split(" ")
      .sort()
      .join(" ");
  return results.map((book) => {
    const aliases = [...book.authors, ...(book.author_aliases ?? [])].map(authorKey);
    const existing = owned.find(
      (old) =>
        isMangaId(old.id) &&
        norm(old.title) === norm(book.title) &&
        old.authors.some((name) => aliases.includes(authorKey(name))),
    );
    if (!existing || existing.id === book.id) return book;
    return {
      ...book,
      id: existing.id,
      ...(book.manga
        ? {
            manga: {
              ...book.manga,
              ...(existing.id.startsWith("manga:md:") ? { mangaDexId: existing.id.slice(9) } : {}),
            },
          }
        : {}),
    };
  });
}
