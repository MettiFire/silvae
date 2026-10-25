import type { AuthorCandidate } from "./authors";
import { authorCountryKey } from "./author-country-key.ts";
import { textKey } from "./work-identity.ts";

export const authorAliases = (author: Pick<AuthorCandidate, "name" | "alternateNames">) => [
  ...new Set([author.name, ...(author.alternateNames ?? [])].filter(Boolean)),
];
const year = (value: string | null | undefined) => value?.match(/\b\d{4}\b/)?.[0];
function sameName(a: AuthorCandidate, b: AuthorCandidate) {
  return authorAliases(a).some((name) =>
    authorAliases(b).some(
      (other) =>
        authorCountryKey(name) === authorCountryKey(other) &&
        (textKey(name).split(" ").length > 1 ||
          authorCountryKey(name) === authorCountryKey(a.name) ||
          authorCountryKey(name) === authorCountryKey(b.name)),
    ),
  );
}
function compatible(a: AuthorCandidate, b: AuthorCandidate) {
  for (const field of ["birth", "death"] as const)
    if (year(a[field]) && year(b[field]) && year(a[field]) !== year(b[field])) return false;
  return true;
}
/** One identity policy for autocomplete, default selection and the homonym picker. */
export function groupAuthors(candidates: AuthorCandidate[]) {
  const groups: AuthorCandidate[][] = [];
  const sorted = [...candidates].sort(
    (a, b) => (b.workCount ?? 0) - (a.workCount ?? 0) || Number(!!b.birth) - Number(!!a.birth),
  );
  for (const candidate of sorted) {
    const group = groups.find(
      (group) =>
        group.every((other) => compatible(other, candidate)) &&
        group.some((other) => {
          const ids = new Set([other.id, ...(other.ids ?? [])]);
          if ([candidate.id, ...(candidate.ids ?? [])].some((id) => ids.has(id))) return true;
          if (!sameName(other, candidate)) return false;
          if (year(other.birth) && year(candidate.birth)) return true;
          if (
            other.topWork &&
            candidate.topWork &&
            textKey(other.topWork) === textKey(candidate.topWork)
          )
            return true;
          // Sparse duplicate catalogue entries must not create a second person.
          return (
            Math.min(other.workCount ?? 0, candidate.workCount ?? 0) <= 2 &&
            (Math.max(other.workCount ?? 0, candidate.workCount ?? 0) > 2 ||
              !!other.birth ||
              !!candidate.birth)
          );
        }),
    );
    if (group) group.push(candidate);
    else groups.push([candidate]);
  }
  return groups.map((group) => ({
    ...group[0]!,
    birth: group.find((author) => author.birth)?.birth ?? null,
    death: group.find((author) => author.death)?.death ?? null,
    ids: [...new Set(group.flatMap((author) => [author.id, ...(author.ids ?? [])]))],
    alternateNames: [...new Set(group.flatMap(authorAliases))],
  }));
}
/** Collapse consecutive initials, not full names: “J. R. R.” and “JRR” are equivalent. */
function searchNameParts(name: string) {
  const ordered = name.includes(",") ? name.split(",").reverse().join(" ") : name;
  return textKey(ordered)
    .replace(/\b(?:[a-z] ){1,}[a-z]\b/g, (initials) => initials.replaceAll(" ", ""))
    .split(" ")
    .filter(Boolean);
}
export function authorMatchesQuery(author: AuthorCandidate, query: string) {
  if (/\b(convegno|simposio|conference|congress|festival|memoria)\b/.test(textKey(author.name)))
    return false;
  const words = searchNameParts(query);
  if (!words.length) return false;
  return authorAliases(author).some((name) => {
    if (authorCountryKey(name) === authorCountryKey(query)) return true;
    const parts = searchNameParts(name);
    // Match each query word once, reserving prefix completion for its final word.
    // Consume exact matches first so “Tolk Tolkien” cannot reuse a single surname.
    const remaining = [...parts];
    for (const word of words.slice(0, -1)) {
      const index = remaining.indexOf(word);
      if (index < 0) return false;
      remaining.splice(index, 1);
    }
    return remaining.some((part) => part.startsWith(words.at(-1)!));
  });
}
export function authorSearchResults(candidates: AuthorCandidate[], limit = 3, query = "") {
  let relevant = groupAuthors(candidates);
  if (query.trim()) {
    relevant = relevant.filter(
      (author) => authorMatchesQuery(author, query) && (!!author.birth || author.workCount >= 2),
    );
    const exact = relevant.filter((author) =>
      authorAliases(author).some((name) => authorCountryKey(name) === authorCountryKey(query)),
    );
    if (exact.length) relevant = exact;
  }
  return relevant.slice(0, limit);
}

/** Use catalogue aliases, never an invented translation or an arbitrary route label. */
export function authorDisplayName(names: string[], preferred?: string, language?: string) {
  const latin = !["ru", "uk", "ar", "ja", "zh", "ko"].includes(language ?? "en");
  const usable = names.filter((name) => !!name?.trim() && name.length <= 160);
  const hasLatin = (name: string) =>
    /\p{Script=Latin}/u.test(name) &&
    !/[\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Han}]/u.test(name);
  const exact =
    preferred && usable.find((name) => authorCountryKey(name) === authorCountryKey(preferred));
  if (
    exact &&
    (textKey(exact).split(" ").length > 1 ||
      !usable.some((name) => textKey(name).split(" ").length > 1)) &&
    (!latin || hasLatin(exact))
  )
    return exact;
  if (latin)
    return (
      usable.find(
        (name) => hasLatin(name) && textKey(name).split(" ").length > 1 && !/\d/.test(name),
      ) ??
      usable.find(hasLatin) ??
      usable[0] ??
      "Autore"
    );
  return usable[0] ?? "Autore";
}
