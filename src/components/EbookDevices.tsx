import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { emptyPreferences, parsePreferences, PREFERENCES_FIELD } from "@/lib/reading-preferences";
import { saveReadingPreferences } from "@/lib/reading-preferences-account";
export function EbookDeviceFields({
  value,
  onChange,
  disabled = false,
}: {
  value: string[] | undefined;
  onChange: (value: string[] | undefined) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="mb-2 font-medium">Possiedi un lettore ebook?</legend>
      <select
        aria-label="Possiedi un lettore ebook?"
        value={value === undefined ? "unknown" : value.length ? value[0] : "no"}
        onChange={(e) =>
          onChange(
            e.target.value === "unknown"
              ? undefined
              : e.target.value === "no"
                ? []
                : [e.target.value],
          )
        }
        className="w-full rounded-lg border border-border bg-background p-2 text-sm"
      >
        <option value="unknown">Non ancora specificato</option>
        <option value="no">No, non uso un lettore ebook</option>
        <option value="kindle">Sì, Kindle</option>
        <option value="kobo">Sì, Kobo</option>
        <option value="other">Sì, un altro lettore</option>
      </select>
      {!!value?.length && (
        <div
          className="flex flex-wrap gap-4"
          role="group"
          aria-label="Tipi di lettore, puoi selezionarne più di uno"
        >
          {[
            ["kindle", "Kindle"],
            ["kobo", "Kobo"],
            ["other", "Altro lettore"],
          ].map(([id, label]) => (
            <label key={id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={value.includes(id!)}
                disabled={value.includes(id!) && value.length === 1}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...value, id!]
                      : value.length > 1
                        ? value.filter((v) => v !== id)
                        : value,
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Se scegli No, nascondiamo l’avanzamento ebook nelle schede dei libri. Puoi cambiare scelta
        in Impostazioni → Dispositivi. Indicare il lettore non attiva la sincronizzazione
        automatica.
      </p>
    </fieldset>
  );
}
export function EbookDevices() {
  const { user } = useAuth();
  const prefs = parsePreferences(user?.user_metadata[PREFERENCES_FIELD]);
  const [value, setValue] = useState(prefs?.ebookDevices);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await saveReadingPreferences(supabase, user.id, {
        ...(prefs ?? emptyPreferences()),
        ebookDevices: value,
      });
      toast.success("Dispositivi aggiornati");
    } catch {
      toast.error("Salvataggio non riuscito. Riprova.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mb-8 space-y-4 rounded-xl border border-border p-5">
      <EbookDeviceFields value={value} onChange={setValue} disabled={busy} />
      <button disabled={busy} onClick={() => void save()} className="button-ink">
        {busy ? "Salvataggio…" : "Salva dispositivi"}
      </button>
    </section>
  );
}
