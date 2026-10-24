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
  const ui = useUiLanguage();
  const t = useTranslate();
  const qc = useQueryClient();
  const [choice, setChoice] = useState<UiChoice>(ui.choice);
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
            language: choice,
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
      <h2 className="font-display text-2xl">{t("Lingua del sito")}</h2>
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
      <button className="button-ink mt-5" disabled={busy}>
        {t(busy ? "Salvataggio…" : "Salva lingua")}
      </button>
    </form>
  );
}
