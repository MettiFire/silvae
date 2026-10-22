import { pageSeo } from "@/lib/site-seo";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AnnualReadingGoal } from "@/components/AnnualReadingGoal";
import { ChallengeExplorer } from "@/components/ChallengeExplorer";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { useReadingChallenges } from "@/lib/use-reading-challenges";

export const Route = createFileRoute("/_authenticated/challenges")({
  head: () =>
    pageSeo(
      "Sfide di lettura — Paginae",
      "Scegli percorsi tra premi letterari, letture dal mondo e obiettivi annuali e segui i tuoi progressi.",
      undefined,
      true,
    ),
  component: Challenges,
});
function Challenges() {
  const { user } = useAuth();
  const library = useLibrary(user?.id);
  const challenges = useReadingChallenges(user?.id);
  return (
    <AppShell>
      <PageHeader
        title="Una nuova avventura tra le pagine"
        subtitle="Segui il tuo ritmo, scopri nuove voci e scegli il prossimo traguardo."
      />
      {user && <AnnualReadingGoal userId={user.id} library={library.data ?? []} />}
      <div className="mb-5">
        <h2 className="font-display text-2xl font-bold">Ogni sfida, una storia da cominciare</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nove percorsi da esplorare. Puoi seguirne più di uno: i progressi si aggiornano dalla tua
          libreria.
        </p>
      </div>
      {(library.isPending || challenges.isPending) && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          Caricamento delle tue letture e iscrizioni…
        </p>
      )}
      {(library.isError || challenges.isError) && (
        <p role="alert" className="mb-4 rounded-xl border border-border p-4 text-sm">
          Non è stato possibile caricare tutti i tuoi dati.{" "}
          <button
            className="text-primary"
            onClick={() => {
              void library.refetch();
              void challenges.refetch();
            }}
          >
            Riprova
          </button>
        </p>
      )}
      <ChallengeExplorer
        library={library.data ?? []}
        enrollments={challenges.enrollments}
        saving={
          challenges.saving ||
          challenges.isPending ||
          library.isPending ||
          library.isError ||
          challenges.isError
        }
        onSave={challenges.save}
        onLeave={challenges.leave}
      />
    </AppShell>
  );
}
