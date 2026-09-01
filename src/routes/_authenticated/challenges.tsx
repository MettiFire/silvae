import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ProgressBar } from "@/components/ProgressBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";

export const Route = createFileRoute("/_authenticated/challenges")({
  head: () => ({
    meta: [
      { title: "Sfide di lettura — Paginae" },
      { name: "description", content: "Imposta il tuo obiettivo annuale di lettura e segui i progressi." },
      { property: "og:title", content: "Sfide di lettura — Paginae" },
      { property: "og:description", content: "Obiettivi annuali e archivio delle sfide passate." },
    ],
  }),
  component: Challenges,
});

function Challenges() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [goal, setGoal] = useState("30");
  const { data: library = [] } = useLibrary(user?.id);

  const { data: challenges = [] } = useQuery({
    queryKey: ["challenges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("user_id", user!.id)
        .order("year", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const finishedIn = (year: number) =>
    library.filter((i) => i.status === "read" && i.finished_at && new Date(i.finished_at).getFullYear() === year).length;

  const save = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("challenges")
      .upsert({ user_id: user.id, year: currentYear, goal: Number(goal) || 1 }, { onConflict: "user_id,year" });
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["challenges"] });
    toast.success("Obiettivo aggiornato");
  };

  const current = challenges.find((c) => c.year === currentYear);

  return (
    <AppShell>
      <PageHeader title="Sfide di lettura" subtitle="Il tuo obiettivo, anno per anno" />

      <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-paper">
        <h2 className="font-display text-xl font-bold">Sfida {currentYear}</h2>
        {current ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {finishedIn(currentYear)} di {current.goal} libri completati
            </p>
            <ProgressBar className="mt-4" current={finishedIn(currentYear)} total={current.goal} showLabel={false} />
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Nessun obiettivo impostato per quest'anno.</p>
        )}
        <div className="mt-5 flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            aria-label="Obiettivo libri"
            className="h-9 w-24 rounded-lg border border-border bg-background px-2 text-sm"
          />
          <span className="text-sm text-muted-foreground">libri nel {currentYear}</span>
          <button type="button" onClick={save} className="ml-auto h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            Salva obiettivo
          </button>
        </div>
      </div>

      <h2 className="mb-3 font-display text-lg font-bold">Archivio</h2>
      <div className="space-y-3">
        {challenges.filter((c) => c.year !== currentYear).length === 0 && (
          <p className="text-sm text-muted-foreground">Nessuna sfida precedente.</p>
        )}
        {challenges
          .filter((c) => c.year !== currentYear)
          .map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold">{c.year}</span>
                <span className="text-sm text-muted-foreground">
                  {finishedIn(c.year)} / {c.goal}
                </span>
              </div>
              <ProgressBar className="mt-2" current={finishedIn(c.year)} total={c.goal} showLabel={false} />
            </div>
          ))}
      </div>
    </AppShell>
  );
}
