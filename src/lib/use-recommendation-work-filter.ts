import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Book } from "./books";
import { resolveRecommendationWork } from "./work-identity.functions";
import {
  canRecommendWork,
  directWorkIdentity,
  sameReadingWork,
  sharedAuthor,
  type WorkIdentities,
} from "./work-identity";

// Avoid firing dozens of lookups simultaneously on an author's bibliography.
let active = 0;
const waiting: (() => void)[] = [];
async function resolveLimited(book: Book, signal: AbortSignal) {
  await new Promise<void>((resolve) => {
    if (active < 2) {
      active++;
      resolve();
    } else waiting.push(resolve);
  });
  try {
    signal.throwIfAborted();
    return await resolveRecommendationWork({
      signal,
      data: {
        id: book.id,
        title: book.title,
        authors: book.authors,
        ...(book.isbns ? { isbns: book.isbns.slice(0, 3) } : {}),
      },
    });
  } catch (error) {
    if (signal.aborted) throw error;
    // A failed lookup only means "unverified": never break the page for it.
    return { workIds: [], titles: [], verified: false };
  } finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}
/** Resolve only author overlaps with the library; unrelated recommendations need no extra requests. */
export function useRecommendationWorkFilter(candidates: Book[], excluded: Book[]) {
  const lookups = useMemo(() => {
    const related = candidates.filter((book) =>
      excluded.some((other) => sharedAuthor(book, other) && !sameReadingWork(book, other)),
    );
    const books = [
      ...excluded.filter((book) => related.some((other) => sharedAuthor(book, other))),
      ...related,
    ];
    return [
      ...new Map(
        books.filter((book) => !directWorkIdentity(book)).map((book) => [book.id, book]),
      ).values(),
    ];
  }, [candidates, excluded]);
  const queries = useQueries({
    queries: lookups.map((book) => ({
      queryKey: ["recommendation-work-v1", book.id, book.title, book.authors.join("|")],
      queryFn: ({ signal }: { signal: AbortSignal }) => resolveLimited(book, signal),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });
  const identities: WorkIdentities = {};
  queries.forEach((query, index) => {
    if (query.data) identities[lookups[index]!.id] = query.data;
  });
  const eligible = candidates.filter((book) => canRecommendWork(book, excluded, identities));
  return { identities, eligible, verifying: queries.some((query) => query.isPending) };
}
