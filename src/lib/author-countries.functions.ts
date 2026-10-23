import { createServerFn } from "@tanstack/react-start";
import { authorCountryKey } from "./author-country-key";
import { findAuthors } from "./authors";
import { catalogueAuthorCountries, type CountryEntity } from "./author-country-resolver";

type Entity = CountryEntity;
const cache = new Map<string, { countries: string[]; until: number }>();
const pending = new Map<string, Promise<string[]>>();
let queue: Promise<unknown> = Promise.resolve();
async function json(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "Silvae/1.0 (public author bibliography)" },
  });
  if (!response.ok) throw Error("Catalogo non disponibile");
  return response.json();
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
/** Shared author identity handles aliases and duplicates, while real homonyms stay unresolved. */
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
          countries = await catalogueAuthorCountries(name, {
            search: (query) => findAuthors(query),
            author: async (id) => {
              await new Promise((r) => setTimeout(r, 1100));
              return json(`https://openlibrary.org/authors/${id}.json`);
            },
            entity,
          });
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
