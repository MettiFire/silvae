import { aniListCatalogue } from "./anilist-catalogue";
import {
  mapManga,
  mangaSearchTitle,
  mapJikanManga,
  mergeMangaResults,
  mangaVolumeCovers,
  type MangaDexRecord,
  type JikanManga,
  type MangaDexCover,
  type MangaVolumeCover,
} from "./manga-model";
import type { Book } from "./books";
export type MangaCatalogueInput = {
  id?: string | undefined;
  malId?: number | undefined;
  query: string;
  language: string;
};
export type MangaCoversInput = {
  id?: string | undefined;
  malId?: number | undefined;
  title: string;
  language: string;
};
const cache = new Map<string, { until: number; books: Book[] }>();
const pending = new Map<string, Promise<Book[]>>();
let mdQueue: Promise<unknown> = Promise.resolve();
let malQueue: Promise<unknown> = Promise.resolve();
async function request<T>(url: string, mal = false): Promise<T> {
  const slot = (mal ? malQueue : mdQueue)
    .catch(() => undefined)
    .then(() => new Promise<void>((resolve) => setTimeout(resolve, mal ? 1050 : 250)));
  if (mal) malQueue = slot;
  else mdQueue = slot;
  return slot.then(async () => {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(mal ? 4000 : 7000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw Error("Catalogo manga non disponibile. Riprova.");
    return (await response.json()) as T;
  });
}

async function mdSearch(query: string, language: string) {
  const params = new URLSearchParams({ title: query, limit: "32", "order[relevance]": "desc" });
  for (const include of ["cover_art", "author", "artist"]) params.append("includes[]", include);
  // Verified MangaDex tag IDs: exclude derivatives before pagination, not after.
  for (const tag of [
    "b13b2a48-c720-44a9-9c77-39c9979373fb",
    "7b2ce280-79ef-4c09-9b58-12b7c23a9b78",
    "320831a8-4026-470b-94f6-8353740e6f04",
  ])
    params.append("excludedTags[]", tag);
  for (const rating of ["safe", "suggestive"]) params.append("contentRating[]", rating);
  const raw = await request<{ data: MangaDexRecord[] }>(`https://api.mangadex.org/manga?${params}`);
  return (raw.data as MangaDexRecord[])
    .filter(
      (r) =>
        !(r.attributes.tags ?? []).some((t) =>
          ["Doujinshi", "Fan Colored", "Official Colored"].includes(t.attributes.name["en"] ?? ""),
        ),
    )
    .map((r) => mapManga(r, language));
}
export async function fetchMangaCatalogue(data: MangaCatalogueInput) {
  const key = JSON.stringify(data);
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.books;
  if (pending.has(key)) return pending.get(key)!;
  const task = (async () => {
    if (data.id) {
      const raw = await request<{ data: MangaDexRecord }>(
        `https://api.mangadex.org/manga/${data.id}?includes[]=cover_art&includes[]=author&includes[]=artist`,
      );
      return [mapManga(raw.data, data.language)];
    }
    if (data.malId) {
      try {
        const raw = await request<{ data: JikanManga }>(
          `https://api.jikan.moe/v4/manga/${data.malId}`,
          true,
        );
        return [mapJikanManga(raw.data)];
      } catch {
        return aniListCatalogue({ malId: data.malId });
      }
    }
    const alias = mangaSearchTitle(data.query);
    let primary: Book[] = [];
    let primaryError = false;
    try {
      primary = await mdSearch(alias ?? data.query, data.language);
    } catch {
      primaryError = true;
      // AniList is also accessible from browsers when a host cannot reach MangaDex.
      try {
        return await aniListCatalogue({ query: alias });
      } catch {
        /* Try Jikan below. */
      }
    }
    // Do not make a healthy, broad MangaDex search wait for the fallback provider.
    const queryKey = alias.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
    if (
      primary.length >= 8 ||
      primary.some((b) =>
        [b.title, b.manga?.canonicalTitle ?? ""].some(
          (title) => title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "") === queryKey,
        ),
      )
    )
      return mergeMangaResults(primary, []);
    try {
      const raw = await request<{ data: JikanManga[] }>(
        `https://api.jikan.moe/v4/manga?${new URLSearchParams({ q: alias ?? data.query, limit: "15", sfw: "true" })}`,
        true,
      );
      return mergeMangaResults(
        primary,
        raw.data
          .filter((r) => ["Manga", "Manhwa", "Manhua", "One-shot"].includes(r.type ?? ""))
          .map(mapJikanManga),
      );
    } catch {
      try {
        return mergeMangaResults(primary, await aniListCatalogue({ query: alias }));
      } catch {
        if (primaryError) throw Error("I cataloghi manga non rispondono. Riprova.");
        return primary;
      }
    }
  })()
    .then((books) => {
      cache.set(key, { books, until: Date.now() + 3600000 });
      while (cache.size > 300) cache.delete(cache.keys().next().value!);
      return books;
    })
    .finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
const coversCache = new Map<string, { until: number; covers: MangaVolumeCover[] }>();
const coversPending = new Map<string, Promise<MangaVolumeCover[]>>();
export async function fetchMangaCovers(data: MangaCoversInput) {
  const key = JSON.stringify(data);
  const hit = coversCache.get(key);
  if (hit && hit.until > Date.now()) return hit.covers;
  if (coversPending.has(key)) return coversPending.get(key)!;
  const task = (async () => {
    const id =
      data.id ??
      (await mdSearch(data.title, data.language)).find((b) => b.manga?.malId === data.malId)?.manga
        ?.mangaDexId;
    if (!id) return [];
    const records: MangaDexCover[] = [];
    for (let offset = 0; offset < 400; offset += 100) {
      const params = new URLSearchParams({
        "manga[]": id,
        limit: "100",
        offset: String(offset),
        "order[volume]": "asc",
      });
      const raw = await request<{ data: MangaDexCover[]; total: number }>(
        `https://api.mangadex.org/cover?${params}`,
      );
      records.push(...raw.data);
      if (records.length >= raw.total || raw.data.length < 100) break;
    }
    return mangaVolumeCovers(records, id, data.language);
  })()
    .then((covers) => {
      coversCache.set(key, { covers, until: Date.now() + 86400000 });
      while (coversCache.size > 100) coversCache.delete(coversCache.keys().next().value!);
      return covers;
    })
    .finally(() => coversPending.delete(key));
  coversPending.set(key, task);
  return task;
}
