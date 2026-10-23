import { defaultAuthor, type AuthorCandidate } from "./authors.ts";
import { READING_COUNTRY_CODES } from "./reading-challenges.ts";
export type CountryEntity = {
  claims?: Record<string, { rank?: string; mainsnak?: { datavalue?: { value?: unknown } } }[]>;
};
function values(entity: CountryEntity, property: string): unknown[] {
  return (entity.claims?.[property] ?? [])
    .filter((c) => c.rank !== "deprecated")
    .map((c) => c.mainsnak?.datavalue?.value);
}
/** Documented citizenship only; neither translated editions nor original languages identify a country. */
export async function catalogueAuthorCountries(
  name: string,
  sources: {
    search: (name: string) => Promise<AuthorCandidate[]>;
    author: (id: string) => Promise<{ remote_ids?: { wikidata?: string } }>;
    entity: (id: string) => Promise<CountryEntity>;
  },
): Promise<string[]> {
  const id = defaultAuthor(await sources.search(name), name);
  if (!id) return [];
  const author = await sources.author(id);
  const wikidata = author.remote_ids?.wikidata;
  if (!wikidata || !/^Q\d+$/.test(wikidata)) return [];
  const countries = values(await sources.entity(wikidata), "P27").flatMap((v) =>
    typeof v === "object" && v && "id" in v && /^Q\d+$/.test(String(v.id)) ? [String(v.id)] : [],
  );
  const codes: string[] = [];
  for (const country of [...new Set(countries)].slice(0, 8)) {
    codes.push(
      ...values(await sources.entity(country), "P297").filter(
        (v): v is string => typeof v === "string" && READING_COUNTRY_CODES.includes(v),
      ),
    );
  }
  return [...new Set(codes)].sort();
}
