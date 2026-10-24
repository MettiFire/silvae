import { UiText } from "@/lib/ui-language-context";
import { pageSeo } from "@/lib/site-seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { ReaderProfile, ProfileLoading } from "@/components/ReaderProfile";
import { AppShell } from "@/components/AppShell";
export const Route = createFileRoute("/_authenticated/profile")({
  head: () =>
    pageSeo(
      "Il mio profilo — Silvae",
      "Gestisci il tuo profilo di lettore, le letture, le liste e gli autori che segui.",
      undefined,
      true,
    ),
  component: ProfilePage,
});
function ProfilePage() {
  const { profile, loading, profileLoading, refreshProfile } = useAuth();
  return profile ? (
    <ReaderProfile username={profile.username} />
  ) : (
    <AppShell>
      {loading || profileLoading ? (
        <ProfileLoading />
      ) : (
        <p className="editorial-empty">
          <UiText text="Il profilo non si è caricato." />{" "}
          <button className="mr-4 underline" onClick={() => void refreshProfile()}>
            <UiText text="Riprova" />
          </button>{" "}
          <Link to="/settings" className="underline">
            <UiText text="Apri le impostazioni" />
          </Link>
        </p>
      )}
    </AppShell>
  );
}
