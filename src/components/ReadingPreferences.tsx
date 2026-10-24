import { UiText, UiElement } from "@/lib/ui-language-context";
import { EbookDeviceFields } from "./EbookDevices";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { toast } from "@/lib/localized-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BOOK_LANGUAGES, browserBookLanguage } from "@/lib/book-language";
import { useBookLanguage } from "@/lib/use-book-language";
import { useAuth } from "@/lib/auth";
import { saveReadingPreferences } from "@/lib/reading-preferences-account";
import { supabase } from "@/integrations/supabase/client";
import {
  emptyPreferences,
  parsePreferences,
  PREFERENCES_FIELD,
  READING_GENRES,
  type ReadingPreferences,
} from "@/lib/reading-preferences";

export function ReadingPreferencesForm({
  initial,
  onSave,
  onSkip,
  busy = false,
}: {
  initial: ReadingPreferences | null;
  onSave: (value: ReadingPreferences) => void;
  onSkip?: ((value: ReadingPreferences) => void) | undefined;
  busy?: boolean;
}) {
  const [form, setForm] = useState(initial ?? emptyPreferences());
  const { locale } = useBookLanguage(form.language);
  const toggle = (field: "liked" | "avoided", id: string) => {
    const other = field === "liked" ? "avoided" : "liked";
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(id)
        ? f[field].filter((x) => x !== id)
        : f[field].length < 5
          ? [...f[field], id]
          : f[field],
      [other]: f[other].filter((x) => x !== id),
    }));
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (form.liked.length) onSave({ ...form, status: "completed" });
      }}
      className="space-y-6"
    >
      <fieldset disabled={busy} className="space-y-3">
        <legend className="mb-2 font-medium">
          <UiText text="Cosa ti piace leggere?" />
        </legend>
        <p className="text-sm text-muted-foreground">
          <UiText text="Scegli da 1 a 5 generi. Potrai cambiare idea quando vuoi." />
        </p>
        <div className="flex flex-wrap gap-2">
          {READING_GENRES.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={form.liked.includes(g.id)}
              disabled={!form.liked.includes(g.id) && form.liked.length >= 5}
              onClick={() => toggle("liked", g.id)}
              className={`rounded-full border px-3 py-2 text-sm transition disabled:opacity-40 ${form.liked.includes(g.id) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"}`}
            >
              <UiText text={g.label} />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={busy} className="space-y-3">
        <legend className="mb-2 font-medium">
          <UiText text="Cosa preferisci evitare?" />
        </legend>
        <p className="text-sm text-muted-foreground">
          <UiText text="Facoltativo, fino a 5 generi. Li escluderemo dai consigli personali, non dal catalogo." />
        </p>
        <div className="flex flex-wrap gap-2">
          {READING_GENRES.filter((g) => !form.liked.includes(g.id)).map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={form.avoided.includes(g.id)}
              disabled={!form.avoided.includes(g.id) && form.avoided.length >= 5}
              onClick={() => toggle("avoided", g.id)}
              className={`rounded-full border px-3 py-1.5 text-xs disabled:opacity-40 ${form.avoided.includes(g.id) ? "border-destructive bg-destructive/10 text-destructive" : "border-border hover:bg-accent"}`}
            >
              <UiText text={g.label} />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-2 text-sm font-medium">
        <UiText text="Quanto lunghi ti piacciono?" />
        <select
          disabled={busy}
          value={form.length}
          onChange={(e) =>
            setForm({ ...form, length: e.target.value as ReadingPreferences["length"] })
          }
          className="rounded-lg border border-border bg-background p-2 font-normal"
        >
          <option value="any">
            <UiText text="Nessuna preferenza" />
          </option>
          <option value="short">
            <UiText text="Brevi · meno di 250 pagine" />
          </option>
          <option value="medium">
            <UiText text="Medi · 250–450 pagine" />
          </option>
          <option value="long">
            <UiText text="Lunghi · oltre 450 pagine" />
          </option>
        </select>
        <span className="text-xs font-normal text-muted-foreground">
          <UiText text="Una preferenza, non un limite: potrai scoprire anche libri di altre lunghezze." />
        </span>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        <UiText text="Lingua dei libri" />
        <UiElement
          as="select"
          aria-label="Lingua dei libri"
          disabled={busy}
          value={form.language}
          onChange={(e) => setForm({ ...form, language: e.target.value })}
          className="rounded-lg border border-border bg-background p-2 font-normal"
        >
          <option value="auto">
            <UiText text="Automatica — dal browser" />
            {locale
              ? ` (${BOOK_LANGUAGES.find((l) => l.code === browserBookLanguage(locale))?.label})`
              : ""}
          </option>
          <option value="any">
            <UiText text="Tutte le lingue" />
          </option>
          {BOOK_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              <UiText text={l.label} />
            </option>
          ))}
        </UiElement>
        <span className="text-xs font-normal text-muted-foreground">
          <UiText text="Si applica a ricerca, consigli, copertine e descrizioni quando disponibili. I libri già in libreria restano visibili in qualsiasi lingua." />
        </span>
      </label>
      <EbookDeviceFields
        value={form.ebookDevices}
        onChange={(ebookDevices) => setForm({ ...form, ebookDevices })}
        disabled={busy}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={busy || !form.liked.length}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <UiText text={busy ? "Salvataggio…" : "Salva i miei gusti"} />
        </button>
        {onSkip && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onSkip?.({ ...form, status: "skipped" })}
            className="px-3 py-2 text-sm text-muted-foreground"
          >
            <UiText text="Scelgo più tardi" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        <UiText text="I tuoi gusti servono a personalizzare i consigli. Anche voti e preferiti aiuteranno a migliorarli." />
      </p>
    </form>
  );
}
function PreferencesDialog({ automatic, close }: { automatic: boolean; close: () => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const save = async (value: ReadingPreferences) => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await saveReadingPreferences(supabase, user.id, value);
      toast.success(
        value.status === "completed"
          ? "Gusti salvati. I consigli si aggiorneranno in Discover."
          : "Potrai scegliere i tuoi gusti dal profilo.",
      );
      close();
    } catch {
      toast.error("Non è stato possibile salvare i gusti. Riprova.");
    } finally {
      setBusy(false);
    }
  };
  const skip = (value?: ReadingPreferences) => {
    if (automatic) void save(value ?? emptyPreferences());
    else close();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) skip();
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <Sparkles className="h-5 w-5 text-primary" />
            <UiText text="Le tue prossime letture iniziano qui" />
          </DialogTitle>
          <DialogDescription>
            <UiText text="Basta un minuto per consigliarti libri anche se la tua libreria è ancora vuota. Puoi saltare e ritrovare tutto nel profilo." />
          </DialogDescription>
        </DialogHeader>
        <ReadingPreferencesForm
          initial={parsePreferences(user?.user_metadata[PREFERENCES_FIELD])}
          onSave={(v) => void save(v)}
          onSkip={skip}
          busy={busy}
        />
      </DialogContent>
    </Dialog>
  );
}
export function ReadingPreferences({ onboarding = false }: { onboarding?: boolean }) {
  const { user, loading } = useAuth();
  const [manual, setManual] = useState(false);
  const [closedFor, setClosedFor] = useState<string | null>(null);
  if (!user || loading) return null;
  const prefs = parsePreferences(user.user_metadata[PREFERENCES_FIELD]);
  const automatic = onboarding && !prefs && closedFor !== user.id;
  return (
    <>
      {!onboarding && (
        <section className="mb-10 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold">
                <UiText text="I miei gusti di lettura" />
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {prefs?.status === "completed"
                  ? prefs.liked
                      .map((id) => READING_GENRES.find((g) => g.id === id)?.label)
                      .join(" · ")
                  : "Scegli cosa ami leggere: non servono voti o letture precedenti."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <UiText text="Lingua dei libri:" />{" "}
                <UiText
                  text={
                    prefs?.language === "any"
                      ? "tutte le lingue"
                      : !prefs?.language || prefs.language === "auto"
                        ? "automatica, dal browser"
                        : BOOK_LANGUAGES.find((l) => l.code === prefs.language)?.label
                  }
                />
              </p>
            </div>
            <button
              onClick={() => setManual(true)}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              <UiText
                text={
                  prefs?.status === "completed" ? "Modifica i miei gusti" : "Scegli i miei gusti"
                }
              />
            </button>
          </div>
          <Link to="/discover" className="mt-3 inline-block text-sm text-primary">
            <UiText text="Vai ai consigli in Discover →" />
          </Link>
        </section>
      )}
      {(manual || automatic) && (
        <PreferencesDialog
          key={user.id}
          automatic={automatic}
          close={() => {
            setClosedFor(user.id);
            setManual(false);
          }}
        />
      )}
    </>
  );
}
