import { authorCountryKey } from "./author-country-key.ts";
/** Reviewed authority links for catalogue collisions; countries still come from citizenship data.
 * Haruki Murakami: https://openlibrary.org/authors/OL382524A
 * https://www.wikidata.org/wiki/Q134798 (born 12 January 1949).
 * Other Open Library entries incorrectly use 1937; never merge conflicting biographies globally.
 */
const verified = [
  {
    names: ["Haruki Murakami", "Murakami Haruki", "村上春樹", "村上 春樹", "Харуки Мураками"],
    openLibrary: "OL382524A",
    wikidata: "Q134798",
  },
];
export function verifiedAuthorIdentity(name: string) {
  const key = authorCountryKey(name);
  return verified.find((entry) => entry.names.some((alias) => authorCountryKey(alias) === key));
}
