import { createServerFn } from "@tanstack/react-start";
import { mapManga, type MangaDexRecord } from "./manga-model";
import type { Book } from "./books";
const cache = new Map<string, { until: number; books: Book[] }>();
const pending = new Map<string, Promise<Book[]>>();
let queue: Promise<unknown> = Promise.resolve();
export const mangaCatalogue = createServerFn({ method: "GET" })
  .validator((input: { query?: string; id?: string; language?: string }) => {
    if (input.id && !/^[0-9a-f-]{36}$/.test(input.id)) throw Error("Serie non valida");
    const query = (input.query ?? "").trim().slice(0, 120);
    if (!input.id && query.length < 2) throw Error("Scrivi almeno due caratteri");
    return {
      id: input.id,
      query,
      language: /^[a-z]{2}$/.test(input.language ?? "") ? input.language! : "it",
    };
  })
  .handler(async ({ data }) => {
    const key = JSON.stringify(data);
    const hit = cache.get(key);
    if (hit && hit.until > Date.now()) return hit.books;
    if (pending.has(key)) return pending.get(key)!;
    const task = queue
      .catch(() => undefined)
      .then(async () => {
        const params = new URLSearchParams({ "includes[]": "cover_art" });
        params.append("includes[]", "author");
        params.append("includes[]", "artist");
        if (!data.id) {
          params.set("title", data.query);
          params.set("limit", "12");
          params.set("order[relevance]", "desc");
          params.append("contentRating[]", "safe");
          params.append("contentRating[]", "suggestive");
        }
        const response = await fetch(
          `https://api.mangadex.org/manga${data.id ? `/${data.id}` : ""}?${params}`,
          { signal: AbortSignal.timeout(10000), headers: { Accept: "application/json" } },
        );
        if (!response.ok)
          throw Error(
            response.status === 429
              ? "Catalogo manga occupato, riprova tra poco."
              : "Catalogo manga non disponibile. Riprova.",
          );
        const raw = (await response.json()) as { data: MangaDexRecord | MangaDexRecord[] };
        const rows = Array.isArray(raw.data) ? raw.data : [raw.data];
        const books = rows
          .filter(Boolean)
          .filter(
            (row) =>
              !!data.id ||
              !(row.attributes.tags ?? []).some((tag) => tag.attributes.name["en"] === "Doujinshi"),
          )
          .slice(0, 6)
          .map((row) => mapManga(row, data.language));
        cache.set(key, { books, until: Date.now() + 3600000 });
        while (cache.size > 300) cache.delete(cache.keys().next().value!);
        await new Promise((resolve) => setTimeout(resolve, 300));
        return books;
      });
    pending.set(key, task);
    queue = task;
    try {
      return await task;
    } finally {
      pending.delete(key);
    }
  });
