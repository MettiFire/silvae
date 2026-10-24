import { UI_EN } from "../data/ui-en.ts";
import type { UiLanguage } from "./ui-language.ts";
export function translateUi(text: string, language: UiLanguage): string {
  if (language !== "en") return text;
  const key = text.replace(/\s+/g, " ").trim();
  const translated = Object.hasOwn(UI_EN, key) ? UI_EN[key] : undefined;
  if (translated !== undefined)
    return `${/^\s/.test(text) ? " " : ""}${translated}${/\s$/.test(text) ? " " : ""}`;
  if (key.includes(" · "))
    return key
      .split(" · ")
      .map((part) => translateUi(part, language))
      .join(" · ");
  const genrePrefix = key.match(/^(Esplora|Ti piace|Un genere in comune): (.+)$/);
  if (genrePrefix)
    return `${genrePrefix[1] === "Esplora" ? "Explore" : genrePrefix[1] === "Ti piace" ? "You enjoy" : "A shared genre"}: ${translateUi(genrePrefix[2]!, language)}`;
  const authorPrefix = key.match(
    /^(Un autore che hai apprezzato|Dagli autori che vuoi leggere|Un autore nella tua libreria): (.+)$/,
  );
  if (authorPrefix)
    return `${authorPrefix[1] === "Un autore che hai apprezzato" ? "An author you enjoyed" : authorPrefix[1] === "Dagli autori che vuoi leggere" ? "From authors you want to read" : "An author in your library"}: ${authorPrefix[2]}`;
  const patterns: [RegExp, string][] = [
    [/^(\d+) volumi \(edizione originale\)$/, "$1 volumes (original edition)"],
    [/^(\d+) pagine$/, "$1 pages"],
    [/^Un genere nella tua libreria: (.*)$/, "A genre in your library: $1"],
    [/^Calendario (\d{4})$/, "Calendar $1"],
    [/^(\d+) libri completati quest'anno$/, "$1 books finished this year"],
    [/^(\d+) libri raccolti, una storia alla volta$/, "$1 books collected, one story at a time"],
    [/^Libri letti per mese · (\d{4})$/, "Books read by month · $1"],
    [/^(\d+) libri valutati$/, "$1 rated books"],
    [/^(\d+) giorni$/, "$1 days"],
    [/^(\d+) iniziati$/, "$1 started"],
    [
      /^(\d+) libri letti senza una data valida non sono attribuiti a un anno\.$/,
      "$1 read books without a valid date are not assigned to a year.",
    ],
    [/^(\d+(?:\.\d+)?) pag\/g$/, "$1 pages/day"],
    [/^(\d+) pag$/, "$1 pages"],
    [/^Volume (\d+)(, letto)?$/, "Volume $1$2"],
    [/^Copertina di (.*)$/, "Cover of $1"],
    [/^Copertina del volume (\d+)$/, "Cover of volume $1"],
    [/^Prossimo volume da leggere: (\d+)\.$/, "Next volume to read: $1."],
    [
      /^Il catalogo indica (\d+) volumi per l’edizione originale\.$/,
      "The catalogue lists $1 volumes in the original edition.",
    ],
    [/^Valutazione (.*) su 5$/, "Rating $1 out of 5"],
    [/^Modifica valutazione: (.*) su 5$/, "Edit rating: $1 out of 5"],
  ];
  for (const [pattern, replacement] of patterns)
    if (pattern.test(key)) return key.replace(pattern, replacement).replace(", letto", ", read");
  return text;
}

const originalTitles = new Map(
  Object.entries(UI_EN)
    .filter(([it]) => it.includes("Silvae"))
    .map(([it, en]) => [en, it]),
);
export function translateUiTitle(title: string, language: UiLanguage) {
  return translateUi(originalTitles.get(title) ?? title, language);
}
