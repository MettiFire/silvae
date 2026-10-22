import { createServerFn } from "@tanstack/react-start";
import { resolveWork } from "./resolve-work";
import type { WorkBook, WorkIdentity } from "./work-identity";

const cache = new Map<string, { value: WorkIdentity; until: number }>();
const pending = new Map<string, Promise<WorkIdentity>>();
let queue: Promise<unknown> = Promise.resolve();
let lastRequest = 0;
/** Public bibliography only: cached across readers, no account IDs or private notes. */
export const resolveRecommendationWork = createServerFn({ method: "POST" })
  .validator((book: WorkBook) => {
    if (
      !book ||
      typeof book.id !== "string" ||
      typeof book.title !== "string" ||
      !Array.isArray(book.authors)
    )
      throw Error("Libro non valido");
    return {
      id: book.id.slice(0, 200),
      title: book.title.slice(0, 500),
      authors: book.authors
        .filter((a) => typeof a === "string")
        .slice(0, 10)
        .map((a) => a.slice(0, 150)),
      isbns: (Array.isArray(book.isbns) ? book.isbns : [])
        .filter((i) => typeof i === "string")
        .slice(0, 3)
        .map((i) => i.slice(0, 32)),
    };
  })
  .handler(async ({ data }) => {
    const key = JSON.stringify(data);
    const hit = cache.get(key);
    if (hit && hit.until > Date.now()) return hit.value;
    const current = pending.get(key);
    if (current) return current;
    if (pending.size >= 4) return { workIds: [], titles: [], verified: false };
    const task = queue
      .catch(() => undefined)
      .then(async () => {
        // Keep the public catalogue request rate bounded, including concurrent readers.
        const delay = Math.max(0, 1100 - (Date.now() - lastRequest));
        if (delay) await new Promise((r) => setTimeout(r, delay));
        lastRequest = Date.now();
        let value: WorkIdentity;
        try {
          value = await resolveWork(data);
        } catch {
          value = { workIds: [], titles: [], verified: false };
        }
        if (cache.size >= 2000) cache.delete(cache.keys().next().value!);
        cache.set(key, { value, until: Date.now() + (value.verified ? 7 * 86400000 : 60000) });
        return value;
      });
    pending.set(key, task);
    queue = task;
    try {
      return await task;
    } finally {
      pending.delete(key);
    }
  });
