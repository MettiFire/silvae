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
  return selected.length ? selected : [uiLanguage === "en" ? "en" : "it"];
}
