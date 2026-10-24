export type UiLanguage = "it" | "en";
export type UiChoice = UiLanguage | "auto";
export const UI_LANGUAGE_KEY = "silvae:ui-language:v1";
export function uiChoice(value: unknown): UiChoice {
  return value === "it" || value === "en" ? value : "auto";
}
export function resolveUiLanguage(choice: unknown, browser: string): UiLanguage {
  return choice === "it" || choice === "en"
    ? choice
    : browser.toLowerCase().startsWith("it")
      ? "it"
      : "en";
}
