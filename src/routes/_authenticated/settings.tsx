import { UiText, UiElement } from "@/lib/ui-language-context";
import { SiteLanguageSettings } from "@/components/SiteLanguageSettings";
import { EbookDevices } from "@/components/EbookDevices";
import { pageSeo } from "@/lib/site-seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "@/components/AppShell";
import { DeleteAccount } from "@/components/DeleteAccount";
import { ReaderConnections } from "@/components/ReaderConnections";
import { ReadingPreferences } from "@/components/ReadingPreferences";
import { ProfileImageUpload } from "@/components/ProfileImageUpload";
import { BookGridSizeControl } from "@/components/BookGridSizeControl";
import { useAuth, type Profile } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { isGeneratedProfile } from "@/lib/profile-model";
import { validateProfile } from "@/lib/profile-data";
import { requireFragmentUser } from "@/lib/fragments";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/localized-toast";
const SECTIONS = {
  profile: "Profilo pubblico",
  preferences: "Gusti di lettura",
  appearance: "Lingua e aspetto",
  devices: "Dispositivi",
  data: "Dati e account",
} as const;
type Section = keyof typeof SECTIONS;
export const Route = createFileRoute("/_authenticated/settings")({
  validateSearch: (search: Record<string, unknown>): { section?: Section } => ({
    section:
      search["section"] === "language"
        ? "appearance"
        : typeof search["section"] === "string" && Object.hasOwn(SECTIONS, search["section"])
          ? (search["section"] as Section)
          : "profile",
  }),
  head: () =>
    pageSeo(
      "Impostazioni del profilo — Silvae",
      "Gestisci profilo, gusti di lettura, tema, lingua, dispositivi e dati del tuo account Silvae.",
      undefined,
      true,
    ),
  component: SettingsPage,
});
function SettingsPage() {
  const { section = "profile" } = Route.useSearch();
  const { user, profile, profileLoading, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  return (
    <AppShell>
      <PageHeader
        title="Impostazioni"
        subtitle="Il tuo spazio personale. Questi controlli sono visibili solo a te."
        action={
          <Link className="button-outline" to="/profile">
            <UiText text="Torna al profilo ↗" />
          </Link>
        }
      />
      <div className="settings-layout">
        <UiElement as="nav" className="settings-nav" aria-label="Impostazioni del profilo">
          {(Object.keys(SECTIONS) as Section[]).map((key) => (
            <Link
              key={key}
              to="/settings"
              search={{ section: key }}
              aria-current={section === key ? "page" : undefined}
            >
              <UiText text={SECTIONS[key]} />
            </Link>
          ))}
        </UiElement>
        <div className="min-w-0">
          {section === "profile" &&
            (profile ? (
              <EditPublicProfile key={profile.id} profile={profile} />
            ) : profileLoading ? (
              <p role="status">
                <UiText text="Caricamento profilo…" />
              </p>
            ) : (
              <p role="alert" className="editorial-empty">
                <UiText text="Il profilo non si è caricato." />{" "}
                <button className="underline" onClick={() => void refreshProfile()}>
                  <UiText text="Riprova" />
                </button>
              </p>
            ))}
          {section === "preferences" && (
            <>
              <h2 className="mb-4 font-display text-2xl">
                <UiText text="Una biblioteca a tua misura" />
              </h2>
              <ReadingPreferences />
            </>
          )}
          {section === "appearance" && (
            <section className="space-y-8">
              <h2 className="font-display text-2xl">
                <UiText text="Lingua e aspetto" />
              </h2>
              <div className="settings-form">
                <fieldset>
                  <legend>
                    <UiText text="Aspetto" />
                  </legend>
                  <label className="flex items-center justify-between gap-4 text-sm">
                    <UiText text="Tema dell’interfaccia" />
                    <UiElement
                      as="select"
                      aria-label="Tema dell’interfaccia"
                      className="rounded border bg-background p-2"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as typeof theme)}
                    >
                      <option value="system">
                        <UiText text="Segui il dispositivo" />
                      </option>
                      <option value="light">
                        <UiText text="Carta chiara" />
                      </option>
                      <option value="dark">
                        <UiText text="Inchiostro scuro" />
                      </option>
                    </UiElement>
                  </label>
                  <div className="mt-6">
                    <BookGridSizeControl />
                  </div>
                </fieldset>
              </div>
              <SiteLanguageSettings key={user?.id} />
            </section>
          )}
          {section === "devices" && (
            <>
              <h2 className="mb-4 font-display text-2xl">
                <UiText text="I tuoi dispositivi" />
              </h2>
              <EbookDevices key={user?.id} />
              <ReaderConnections />
            </>
          )}
          {section === "data" && (
            <section className="settings-form border-t pt-6">
              <h2 className="font-display text-2xl">
                <UiText text="La tua libreria, senza ricominciare" />
              </h2>
              <p className="my-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                <UiText text="Importa libri da Goodreads, Bookshelf o altri CSV. Puoi controllare l’anteprima prima di aggiungerli. Anche il ripristino della libreria si trova nella pagina di importazione." />
              </p>
              <Link to="/import" className="button-ink">
                <UiText text="Importa e gestisci la libreria →" />
              </Link>
              <h3 className="mt-8 font-display text-xl">
                <UiText text="Sottolineature e note" />
              </h3>
              <p className="my-3 text-sm text-muted-foreground">
                <UiText text="Gestisci citazioni e note nell’archivio Frammenti, dove puoi scegliere con chi condividerle." />
              </p>
              <Link to="/fragments" className="button-outline">
                <UiText text="Apri Frammenti" />
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
    username: isGeneratedProfile(profile) ? "" : profile.username,
    display_name: profile.display_name ?? "",
    bio: profile.bio ?? "",
    avatar_url: profile.avatar_url ?? "",
    banner_url: profile.banner_url ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user || busy || uploading) return;
    setBusy(true);
    setError("");
    try {
      await requireFragmentUser(supabase, user.id);
      const values = validateProfile({
        ...form,
        username: form.username.trim() || profile.username,
      });
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
      const bucket = supabase.storage.from("profile-images");
      const prefix = bucket.getPublicUrl("").data.publicUrl;
      const oldImages = [profile.avatar_url, profile.banner_url]
        .filter(
          (url): url is string =>
            !!url &&
            url.startsWith(prefix) &&
            url !== values.avatar_url &&
            url !== values.banner_url,
        )
        .flatMap((url) => {
          try {
            const path = decodeURIComponent(url.slice(prefix.length).split("?")[0]!);
            return path.startsWith(`${user.id}/`) && !path.includes("..") ? [path] : [];
          } catch {
            return [];
          }
        });
      if (oldImages.length) {
        const { error: cleanupError } = await bucket.remove([...new Set(oldImages)]);
        if (cleanupError)
          toast.warning(
            "Profilo aggiornato, ma non è stato possibile rimuovere le vecchie immagini dal servizio.",
          );
      }
      await refreshProfile();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["public-profile"] }),
        qc.invalidateQueries({ queryKey: ["people"] }),
        qc.invalidateQueries({ queryKey: ["profile-people"] }),
        qc.invalidateQueries({ queryKey: ["activities"] }),
        qc.invalidateQueries({ queryKey: ["book-clubs"] }),
      ]);
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
        <legend>
          <UiText text="Come ti vedono gli altri" />
        </legend>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          <UiText text="Nome, biografia, immagini, letture e autori seguiti compongono il tuo profilo pubblico. Le liste private e i frammenti restano personali." />
        </p>
        <label className="mb-6 grid gap-2 text-xs text-muted-foreground">
          <UiText text="Email dell’account · privata" />
          <input
            readOnly
            value={user?.email ?? ""}
            type="email"
            className="h-11 rounded border bg-muted px-3 text-sm text-foreground"
          />
          <span>
            <UiText text="Non compare sul tuo profilo pubblico." />
          </span>
        </label>
        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          {user &&
            (["avatar", "banner"] as const).map((kind) => (
              <ProfileImageUpload
                key={kind}
                kind={kind}
                userId={user.id}
                value={kind === "avatar" ? form.avatar_url : form.banner_url}
                disabled={busy || uploading}
                onBusyChange={setUploading}
                onChange={(url) =>
                  setForm((previous) => ({
                    ...previous,
                    [kind === "avatar" ? "avatar_url" : "banner_url"]: url,
                  }))
                }
              />
            ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            ["username", "Username"],
            ["display_name", "Nome visualizzato"],
          ].map(([key, label]) => (
            <label key={key} className="grid gap-2 text-xs text-muted-foreground">
              <UiText text={label} />
              <UiElement
                as="input"
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key!]: e.target.value })}
                disabled={busy}
                placeholder={key === "username" ? "Scegli uno username (facoltativo)" : undefined}
                maxLength={key === "username" ? 64 : key === "display_name" ? 80 : 2000}
                className="h-11 rounded border bg-background px-3 text-sm text-foreground"
              />
            </label>
          ))}
          <label className="grid gap-2 text-xs text-muted-foreground sm:col-span-2">
            <UiText text="Qualcosa di te" />
            <UiElement
              as="textarea"
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
      <button className="button-ink" disabled={busy || uploading}>
        <UiText text={busy ? "Salvataggio…" : "Salva profilo pubblico"} />
      </button>
    </form>
  );
}
