import { translateUiTitle } from "./ui-translation";
import { Link, useRouterState } from "@tanstack/react-router";
import { createElement, useEffect, useState, type ReactNode, type JSX } from "react";
import { useAuth } from "@/lib/auth";
import { parsePreferences, PREFERENCES_FIELD } from "@/lib/reading-preferences";
import { UiContext, useUiLanguage, useTranslate } from "./use-ui-language";
import {
  uiChoice,
  resolveUiLanguage,
  UI_LANGUAGE_KEY,
  type UiChoice,
  type UiLanguage,
} from "./ui-language.ts";
export function UiLanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = useRouterState({
    select: (state) => `${state.location.pathname}:${state.status}`,
  });
  const prefs = parsePreferences(user?.user_metadata[PREFERENCES_FIELD]);
  const [local, setLocal] = useState<UiChoice>("auto");
  const [locale, setLocale] = useState("it-IT");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const update = () => {
      setLocale(navigator.language || "en");
      try {
        setLocal(uiChoice(localStorage.getItem(UI_LANGUAGE_KEY)));
      } catch {
        /* optional */
      }
      setReady(true);
    };
    update();
    window.addEventListener("languagechange", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("languagechange", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  const choice = prefs?.uiLanguage ?? local;
  const language = ready ? resolveUiLanguage(choice, locale) : "it";
  useEffect(() => {
    document.documentElement.lang = language;
    const frame = requestAnimationFrame(() => {
      document.title = translateUiTitle(document.title, language);
    });
    return () => cancelAnimationFrame(frame);
  }, [language, pathname]);
  const setChoice = (value: UiChoice) => {
    setLocal(value);
    try {
      localStorage.setItem(UI_LANGUAGE_KEY, value);
    } catch {
      /* optional */
    }
  };
  return (
    <UiContext.Provider value={{ language, choice, ready, locale, setChoice }}>
      {children}
    </UiContext.Provider>
  );
}
export function UiElement<K extends keyof JSX.IntrinsicElements>({
  as,
  ...props
}: { as: K } & JSX.IntrinsicElements[K]) {
  const t = useTranslate();
  const next: Record<string, unknown> = { ...props };
  for (const key of ["placeholder", "title", "aria-label", "alt"])
    if (typeof next[key] === "string") next[key] = t(next[key]);
  return createElement(as, next);
}
export function UiText({ text }: { text: ReactNode }) {
  const t = useTranslate();
  return typeof text === "string" ? t(text) : text;
}
export function UiLanguageSwitch() {
  const { choice, setChoice } = useUiLanguage();
  const t = useTranslate();
  const { user } = useAuth();
  if (user)
    return (
      <Link
        to="/settings"
        search={{ section: "language" }}
        className="text-xs text-muted-foreground"
      >
        {t("Lingua del sito")}
      </Link>
    );
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      {t("Lingua")}
      <select
        aria-label={t("Lingua del sito")}
        value={choice}
        onChange={(e) => setChoice(uiChoice(e.target.value))}
        className="rounded border border-border bg-background py-1 pl-2 pr-7"
      >
        <option value="auto">{t("Dal browser")}</option>
        <option value="it">Italiano</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}

export function UiDate({
  value,
  options,
  withTime = false,
}: {
  value: Date | string | number;
  options?: Intl.DateTimeFormatOptions;
  withTime?: boolean;
}) {
  const { language } = useUiLanguage();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return withTime
    ? date.toLocaleString(language === "en" ? "en-GB" : "it-IT", options)
    : date.toLocaleDateString(language === "en" ? "en-GB" : "it-IT", options);
}
