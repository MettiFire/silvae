import { UiText, UiElement } from "@/lib/ui-language-context";
import { useState, type ReactNode } from "react";
import { toast } from "@/lib/localized-toast";
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
      <legend className="mb-2 font-medium">
        <UiText text="Possiedi un lettore ebook?" />
      </legend>
      <UiElement
        as="select"
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
        <option value="unknown">
          <UiText text="Non ancora specificato" />
        </option>
        <option value="no">
          <UiText text="No, non uso un lettore ebook" />
        </option>
        <option value="kindle">
          <UiText text="Sì, Kindle" />
        </option>
        <option value="kobo">
          <UiText text="Sì, Kobo" />
        </option>
        <option value="other">
          <UiText text="Sì, un altro lettore" />
        </option>
      </UiElement>
      {!!value?.length && (
        <UiElement
          as="div"
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
              <UiText text={label} />
            </label>
          ))}
        </UiElement>
      )}
      <p className="text-xs text-muted-foreground">
        <UiText text="Se scegli No, nascondiamo l’avanzamento ebook e i collegamenti ai dispositivi. Puoi cambiare scelta in Impostazioni → Dispositivi. Indicare il lettore non attiva la sincronizzazione automatica." />
      </p>
    </fieldset>
  );
}
export function EbookDevices({ children }: { children?: ReactNode }) {
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
    <>
      <section className="mb-8 space-y-4 rounded-xl border border-border p-5">
        <EbookDeviceFields value={value} onChange={setValue} disabled={busy} />
        <button disabled={busy} onClick={() => void save()} className="button-ink">
          <UiText text={busy ? "Salvataggio…" : "Salva dispositivi"} />
        </button>
      </section>
      {value?.length !== 0 && children}
    </>
  );
}
