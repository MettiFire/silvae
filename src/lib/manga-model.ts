import type { Book } from "./books";
export type MangaDetails = { totalVolumes: number | null; status: string; source: string };
export type MangaRange = [number, number];
export type MangaProgress = {
  ranges: MangaRange[];
  total: number | null;
  edition: string;
  updatedAt: string;
};
export const MANGA_FIELD = "manga_progress_v1";
export const MAX_MANGA_VOLUMES = 2000;
export function isMangaId(id: string) {
  return /^manga:md:[0-9a-f-]{36}$/.test(id);
}
export function volumeNumber(value: unknown): number | null {
  const n = typeof value === "string" && !value.trim() ? NaN : Number(value);
  return Number.isInteger(n) && n > 0 && n <= MAX_MANGA_VOLUMES ? n : null;
}
export function readVolumes(progress?: MangaProgress | null): number[] {
  return (progress?.ranges ?? []).flatMap(([a, b]) =>
    Array.from({ length: b - a + 1 }, (_, i) => a + i),
  );
}
export function volumeRanges(volumes: number[]): MangaRange[] {
  const ranges: MangaRange[] = [];
  for (const n of [
    ...new Set(volumes.filter((v) => typeof v === "number" && volumeNumber(v) !== null)),
  ].sort((a, b) => a - b)) {
    const last = ranges.at(-1);
    if (last && n === last[1] + 1) last[1] = n;
    else ranges.push([n, n]);
  }
  return ranges;
}
export function parseMangaProgress(value: unknown): MangaProgress | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (
    !Array.isArray(p["ranges"]) ||
    p["ranges"].length > MAX_MANGA_VOLUMES ||
    typeof p["updatedAt"] !== "string" ||
    !Number.isFinite(Date.parse(p["updatedAt"]))
  )
    return null;
  const ranges = p["ranges"] as unknown[];
  if (
    ranges.some(
      (r) =>
        !Array.isArray(r) ||
        r.length !== 2 ||
        typeof r[0] !== "number" ||
        typeof r[1] !== "number" ||
        volumeNumber(r[0]) === null ||
        volumeNumber(r[1]) === null ||
        r[0] > r[1],
    )
  )
    return null;
  const merged: MangaRange[] = [];
  for (const [a, b] of (ranges as MangaRange[])
    .map((r) => [...r] as MangaRange)
    .sort((x, y) => x[0] - y[0])) {
    const last = merged.at(-1);
    if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  return {
    ranges: merged,
    total: volumeNumber(p["total"]),
    edition: typeof p["edition"] === "string" ? p["edition"].trim().slice(0, 100) : "",
    updatedAt: p["updatedAt"],
  };
}
export function mangaCompletion(progress: MangaProgress, manga: MangaDetails) {
  const volumes = readVolumes(progress);
  const total = progress.total ?? manga.totalVolumes;
  return {
    count: volumes.length,
    total,
    complete:
      manga.status === "completed" &&
      total !== null &&
      Array.from({ length: total }, (_, i) => i + 1).every((n) => volumes.includes(n)),
    next:
      Array.from({ length: MAX_MANGA_VOLUMES }, (_, i) => i + 1).find(
        (n) => !volumes.includes(n),
      ) ?? null,
  };
}
export type MangaDexRecord = {
  id: string;
  attributes: {
    title: Record<string, string>;
    altTitles?: Record<string, string>[];
    description?: Record<string, string>;
    lastVolume?: string | null;
    status?: string;
    year?: number;
    tags?: { attributes: { name: Record<string, string> } }[];
  };
  relationships?: { id: string; type: string; attributes?: { name?: string; fileName?: string } }[];
};
export function mapManga(record: MangaDexRecord, language = "it"): Book {
  const a = record.attributes;
  const translated = a.altTitles?.find((t) => t[language])?.[language];
  const title =
    a.title[language] ??
    translated ??
    a.title["en"] ??
    a.title["ja-ro"] ??
    Object.values(a.title)[0] ??
    "Manga";
  const cover = record.relationships?.find((r) => r.type === "cover_art")?.attributes?.fileName;
  return {
    id: `manga:md:${record.id}`,
    title,
    authors: [
      ...new Set(
        (record.relationships ?? [])
          .filter((r) => ["author", "artist"].includes(r.type))
          .map((r) => r.attributes?.name)
          .filter((n): n is string => !!n),
      ),
    ],
    cover_url: cover
      ? `https://uploads.mangadex.org/covers/${record.id}/${encodeURIComponent(cover)}.256.jpg`
      : null,
    published_year: a.year ?? null,
    page_count: null,
    categories: ["Manga", "Comics & Graphic Novels"],
    description: a.description?.[language] ?? a.description?.["en"] ?? null,
    manga: {
      totalVolumes: volumeNumber(a.lastVolume),
      status: a.status ?? "unknown",
      source: `https://mangadex.org/title/${record.id}`,
    },
  };
}

/** Volumes never become pages or separate library records. */
export function mangaLibraryPatch(
  progress: MangaProgress,
  manga: MangaDetails,
  previous: { status: string; started_at: string | null; finished_at: string | null },
  now = new Date().toISOString(),
) {
  const completion = mangaCompletion(
    progress,
    manga.status === "unknown" && previous.status === "read"
      ? { ...manga, status: "completed" }
      : manga,
  );
  if (completion.total && readVolumes(progress).some((n) => n > completion.total!))
    throw Error(
      "Ci sono volumi letti oltre il totale indicato. Correggi il totale o deselezionali.",
    );
  return {
    status: completion.complete
      ? ("read" as const)
      : completion.count
        ? ("reading" as const)
        : ("to_read" as const),
    current_page: 0,
    total_pages: null,
    progress_percent: null,
    started_at: completion.count ? (previous.started_at ?? now) : previous.started_at,
    finished_at: completion.complete ? (previous.finished_at ?? now) : null,
  };
}
