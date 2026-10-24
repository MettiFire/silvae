import { createContext, useContext } from "react";
import type { UiChoice, UiLanguage } from "./ui-language";
import { translateUi } from "./ui-translation";
export const UiContext = createContext({
  language: "it" as UiLanguage,
  choice: "auto" as UiChoice,
  ready: false,
  locale: "it-IT",
  setChoice: (_value: UiChoice) => {},
});

export const useUiLanguage = () => useContext(UiContext);
export function useTranslate() {
  const { language } = useUiLanguage();
  return (text: string) => translateUi(text, language);
}
