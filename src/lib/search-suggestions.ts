import { sameReadingWork, sharedAuthor, textKey, workTitle } from "./work-identity.ts";
import type { Book } from "./books";

/** Escape user syntax and complete only the final word, never inject a Solr expression. */
export function titleCompletionQuery(query: string) {
  const words = textKey(query).split(" ").filter(Boolean).slice(0, 16);
  if (!words.length) return "";
  return `title:(${words.map((word, i) => (i === words.length - 1 ? `${word}*` : word)).join(" AND ")})`;
}

/** A provider fallback must not turn a partially typed title into unrelated books. */
export function matchesTitleCompletion(title: string, query: string) {
  const words = textKey(query).split(" ").filter(Boolean);
  const titleWords = textKey(title).split(" ");
  return (
    words.length > 0 &&
    words.every((word, i) =>
      titleWords.some((candidate) =>
        i === words.length - 1 ? candidate.startsWith(word) : candidate === word,
      ),
    )
  );
}

function editionTitle(title: string) {
  // Some catalogue duplicates prepend the series and volume to the actual title.
  const volume = title.match(
    /^.+\b(?:parte|part|volume|vol\.?|book|libro)\s+[\divx]+\s*:\s*(.+)$/i,
  );
  return workTitle(volume?.[1] ?? title);
}

/** Collapse editions, preserving other authors, sequels and meaningful subtitles. */
export function bookSuggestions(books: Book[], limit = 5) {
  const groups: Book[] = [];
  for (const book of books) {
    const index = groups.findIndex(
      (other) =>
        sameReadingWork(book, other) ||
        (sharedAuthor(book, other) &&
          !!editionTitle(book.title) &&
          editionTitle(book.title) === editionTitle(other.title)),
    );
    if (index < 0) {
      groups.push({ ...book });
      continue;
    }
    const previous = groups[index]!;
    const preferred = !previous.cover_url && book.cover_url ? book : previous;
    groups[index] = {
      ...preferred,
      cover_candidates: [
        ...new Set(
          [
            previous.cover_url,
            ...(previous.cover_candidates ?? []),
            book.cover_url,
            ...(book.cover_candidates ?? []),
          ].filter((url): url is string => !!url),
        ),
      ],
    };
  }
  return groups.slice(0, limit);
}

/** Complete words across both title and authors, without sending user Solr syntax. */
export function catalogueCompletionQuery(query: string) {
  const words = textKey(query).split(" ").filter(Boolean).slice(0, 16);
  return words.map((word, i) => (i === words.length - 1 ? `${word}*` : word)).join(" AND ");
}
export function matchesCatalogueCompletion(book: Pick<Book, "title" | "authors">, query: string) {
  return matchesTitleCompletion([book.title, ...book.authors].join(" "), query);
}
