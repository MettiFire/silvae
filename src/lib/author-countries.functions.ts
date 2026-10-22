import { createServerFn } from "@tanstack/react-start";
import { authorCountryKey } from "./author-country-key";

type Entity = {
  claims?: Record<string, { rank?: string; mainsnak?: { datavalue?: { value?: unknown } } }[]>;
};
const cache = new Map<string, { countries: string[]; until: number }>();
const pending = new Map<string, Promise<string[]>>();
let queue: Promise<unknown> = Promise.resolve();
async function json(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "Paginae/1.0 (public author bibliography)" },
  });
  if (!response.ok) throw Error("Catalogo non disponibile");
  return response.json();
}
function values(entity: Entity, property: string): unknown[] {
  return (entity.claims?.[property] ?? [])
    .filter((c) => c.rank !== "deprecated")
    .map((c) => c.mainsnak?.datavalue?.value);
}
const entities = new Map<string, { value: Entity; until: number }>();
async function entity(id: string): Promise<Entity> {
  const hit = entities.get(id);
  if (hit && hit.until > Date.now()) return hit.value;
  const data = await json(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`);
  const value: Entity = data.entities?.[id] ?? {};
  if (entities.size >= 2000) entities.delete(entities.keys().next().value!);
  entities.set(id, { value, until: Date.now() + 7 * 86400000 });
  return value;
}
/** Only unique exact catalogue matches; never infer nationality from language or names. */
export const resolveAuthorCountries = createServerFn({ method: "POST" })
  .validator((name: string) => {
    if (typeof name !== "string" || !name.trim() || name.length > 160)
      throw Error("Autore non valido");
    return name.trim();
  })
  .handler(async ({ data: name }) => {
    const key = authorCountryKey(name);
    const hit = cache.get(key);
    if (hit && hit.until > Date.now()) return hit.countries;
    if (pending.has(key)) return pending.get(key)!;
    const task = queue
      .catch(() => undefined)
      .then(async () => {
        let countries: string[] = [];
        try {
          const search = await json(
            `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(name)}&limit=20`,
          );
          const matches = (search.docs ?? []).filter(
            (a: { name?: string; key?: string }) =>
              authorCountryKey(a.name ?? "") === key && /^OL\d+A$/.test(a.key ?? ""),
          );
          if (matches.length === 1) {
            await new Promise((r) => setTimeout(r, 1100));
            const author = await json(`https://openlibrary.org/authors/${matches[0].key}.json`);
            const id = author.remote_ids?.wikidata;
            if (typeof id === "string" && /^Q\d+$/.test(id)) {
              const ids = values(await entity(id), "P27").flatMap((v) =>
                typeof v === "object" && v && "id" in v && /^Q\d+$/.test(String(v.id))
                  ? [String(v.id)]
                  : [],
              );
              for (const countryId of [...new Set(ids)].slice(0, 8)) {
                countries.push(
                  ...values(await entity(countryId), "P297").filter(
                    (v): v is string => typeof v === "string" && /^[A-Z]{2}$/.test(v),
                  ),
                );
              }
            }
          }
        } catch {
          /* Unknown remains unknown; manual confirmation is available. */
        }
        countries = [...new Set(countries)].sort();
        if (cache.size >= 2000) cache.delete(cache.keys().next().value!);
        cache.set(key, {
          countries,
          until: Date.now() + (countries.length ? 7 * 86400000 : 5 * 60000),
        });
        await new Promise((r) => setTimeout(r, 1100));
        return countries;
      });
    pending.set(key, task);
    queue = task;
    try {
      return await task;
    } finally {
      pending.delete(key);
    }
  });
