import type { Book } from "./books";
import { sameAuthorName, workTitle } from "./work-identity.ts";

/** Source headings sometimes append a magazine name/date, rather than a book subtitle. */
export function fragmentCatalogueTitle(title: string) {
  return title.replace(/\s*\([^()]*(?:\b\d{4}\b|\bmagazine\b|\brivista\b)[^()]*\)\s*$/i, "").trim();
}

export async function findDailyFragmentBook(
  fragment: { title: string; author: string },
  searchTitle: string,
  language: string | undefined,
  search: (query: string, options: { max: number; language?: string }) => Promise<Book[]>,
): Promise<Book | null> {
  const titles = [fragment.title, searchTitle].map(fragmentCatalogueTitle);
  const query = `intitle:"${titles[1]!.replaceAll('"', " ")}" inauthor:"${fragment.author.replaceAll('"', " ")}"`;
  const matches = (book: Book) =>
    titles.some((title) => workTitle(fragmentCatalogueTitle(book.title)) === workTitle(title)) &&
    book.authors.some((author) => sameAuthorName(author, fragment.author));
  let fallback: Book | null = null;
  // Prefer the requested language; a missing translation must not hide an original cover.
  for (const preferred of language ? [language, undefined] : [undefined]) {
    try {
      const books = (
        await search(query, { max: 12, ...(preferred ? { language: preferred } : {}) })
      ).filter(matches);
      const illustrated = books.find((book) => book.cover_url);
      if (illustrated) return illustrated;
      fallback ??= books[0] ?? null;
    } catch {
      // Retain a verified match if one catalogue request fails.
    }
  }
  return fallback;
}
