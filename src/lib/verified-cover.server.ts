import { fetchMangaCatalogue } from "./manga-catalogue.ts";

const OL_COVERS = "https://covers.openlibrary.org/b";
const OPEN_LIBRARY_ID = /^ol:(OL\d{1,14}[MW])$/;
const GOOGLE_VOLUME_ID = /^[A-Za-z0-9_-]{12}$/;
const MANGADEX_ID = /^manga:md:([a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})$/;
const MAL_ID = /^manga:mal:([1-9]\d{0,7})$/;

function olCoverLinks(covers: unknown[] = []) {
  return covers
    .filter((id) => Number.isSafeInteger(id) && Number(id) > 0)
    .map((id) => `${OL_COVERS}/id/${id}-M.jpg?default=false`);
}

async function catalogueJson<T>(url: URL | string, fetcher: typeof fetch): Promise<T | null> {
  const response = await fetcher(url, { signal: AbortSignal.timeout(6000), redirect: "error" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Catalogue response ${response.status}`);
  return (await response.json()) as T;
}

async function openLibraryLinks(id: string, fetcher: typeof fetch) {
  const edition = id.endsWith("M");
  const base = `https://openlibrary.org/${edition ? "books" : "works"}/${id}`;
  const record = await catalogueJson<{ key: string; covers?: unknown[] }>(`${base}.json`, fetcher);
  if (record?.key !== `/${edition ? "books" : "works"}/${id}`) return [];
  const main = olCoverLinks(record.covers);
  if (edition) return [...main, `${OL_COVERS}/olid/${id}-M.jpg?default=false`];
  const editions = await catalogueJson<{ entries?: { covers?: unknown[] }[] }>(
    `${base}/editions.json?limit=8`,
    fetcher,
  ).catch(() => null);
  return [...main, ...(editions?.entries ?? []).flatMap((entry) => olCoverLinks(entry.covers))];
}

async function googleEditionLinks(id: string, fetcher: typeof fetch) {
  const url = new URL(`https://www.googleapis.com/books/v1/volumes/${id}`);
  const apiKey = process.env["GOOGLE_API_KEY"];
  if (apiKey) url.searchParams.set("key", apiKey);
  const record = await catalogueJson<{
    id: string;
    volumeInfo?: { industryIdentifiers?: { type: string; identifier: string }[] };
  }>(url, fetcher);
  if (record?.id !== id) return [];
  // Exact ISBNs identify the edition and Open Library's default=false returns
  // an error for a missing image instead of a generic Google thumbnail.
  return (record.volumeInfo?.industryIdentifiers ?? [])
    .filter(
      ({ type, identifier }) =>
        /^ISBN_(10|13)$/.test(type) && /^(?:\d{9}[\dX]|\d{13})$/.test(identifier),
    )
    .map(({ identifier }) => `${OL_COVERS}/isbn/${identifier}-M.jpg?default=false`);
}

function trustedImage(url: URL) {
  if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
  if (url.hostname === "covers.openlibrary.org")
    return /^\/b\/(id|olid|isbn)\/[\w-]+-M\.jpg$/.test(url.pathname);
  if (url.hostname === "uploads.mangadex.org")
    return /^\/covers\/[a-f\d-]{36}\/[\w.-]+\.jpg$/.test(url.pathname);
  if (url.hostname === "cdn.myanimelist.net")
    return /^\/images\/manga\/\d+\/\d+\w*\.jpg$/.test(url.pathname);
  if (url.hostname === "s4.anilist.co")
    return /^\/file\/anilistcdn\/media\/manga\/cover\/[\w/-]+\.(png|jpg|webp)$/.test(url.pathname);
  return false;
}

function openLibraryRedirect(url: URL) {
  if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
  if (url.hostname === "archive.org") {
    return /^\/download\/m_covers_\d+\/m_covers_[\d_]+\.zip\/\d+-M\.jpg$/.test(url.pathname);
  }
  return (
    /^ia\d+\.[a-z]{2}\.archive\.org$/.test(url.hostname) &&
    url.pathname === "/view_archive.php" &&
    /^\/\d+\/items\/m_covers_\d+\/m_covers_[\d_]+\.zip$/.test(
      url.searchParams.get("archive") ?? "",
    ) &&
    /^\d+-M\.jpg$/.test(url.searchParams.get("file") ?? "")
  );
}

async function validImage(address: string, fetcher: typeof fetch) {
  let url = new URL(address);
  if (!trustedImage(url)) return false;
  const openLibrary = url.hostname === "covers.openlibrary.org";
  const options = { signal: AbortSignal.timeout(7000), redirect: "manual" } as const;
  let response = await fetcher(url, options);
  for (
    let hops = 0;
    openLibrary && response.status >= 300 && response.status < 400 && hops < 3;
    hops++
  ) {
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) return false;
    url = new URL(location, url);
    if (!openLibraryRedirect(url)) return false;
    response = await fetcher(url, options);
  }
  const body = response.body;
  if (!body) return false;
  if (
    !response.ok ||
    !/^image\/(jpeg|png|webp)(?:;|$)/i.test(response.headers.get("content-type") ?? "")
  ) {
    await body.cancel();
    return false;
  }
  const reader = body.getReader();
  try {
    // Reject empty/placeholder responses without buffering the whole cover.
    const prefix = new Uint8Array(1536);
    let size = 0;
    while (size < prefix.length) {
      const { value, done } = await reader.read();
      if (done) return false;
      const chunk = value.subarray(0, prefix.length - size);
      prefix.set(chunk, size);
      size += chunk.length;
    }
    return (
      (prefix[0] === 255 && prefix[1] === 216 && prefix[2] === 255) ||
      (prefix[0] === 137 && String.fromCharCode(...prefix.subarray(1, 4)) === "PNG") ||
      (String.fromCharCode(...prefix.subarray(0, 4)) === "RIFF" &&
        String.fromCharCode(...prefix.subarray(8, 12)) === "WEBP")
    );
  } finally {
    await reader.cancel();
  }
}

export async function resolveVerifiedCover(bookId: string, fetcher: typeof fetch = fetch) {
  const olId = OPEN_LIBRARY_ID.exec(bookId)?.[1];
  const mdId = MANGADEX_ID.exec(bookId)?.[1];
  const malId = MAL_ID.exec(bookId)?.[1];
  let candidates: string[];
  if (olId) candidates = await openLibraryLinks(olId, fetcher);
  else if (mdId || malId) {
    const books = await fetchMangaCatalogue({
      id: mdId,
      malId: malId ? Number(malId) : undefined,
      query: "",
      language: "",
    });
    candidates = books
      .filter((book) => book.id === bookId && book.cover_url)
      .map((book) => book.cover_url!);
  } else if (GOOGLE_VOLUME_ID.test(bookId)) candidates = await googleEditionLinks(bookId, fetcher);
  else return null;

  const checked = await Promise.all(
    [...new Set(candidates)].slice(0, 4).map(async (url) => {
      try {
        return (await validImage(url, fetcher)) ? url : null;
      } catch {
        return null;
      }
    }),
  );
  return checked.find(Boolean) ?? null;
}
