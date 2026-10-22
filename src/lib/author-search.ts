import type { AuthorCandidate } from "./authors";
import { authorNameKey } from "./followed-authors.ts";

/** Catalogue duplicates without biographical data should not crowd out real authors. */
export function authorSearchResults(candidates: AuthorCandidate[], limit = 3, query = "") {
  const exact = candidates.filter((a) => authorNameKey(a.name) === authorNameKey(query));
  const relevant = exact.length ? exact : candidates;
  const groups = new Map<string, AuthorCandidate[]>();
  for (const candidate of relevant) {
    const key = authorNameKey(candidate.name);
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }
  return [...groups.values()]
    .flatMap((group) => {
      const ranked = [...group].sort(
        (a, b) => Number(!!b.birth) - Number(!!a.birth) || b.workCount - a.workCount,
      );
      const dated = ranked.filter((a) => a.birth);
      if (!dated.length) return ranked.slice(0, 1);
      const seen = new Set<string>();
      return dated.filter((a) => {
        const birth = a.birth!.toLowerCase().trim();
        if (seen.has(birth)) return false;
        seen.add(birth);
        return true;
      });
    })
    .slice(0, limit);
}
