export const FRAGMENT_FEEDBACK_FIELD = "fragment_author_feedback_v1";
export type FragmentAuthorFeedback = { author: string; since: string };
const authorKey = (author: string) =>
  author
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
export function parseFragmentFeedback(value: unknown): FragmentAuthorFeedback[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .filter((row): row is FragmentAuthorFeedback => {
      if (
        !row ||
        typeof row.author !== "string" ||
        !row.author.trim() ||
        row.author.length > 160 ||
        typeof row.since !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.since) ||
        !Number.isFinite(Date.parse(row.since)) ||
        new Date(row.since).toISOString().slice(0, 10) !== row.since
      )
        return false;
      const key = authorKey(row.author);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 40)
    .map(({ author, since }) => ({ author, since }));
}
export function changeFragmentFeedback(
  previous: unknown,
  author: string,
  day: string,
  less: boolean,
) {
  const next = parseFragmentFeedback(previous).filter(
    (entry) => authorKey(entry.author) !== authorKey(author),
  );
  return parseFragmentFeedback(less ? [{ author, since: day }, ...next] : next);
}
/** Reduced authors remain eligible on roughly one day in five, never on the day of feedback. */
export function preferredFragmentPool<T extends { author: string }>(
  pool: readonly T[],
  feedback: readonly FragmentAuthorFeedback[],
  day: string,
): T[] {
  const reduced = new Map(feedback.map((entry) => [authorKey(entry.author), entry.since]));
  const alternatives = pool.filter((entry) => !reduced.has(authorKey(entry.author)));
  const allowed = pool.filter((entry) => {
    const since = reduced.get(authorKey(entry.author));
    if (!since) return true;
    let hash = 0;
    for (const c of `${day}:${authorKey(entry.author)}`)
      hash = (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0;
    return since !== day && hash % 5 === 0;
  });
  // Never replace a fragment with an empty page if all authors have been reduced.
  return allowed.length ? allowed : alternatives.length ? alternatives : [...pool];
}
