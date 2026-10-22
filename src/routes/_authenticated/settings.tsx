import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { DeleteAccount } from "@/components/DeleteAccount";
import { ReaderConnections } from "@/components/ReaderConnections";
import { ReadingPreferences } from "@/components/ReadingPreferences";
import { BookGridSizeControl } from "@/components/BookGridSizeControl";
import { useAuth, type Profile } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { validateProfile } from "@/lib/profile-data";
import { requireFragmentUser } from "@/lib/fragments";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
const SECTIONS = {
  profile: "Profilo pubblico",
  preferences: "Gusti di lettura",
  appearance: "Aspetto",
  devices: "Dispositivi",
  data: "Dati e account",
} as const;
type Section = keyof typeof SECTIONS;
export const Route = createFileRoute("/_authenticated/settings")({
  validateSearch: (search: Record<string, unknown>): { section?: Section } => ({
    section:
      typeof search["section"] === "string" && Object.hasOwn(SECTIONS, search["section"])
        ? (search["section"] as Section)
        : "profile",
  }),
  head: () => ({ meta: [{ title: "Impostazioni — Paginae" }] }),
  component: SettingsPage,
});
function SettingsPage() {
  const { section = "profile" } = Route.useSearch();
  const { profile, profileLoading, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  return (
    <AppShell>
      <PageHeader
        title="Impostazioni"
        subtitle="Il tuo spazio personale. Questi controlli sono visibili solo a te."
        action={
          <Link className="button-outline" to="/profile">
            Torna al profilo ↗
          </Link>
        }
      />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Impostazioni del profilo">
          {(Object.keys(SECTIONS) as Section[]).map((key) => (
            <Link
              key={key}
              to="/settings"
              search={{ section: key }}
              aria-current={section === key ? "page" : undefined}
            >
              {SECTIONS[key]}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">
          {section === "profile" &&
            (profile ? (
              <EditPublicProfile key={profile.id} profile={profile} />
            ) : profileLoading ? (
              <p role="status">Caricamento profilo…</p>
            ) : (
              <p role="alert" className="editorial-empty">
                Il profilo non si è caricato.{" "}
                <button className="underline" onClick={() => void refreshProfile()}>
                  Riprova
                </button>
              </p>
            ))}
          {section === "preferences" && (
            <>
              <h2 className="mb-4 font-display text-2xl">Una biblioteca a tua misura</h2>
              <ReadingPreferences />
            </>
          )}
          {section === "appearance" && (
            <div className="settings-form">
              <fieldset>
                <legend>Interfaccia</legend>
                <label className="flex items-center justify-between gap-4 text-sm">
                  Tema dell’interfaccia
                  <select
                    aria-label="Tema dell’interfaccia"
                    className="rounded border bg-background p-2"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as typeof theme)}
                  >
                    <option value="system">Segui il dispositivo</option>
                    <option value="light">Carta chiara</option>
                    <option value="dark">Inchiostro scuro</option>
                  </select>
                </label>
                <div className="mt-6">
                  <BookGridSizeControl />
                </div>
              </fieldset>
            </div>
          )}
          {section === "devices" && (
            <>
              <h2 className="mb-4 font-display text-2xl">I tuoi dispositivi</h2>
              <ReaderConnections />
            </>
          )}
          {section === "data" && (
            <section className="settings-form border-t pt-6">
              <h2 className="font-display text-2xl">La tua libreria, senza ricominciare</h2>
              <p className="my-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Importa libri da Goodreads, Bookshelf o altri CSV. Puoi controllare l’anteprima
                prima di aggiungerli. Anche il ripristino della libreria si trova nella pagina di
                importazione.
              </p>
              <Link to="/import" className="button-ink">
                Importa e gestisci la libreria →
              </Link>
              <h3 className="mt-8 font-display text-xl">Sottolineature e note</h3>
              <p className="my-3 text-sm text-muted-foreground">
                I tuoi frammenti rimangono privati e si gestiscono nell’archivio dedicato.
              </p>
              <Link to="/fragments" className="button-outline">
                Apri Frammenti
              </Link>
              <DeleteAccount />
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
export function EditPublicProfile({ profile }: { profile: Profile }) {
  const { user, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    username: profile.username,
    display_name: profile.display_name ?? "",
    bio: profile.bio ?? "",
    avatar_url: profile.avatar_url ?? "",
    banner_url: profile.banner_url ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user || busy) return;
    setBusy(true);
    setError("");
    try {
      await requireFragmentUser(supabase, user.id);
      const values = validateProfile(form);
      const { error } = await supabase
        .from("profiles")
        .update(values)
        .eq("id", user.id)
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") throw Error("Questo username è già usato. Scegline un altro.");
        throw error;
      }
      await refreshProfile();
      await qc.invalidateQueries({ queryKey: ["public-profile"] });
      toast.success("Profilo aggiornato");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="settings-form">
      <fieldset>
        <legend>Come ti vedono gli altri</legend>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          Nome, biografia, immagini, letture e autori seguiti compongono il tuo profilo pubblico. Le
          liste private e i frammenti restano personali.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            ["username", "Username"],
            ["display_name", "Nome visualizzato"],
            ["avatar_url", "Indirizzo HTTPS della foto"],
            ["banner_url", "Indirizzo HTTPS dell’immagine di copertina"],
          ].map(([key, label]) => (
            <label key={key} className="grid gap-2 text-xs text-muted-foreground">
              {label}
              <input
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key!]: e.target.value })}
                disabled={busy}
                required={key === "username"}
                maxLength={key === "username" ? 64 : key === "display_name" ? 80 : 2000}
                className="h-11 rounded border bg-background px-3 text-sm text-foreground"
              />
            </label>
          ))}
          <label className="grid gap-2 text-xs text-muted-foreground sm:col-span-2">
            Qualcosa di te
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              disabled={busy}
              maxLength={1000}
              rows={4}
              placeholder="Le storie che cerchi, quelle che ti restano."
              className="rounded border bg-background p-3 text-sm text-foreground"
            />
          </label>
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <button className="button-ink" disabled={busy}>
        {busy ? "Salvataggio…" : "Salva profilo pubblico"}
      </button>
    </form>
  );
}
