export type ArchivedFragment = {
  id: string;
  quote: string;
  author: string;
  title: string;
  language: string;
  section: string;
  source: string;
  license: string;
  sourceName: string;
  workKey: string;
  revision: number;
};
const key = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
export function fragmentWorkKey(author: string, title: string) {
  return `${key(author)}:${key(title)}`;
}
function hash(text: string) {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
/** Deterministic author-interleaved work order. Each work has one slot regardless of excerpt count. */
export function archiveWorkOrder<T extends { author: string; title: string; id: string }>(
  pool: readonly T[],
) {
  const works = new Map<string, T[]>();
  for (const entry of pool) {
    const work = fragmentWorkKey(entry.author, entry.title);
    works.set(work, [...(works.get(work) ?? []), entry]);
  }
  const authors = new Map<string, T[][]>();
  for (const group of works.values()) {
    const author = key(group[0]!.author);
    authors.set(author, [...(authors.get(author) ?? []), group]);
  }
  const queues = [...authors.entries()]
    .sort(([a], [b]) => hash(a) - hash(b))
    .map(([, groups]) =>
      groups.sort(
        (a, b) =>
          hash(fragmentWorkKey(a[0]!.author, a[0]!.title)) -
          hash(fragmentWorkKey(b[0]!.author, b[0]!.title)),
      ),
    );
  const ordered: T[][] = [];
  while (queues.some((q) => q.length))
    for (const q of queues) {
      const next = q.shift();
      if (next) ordered.push(next);
    }
  // Reduce adjacent author repeats, including the cycle boundary, when alternatives exist.
  for (let i = 1; i < ordered.length; i++)
    if (key(ordered[i]![0]!.author) === key(ordered[i - 1]![0]!.author)) {
      const swap = ordered.findIndex(
        (g, j) =>
          j > i &&
          key(g[0]!.author) !== key(ordered[i - 1]![0]!.author) &&
          (j === ordered.length - 1 ||
            key(ordered[j + 1]![0]!.author) !== key(ordered[i]![0]!.author)),
      );
      if (swap >= 0) [ordered[i], ordered[swap]] = [ordered[swap]!, ordered[i]!];
    }
  return ordered;
}
export function selectArchiveFragment<T extends { author: string; title: string; id: string }>(
  day: string,
  pool: readonly T[],
) {
  const timestamp = Date.parse(`${day}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== day
  )
    throw Error("Invalid fragment day");
  const works = archiveWorkOrder(pool);
  if (!works.length) throw Error("Empty fragment archive");
  const offset =
    Math.floor(timestamp / 86400000) - Math.floor(Date.parse("2026-10-26T00:00:00Z") / 86400000);
  const position = ((offset % works.length) + works.length) % works.length;
  const excerpts = works[position]!.slice().sort((a, b) => a.id.localeCompare(b.id));
  const cycle = Math.floor(offset / works.length);
  return excerpts[((cycle % excerpts.length) + excerpts.length) % excerpts.length]!;
}
export function validArchive(value: unknown, language: string): value is ArchivedFragment[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((e) => {
      if (!e || typeof e !== "object") return false;
      const r = e as Record<string, unknown>;
      return (
        ["id", "quote", "author", "title", "section", "source", "workKey", "sourceName"].every(
          (k) => typeof r[k] === "string" && (r[k] as string).length > 0,
        ) &&
        r["language"] === language &&
        r["license"] === "4.0" &&
        Number.isSafeInteger(r["revision"]) &&
        /^https:\/\/(it|en)\.wikiquote\.org\/w\/index\.php\?/.test(String(r["source"]))
      );
    })
  );
}

export async function loadFragmentArchive(
  language: string,
  fetcher: typeof fetch = fetch,
): Promise<ArchivedFragment[]> {
  const manifestResponse = await fetcher("/fragments/manifest.json");
  if (!manifestResponse.ok) throw Error("Fragment archive unavailable");
  const manifest = (await manifestResponse.json()) as {
    version?: number;
    languages?: Record<string, { file?: string }>;
  };
  const file = manifest.languages?.[language]?.file;
  if (
    manifest.version !== 1 ||
    !file ||
    !(/^(it|en)-[a-f0-9]{12}\.json$/.test(file) && file.startsWith(`${language}-`))
  )
    throw Error("Invalid fragment manifest");
  const response = await fetcher(`/fragments/${file}`);
  if (!response.ok) throw Error("Fragment archive unavailable");
  const archive: unknown = await response.json();
  if (!validArchive(archive, language)) throw Error("Invalid fragment archive");
  return archive;
}
