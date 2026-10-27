import { descriptionText } from "./book-metadata.ts";
import type { Book } from "./books";
export type MangaDetails = {
  canonicalTitle?: string | undefined;
  totalVolumes: number | null;
  status: string;
  source: string;
  mangaDexId?: string | undefined;
  malId?: number | undefined;
};
export type MangaVolumeCover = {
  volume: number;
  url: string;
  language: string;
  cover_candidates?: string[];
};
export function missingPreviousVolumes(volumes: number[], selected: number) {
  if (volumeNumber(selected) === null) return [];
  const read = new Set(volumes);
  return Array.from({ length: Math.max(0, selected - 1) }, (_, i) => i + 1).filter(
    (n) => !read.has(n),
  );
}
export function selectMangaVolume(volumes: number[], selected: number, includePrevious = false) {
  if (volumeNumber(selected) === null) return volumes;
  if (volumes.includes(selected)) return volumes.filter((n) => n !== selected);
  return [
    ...new Set([
      ...volumes,
      selected,
      ...(includePrevious ? missingPreviousVolumes(volumes, selected) : []),
    ]),
  ].sort((a, b) => a - b);
}
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
  return /^manga:md:[0-9a-f-]{36}$/.test(id) || /^manga:mal:[1-9]\d{0,7}$/.test(id);
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
  const read = new Set(volumes);
  const total = progress.total ?? manga.totalVolumes;
  return {
    count: volumes.length,
    total,
    complete:
      manga.status === "completed" &&
      total !== null &&
      Array.from({ length: total }, (_, i) => i + 1).every((n) => read.has(n)),
    next:
      Array.from({ length: MAX_MANGA_VOLUMES }, (_, i) => i + 1).find((n) => !read.has(n)) ?? null,
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
    links?: { mal?: string };
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
    description:
      descriptionText(a.description?.[language] ?? a.description?.["en"] ?? "")
        .split(/\n---+/)[0]!
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\*\*|__/g, "")
        .trim() || null,
    manga: {
      canonicalTitle: a.title["en"] ?? a.title["ja-ro"] ?? title,
      mangaDexId: record.id,
      ...(a.links?.mal && /^\d+$/.test(a.links.mal) ? { malId: Number(a.links.mal) } : {}),
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

export type JikanManga = {
  mal_id: number;
  title: string;
  title_english?: string | null;
  titles?: { type: string; title: string }[];
  type?: string;
  volumes?: number | null;
  status?: string;
  publishing?: boolean;
  synopsis?: string | null;
  published?: { from?: string | null };
  authors?: { name: string }[];
  images?: { jpg?: { large_image_url?: string; image_url?: string } };
};
export function mapJikanManga(record: JikanManga): Book {
  return {
    id: `manga:mal:${record.mal_id}`,
    title: record.title_english || record.title,
    authors: (record.authors ?? []).map((a) => a.name.split(", ").reverse().join(" ")),
    cover_url: record.images?.jpg?.large_image_url ?? record.images?.jpg?.image_url ?? null,
    published_year: record.published?.from
      ? new Date(record.published.from).getUTCFullYear()
      : null,
    page_count: null,
    categories: ["Manga", "Comics & Graphic Novels"],
    description: record.synopsis ?? null,
    manga: {
      malId: record.mal_id,
      totalVolumes: volumeNumber(record.volumes),
      status:
        record.status === "Finished" ? "completed" : record.publishing ? "ongoing" : "unknown",
      source: `https://myanimelist.net/manga/${record.mal_id}`,
    },
  };
}
export function mergeMangaResults(primary: Book[], secondary: Book[]) {
  const ids = new Set<string>();
  const malIds = new Set<number>();
  const titles = new Set<string>();
  const normalize = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  return [...primary, ...secondary]
    .filter((book) => {
      const key = normalize(book.title) + ":" + book.authors.map(normalize).sort().join("|");
      if (
        ids.has(book.id) ||
        (book.manga?.malId && malIds.has(book.manga.malId)) ||
        titles.has(key)
      )
        return false;
      ids.add(book.id);
      if (book.manga?.malId) malIds.add(book.manga.malId);
      titles.add(key);
      return true;
    })
    .slice(0, 20);
}

export type MangaDexCover = {
  attributes: { volume?: string | null; fileName: string; locale?: string | null };
};
export function mangaVolumeCovers(
  records: MangaDexCover[],
  mangaId: string,
  language: string,
): MangaVolumeCover[] {
  const covers = new Map<number, { language: string; base: string }[]>();
  const priority = (locale: string) =>
    locale === language ? 0 : locale === "ja" ? 1 : locale === "en" ? 2 : 3;
  for (const record of records) {
    const n = volumeNumber(record.attributes.volume);
    if (!n || !record.attributes.fileName) continue;
    const item = {
      language: record.attributes.locale ?? "ja",
      base: `https://uploads.mangadex.org/covers/${mangaId}/${encodeURIComponent(record.attributes.fileName)}`,
    };
    const group = covers.get(n) ?? [];
    group.push(item);
    covers.set(n, group);
  }
  return [...covers.entries()]
    .map(([volume, group]) => {
      group.sort((a, b) => priority(a.language) - priority(b.language));
      const candidates = [
        ...new Set(
          group.flatMap((item) => [`${item.base}.256.jpg`, `${item.base}.512.jpg`, item.base]),
        ),
      ].slice(0, 9);
      return {
        volume,
        language: group[0]!.language,
        url: candidates[0]!,
        cover_candidates: candidates,
      };
    })
    .sort((a, b) => a.volume - b.volume);
}

/** MangaDex searches primary English titles more reliably than translated aliases. */
export function mangaSearchTitle(query: string): string {
  const aliases: Record<string, string> = {
    "l attacco dei giganti": "Attack on Titan",
    "lattacco dei giganti": "Attack on Titan",
    "attacco dei giganti": "Attack on Titan",
    "shingeki no kyojin": "Attack on Titan",
    "case closed": "Detective Conan",
    "meitantei conan": "Detective Conan",
    conan: "Detective Conan",
    "i cavalieri dello zodiaco": "Saint Seiya",
    "cavalieri dello zodiaco": "Saint Seiya",
    lamu: "Urusei Yatsura",
    "kimetsu no yaiba": "Demon Slayer",
  };
  const key = query
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  if (Object.hasOwn(aliases, key)) return aliases[key]!;
  const partial =
    key.length >= 6
      ? [
          ...new Set(
            Object.entries(aliases)
              .filter(([name]) => name.startsWith(key))
              .map(([, title]) => title),
          ),
        ]
      : [];
  return partial.length === 1 ? partial[0]! : query;
}
