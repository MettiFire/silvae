import { createServerFn } from "@tanstack/react-start";

const API = "https://www.googleapis.com/books/v1/volumes";

/** Proxy Google Books search through the server so the API key stays secret. */
export const gbSearch = createServerFn({ method: "GET" })
  .validator((data: { params: Record<string, string> }) => data)
  .handler(async ({ data }) => {
    const key = process.env["GOOGLE_API_KEY"];
    const params = new URLSearchParams(data.params);
    if (key) params.set("key", key);
    const res = await fetch(`${API}?${params}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { status: res.status, json: "" };
    return { status: 200, json: await res.text() };
  });

/** Proxy a single-volume lookup. */
export const gbVolume = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const key = process.env["GOOGLE_API_KEY"];
    const url = key ? `${API}/${encodeURIComponent(data.id)}?key=${key}` : `${API}/${encodeURIComponent(data.id)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { status: res.status, json: "" };
    return { status: 200, json: await res.text() };
  });

/** Official Dynamic Links lookup: batched ISBN thumbnails, independent of Books v1 quota.
 * Parse the fixed JSONP envelope as JSON; never execute third-party JavaScript.
 * https://developers.google.com/books/docs/dynamic-links
 */
export const gbCovers = createServerFn({ method: "GET" })
  .validator((data: { isbns: string[] }) => ({ isbns: data.isbns.filter(s => /^(?:\d{9}[\dXx]|\d{13})$/.test(s)).slice(0, 120) }))
  .handler(async ({ data }) => {
    if (!data.isbns.length) return {} as Record<string, string>;
    const params = new URLSearchParams({ jscmd: 'viewapi', bibkeys: data.isbns.map(i => `ISBN:${i}`).join(','), callback: 'BookInfo' });
    const response = await fetch(`https://books.google.com/books?${params}`, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return {} as Record<string, string>;
    const raw = (await response.text()).trim();
    if (!raw.startsWith('BookInfo(') || !raw.endsWith(');')) return {} as Record<string, string>;
    const books = JSON.parse(raw.slice(9, -2)) as Record<string, { thumbnail_url?: string }>;
    const covers: Record<string, string> = {};
    for (const [key, book] of Object.entries(books)) {
      if (!book.thumbnail_url) continue;
      const url = new URL(book.thumbnail_url);
      if (url.hostname !== 'books.google.com') continue;
      url.protocol = 'https:';
      // Dynamic Links returns zoom=5, a tiny cover. Its returned book identifier
      // supports the standard thumbnail size without inventing an edition.
      url.searchParams.set('zoom', '1');
      covers[key.replace(/^ISBN:/, '')] = url.toString();
    }
    return covers;
  });
