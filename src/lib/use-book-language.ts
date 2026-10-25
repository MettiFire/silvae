import { useUiLanguage } from "./use-ui-language";
import { resolveBookLanguage } from "./book-language";
export function useBookLanguage(preference: unknown) {
  const ui = useUiLanguage();
  return {
    language: resolveBookLanguage(
      preference === "auto" || preference == null ? ui.language : preference,
      ui.locale,
    ),
    locale: ui.locale,
    ready: ui.ready,
  };
}
