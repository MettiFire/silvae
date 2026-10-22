import type { Book } from "./books";
import {
  fragmentBookGroup,
  matchingFragmentBooks,
  type ImportedFragment,
} from "./fragment-import.ts";
import {
  sameReadingWork,
  sharedAuthor,
  type WorkBook,
  type WorkIdentity,
  type WorkIdentities,
} from "./work-identity.ts";
export type FragmentAssociation = { bookId: string; automatic: boolean; candidates: Book[] };

/** One lookup per book, not per highlight. No reading status is inferred from clippings. */
export async function associateFragmentBooks(
  rows: ImportedFragment[],
  available: Book[],
  dependencies: {
    search: (entry: ImportedFragment) => Promise<Book[]>;
    resolve?: (book: WorkBook) => Promise<WorkIdentity>;
    cancelled?: () => boolean;
    progress?: (done: number, total: number) => void;
  },
): Promise<Map<string, FragmentAssociation>> {
  const known = [...available];
  const groups = new Map(rows.map((row) => [fragmentBookGroup(row), row]));
  const result = new Map<string, FragmentAssociation>();
  const identities: WorkIdentities = {};
  const resolve = async (book: WorkBook) => {
    if (!identities[book.id] && dependencies.resolve) {
      try {
        identities[book.id] = await dependencies.resolve(book);
      } catch {
        identities[book.id] = { workIds: [], titles: [], verified: false };
      }
    }
  };
  let done = 0;
  for (const [key, entry] of groups) {
    if (dependencies.cancelled?.()) break;
    const local = matchingFragmentBooks(entry, known);
    let candidates = local;
    let bookId = local.length === 1 ? local[0]!.id : "";
    // Multiple owned editions need a deliberate choice; never add a third edition instead.
    if (!local.length && entry.title.trim()) {
      const source: WorkBook = {
        id: `clipping:${key}`,
        title: entry.title,
        authors: entry.authors,
      };
      const related = entry.authors.length
        ? known.filter((book) => sharedAuthor(source, book))
        : [];
      if (related.length && dependencies.resolve) {
        await resolve(source);
        if (identities[source.id]?.verified) {
          for (const book of related) {
            if (dependencies.cancelled?.()) break;
            await resolve(book);
          }
          const sameWork = related.filter((book) => sameReadingWork(source, book, identities));
          if (sameWork.length) {
            candidates = sameWork;
            if (sameWork.length === 1) bookId = sameWork[0]!.id;
          }
        }
      }
      if (!candidates.length && !dependencies.cancelled?.()) {
        let hits: Book[] = [];
        try {
          hits = await dependencies.search(entry);
        } catch {
          /* Keep the preview available for manual assignment. */
        }
        candidates = [...new Map(hits.map((book) => [book.id, book])).values()];
        const exact = entry.authors.length ? matchingFragmentBooks(entry, candidates) : [];
        if (exact.length) {
          // Several catalogue editions of one verified title/author are equivalent for a
          // new fragments book. Reimports reuse available fragment books before searching.
          const safe = exact.every((book) => sameReadingWork(exact[0]!, book));
          const unresolvedOwned = related.some((book) => !identities[book.id]?.verified);
          if (safe && !unresolvedOwned)
            bookId = [...exact].sort(
              (a, b) => Number(!!b.cover_url) - Number(!!a.cover_url) || a.id.localeCompare(b.id),
            )[0]!.id;
        }
      }
    }
    if (bookId && !known.some((book) => book.id === bookId)) {
      const selected = candidates.find((book) => book.id === bookId);
      if (selected) known.push(selected);
    }
    result.set(key, { bookId, automatic: !!bookId, candidates });
    dependencies.progress?.(++done, groups.size);
  }
  return result;
}
