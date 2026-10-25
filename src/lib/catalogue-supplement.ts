import type { Book } from "./books";
import { textKey } from "./work-identity.ts";
export const SUPPLEMENT_AUTHOR = {
  id: "catalogue:il-trono-del-muori",
  name: "Il Trono del Muori",
  birth: null,
  topWork: "Gli eroi del Muori",
  workCount: 2,
  alternateNames: ["Il Trono del Muori", "Trono del Muori", "Cesyro", "Cesiro"],
};
const cover = (id: string) =>
  `https://books.google.com/books/content?id=${id}&printsec=frontcover&img=1&zoom=1`;
/** Verified catalogue gaps. Google identifiers/covers come from its ISBN Dynamic Links lookup.
 * Bibliographic sources and verification details: docs/catalogue-gaps-2026-10-25.md.
 */
export const CATALOGUE_SUPPLEMENT: Book[] = [
  {
    id: "ol:OL19738516W",
    title: "Portugal",
    authors: ["Cyril Pedrosa"],
    cover_url: cover("hLuMtgAACAAJ"),
    published_year: 2011,
    page_count: 264,
    categories: ["Graphic novels"],
    description:
      "Una graphic novel che segue tre generazioni di una famiglia portoghese e la ricerca delle proprie radici.",
    isbns: ["9788865430828"],
    content_language: "it",
  },
  {
    id: "RHvx0AEACAAJ",
    title: "Gli eroi del Muori. Riassunto accuratissimo della mitologia greca",
    authors: [SUPPLEMENT_AUTHOR.name],
    cover_url: cover("RHvx0AEACAAJ"),
    published_year: 2024,
    page_count: null,
    categories: ["Mitologia", "Umorismo"],
    description:
      "Una rilettura umoristica dei miti greci firmata Il Trono del Muori, pubblicata da Mondadori.",
    isbns: ["9788804788591"],
    content_language: "it",
  },
  {
    id: "TYTe0QEACAAJ",
    title:
      "La Muorissea. Riassunto accuratissimo delle avventure di Odisseo tra luci e ombre (tante, troppe)",
    authors: [SUPPLEMENT_AUTHOR.name],
    cover_url: cover("TYTe0QEACAAJ"),
    published_year: 2026,
    page_count: null,
    categories: ["Mitologia", "Umorismo"],
    description:
      "Il viaggio di Odisseo raccontato con l’umorismo del Trono del Muori e le illustrazioni di Veronica Ciancarini.",
    isbns: ["9788804808626"],
    content_language: "it",
  },
];
export function validAuthorId(value: string) {
  return /^OL\d+A$/.test(value) || value === SUPPLEMENT_AUTHOR.id;
}
export function supplementSearch(query: string) {
  const clean = query.replace(/(?:intitle|inauthor|isbn):/g, " ").replace(/["']/g, " ");
  const words = textKey(clean).split(" ").filter(Boolean);
  if (!words.length) return [];
  return CATALOGUE_SUPPLEMENT.filter((book) => {
    const aliases = book.authors.includes(SUPPLEMENT_AUTHOR.name)
      ? SUPPLEMENT_AUTHOR.alternateNames
      : [];
    const fields = textKey(
      [book.title, ...book.authors, ...aliases, ...(book.isbns ?? [])].join(" "),
    ).split(" ");
    return words.every((word, i) =>
      fields.some((part) => (i === words.length - 1 ? part.startsWith(word) : part === word)),
    );
  });
}
