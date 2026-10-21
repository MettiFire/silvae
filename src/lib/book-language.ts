export const BOOK_LANGUAGES = [
  { code: "it", label: "Italiano", ol: "ita" },
  { code: "en", label: "Inglese", ol: "eng" },
  { code: "fr", label: "Francese", ol: "fre" },
  { code: "de", label: "Tedesco", ol: "ger" },
  { code: "es", label: "Spagnolo", ol: "spa" },
  { code: "pt", label: "Portoghese", ol: "por" },
  { code: "nl", label: "Olandese", ol: "dut" },
  { code: "pl", label: "Polacco", ol: "pol" },
  { code: "ru", label: "Russo", ol: "rus" },
  { code: "uk", label: "Ucraino", ol: "ukr" },
  { code: "ja", label: "Giapponese", ol: "jpn" },
  { code: "zh", label: "Cinese", ol: "chi" },
  { code: "ar", label: "Arabo", ol: "ara" },
  { code: "ko", label: "Coreano", ol: "kor" },
  { code: "sv", label: "Svedese", ol: "swe" },
  { code: "no", label: "Norvegese", ol: "nor" },
  { code: "da", label: "Danese", ol: "dan" },
  { code: "fi", label: "Finlandese", ol: "fin" },
  { code: "tr", label: "Turco", ol: "tur" },
  { code: "el", label: "Greco", ol: "gre" },
  { code: "cs", label: "Ceco", ol: "cze" },
  { code: "ro", label: "Rumeno", ol: "rum" },
  { code: "hu", label: "Ungherese", ol: "hun" },
] as const;
export function browserBookLanguage(locale: string): string {
  const code = locale.toLowerCase().split(/[-_]/)[0];
  return BOOK_LANGUAGES.some((l) => l.code === code) ? code! : "en";
}
export function parseBookLanguage(value: unknown): string {
  return value === "any" || BOOK_LANGUAGES.some((l) => l.code === value)
    ? (value as string)
    : "auto";
}
export function resolveBookLanguage(preference: unknown, locale: string): string | undefined {
  const choice = parseBookLanguage(preference);
  return choice === "any" ? undefined : choice === "auto" ? browserBookLanguage(locale) : choice;
}
export function applyBookLanguage(
  params: URLSearchParams,
  provider: "google" | "openlibrary",
  language?: string,
) {
  const selected = BOOK_LANGUAGES.find((l) => l.code === language);
  if (!selected) return;
  if (provider === "google") params.set("langRestrict", selected.code);
  else {
    params.set("lang", selected.code);
    params.set("q", [params.get("q"), `language:${selected.ol}`].filter(Boolean).join(" "));
  }
}
