export const FRAGMENT_LANGUAGES = [
  { code: "it", label: "Italiano" },
  { code: "en", label: "English" },
] as const;
export function parseFragmentLanguages(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((v): v is string => v === "it" || v === "en"))].sort()
    : [];
}
export function resolveFragmentLanguages(value: unknown, uiLanguage: string) {
  const selected = parseFragmentLanguages(value);
  const languages = selected.length ? selected : uiLanguage === "en" ? ["en"] : ["it", "en"];
  // Italian comes first in the six-slot cycle: IT/EN/IT, then EN/IT/EN.
  return uiLanguage === "it" && languages.length > 1 ? ["it", "en"] : languages;
}
