import { useUiLanguage } from "./use-ui-language";
import { useEffect, useState } from "react";
import { resolveBookLanguage } from "./book-language";
export function useBookLanguage(preference: unknown) {
  const ui = useUiLanguage();
  const [locale, setLocale] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setLocale(navigator.language || "en");
    update();
    window.addEventListener("languagechange", update);
    return () => window.removeEventListener("languagechange", update);
  }, []);
  return {
    language: resolveBookLanguage(
      preference === "auto" || preference == null ? ui.language : preference,
      locale ?? "en",
    ),
    locale,
    ready: locale !== null,
  };
}
