import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { ReaderProfile, ProfileLoading } from "@/components/ReaderProfile";
import { AppShell } from "@/components/AppShell";
export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Il mio profilo — Paginae" }] }),
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
          Il profilo non si è caricato.{" "}
          <button className="mr-4 underline" onClick={() => void refreshProfile()}>
            Riprova
          </button>{" "}
          <Link to="/settings" className="underline">
            Apri le impostazioni
          </Link>
        </p>
      )}
    </AppShell>
  );
}
