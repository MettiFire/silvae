import { useFragmentFeedback } from "@/lib/use-fragment-feedback";
import { FRAGMENT_LANGUAGES, resolveFragmentLanguages } from "@/lib/fragment-languages";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useUiLanguage, useTranslate } from "@/lib/use-ui-language";
import { uiChoice, type UiChoice } from "@/lib/ui-language";
import { parsePreferences, emptyPreferences, PREFERENCES_FIELD } from "@/lib/reading-preferences";
import { saveReadingPreferences } from "@/lib/reading-preferences-account";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/localized-toast";
export function SiteLanguageSettings() {
  const { user } = useAuth();
  const fragmentFeedback = useFragmentFeedback();
  const ui = useUiLanguage();
  const t = useTranslate();
  const qc = useQueryClient();
  const [draftChoice, setChoice] = useState<UiChoice | null>(null);
  const choice = draftChoice ?? ui.choice;
  const [draftFragments, setDraftFragments] = useState<string[] | null>(null);
  const fragmentLanguages =
    draftFragments ??
    resolveFragmentLanguages(
      parsePreferences(user?.user_metadata[PREFERENCES_FIELD])?.fragmentLanguages,
      ui.language,
    );
  const setFragmentLanguages = (change: (previous: string[]) => string[]) =>
    setDraftFragments(change(fragmentLanguages));
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="settings-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!user) return;
        setBusy(true);
        try {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          if (data.user?.id !== user.id) throw Error(t("Accedi di nuovo"));
          const current =
            parsePreferences(data.user.user_metadata[PREFERENCES_FIELD]) ?? emptyPreferences();
          await saveReadingPreferences(supabase, user.id, {
            ...current,
            uiLanguage: choice,
            language: choice !== ui.choice ? choice : current.language,
            fragmentLanguages,
          });
          ui.setChoice(choice);
          await qc.invalidateQueries();
          toast.success(t("Lingua aggiornata"));
        } catch {
          toast.error(t("Impossibile salvare la lingua. Riprova."));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-display text-xl">{t("Lingua del sito")}</h3>
      <label className="mt-4 block text-sm">
        {t("Interfaccia e lingua predefinita dei libri")}
        <select
          className="mt-2 w-full rounded border border-border bg-background p-2"
          value={choice}
          disabled={busy}
          onChange={(e) => setChoice(uiChoice(e.target.value))}
        >
          <option value="auto">{t("Dal browser")}</option>
          <option value="it">Italiano</option>
          <option value="en">English</option>
        </select>
      </label>
      <p className="mt-3 text-sm text-muted-foreground">
        {t(
          "Menu e pulsanti seguono questa lingua. Ricerca, copertine e descrizioni preferiscono la stessa lingua quando disponibili. Le copertine scelte da te restano personali.",
        )}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(
          "Puoi scegliere un’altra lingua per i libri nei gusti di lettura, senza cambiare l’interfaccia.",
        )}
      </p>
      <fieldset className="mt-6 border-t border-border pt-5" disabled={busy}>
        <legend className="text-sm font-medium">{t("Lingue dei frammenti")}</legend>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "Puoi sceglierne più di una: si alterneranno nei giorni, senza tradurre le citazioni.",
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-5">
          {FRAGMENT_LANGUAGES.map(({ code, label }) => (
            <label key={code} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fragmentLanguages.includes(code)}
                disabled={fragmentLanguages.length === 1 && fragmentLanguages.includes(code)}
                onChange={(e) =>
                  setFragmentLanguages((old) =>
                    e.target.checked ? [...old, code].sort() : old.filter((l) => l !== code),
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {fragmentFeedback.feedback.length > 0 && (
        <section className="mt-6 border-t border-border pt-5">
          <h3 className="text-sm font-medium">{t("Autori meno frequenti nei frammenti")}</h3>
          <ul className="mt-3 space-y-2">
            {fragmentFeedback.feedback.map(({ author }) => (
              <li key={author} className="flex items-center justify-between gap-3 text-sm">
                <span>{author}</span>
                <button
                  type="button"
                  disabled={fragmentFeedback.busy || busy}
                  className="text-primary hover:underline disabled:opacity-50"
                  onClick={async () => {
                    try {
                      await fragmentFeedback.change(author, false);
                      toast.success("Preferenza aggiornata");
                    } catch {
                      toast.error("Preferenza non salvata. Riprova.");
                    }
                  }}
                >
                  {t("Ripristina")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <button className="button-ink mt-5" disabled={busy}>
        {t(busy ? "Salvataggio…" : "Salva preferenze linguistiche")}
      </button>
    </form>
  );
}
