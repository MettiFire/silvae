const KEY = "silvae:public-book-covers:v1";
const MAX = 100;
const TTL = 7 * 86400000;
type StorageLike = Pick<Storage, "getItem" | "setItem">;
type Entry = { id: string; url: string; at: number };
export function isPublicCatalogueCover(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2000) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (["books.google.com", "books.googleusercontent.com", "covers.openlibrary.org"].includes(
        url.hostname,
      ) ||
        (url.hostname === "uploads.mangadex.org" &&
          url.pathname.startsWith("/covers/") &&
          !url.search))
    );
  } catch {
    return false;
  }
}
function entries(storage: StorageLike, now: number): Entry[] {
  const data: unknown = JSON.parse(storage.getItem(KEY) ?? "[]");
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (item): item is Entry =>
        !!item &&
        typeof item.id === "string" &&
        item.id.length <= 300 &&
        isPublicCatalogueCover(item.url) &&
        Number.isFinite(item.at) &&
        item.at <= now &&
        now - item.at < TTL,
    )
    .slice(0, MAX);
}
/** Only public catalogue URLs: never persist signed/private uploads or account data. */
export function readCatalogueCover(storage: StorageLike, id: string, now = Date.now()) {
  try {
    return entries(storage, now).find((item) => item.id === id)?.url;
  } catch {
    return undefined;
  }
}
export function rememberCatalogueCover(
  storage: StorageLike,
  id: string,
  url: string,
  now = Date.now(),
) {
  if (!isPublicCatalogueCover(url) || !id || id.length > 300) return;
  try {
    const previous = entries(storage, now);
    if (previous.find((item) => item.id === id)?.url === url) return;
    storage.setItem(
      KEY,
      JSON.stringify(
        [{ id, url, at: now }, ...previous.filter((item) => item.id !== id)].slice(0, MAX),
      ),
    );
  } catch {
    /* A blocked or full local store must not prevent reading. */
  }
}
