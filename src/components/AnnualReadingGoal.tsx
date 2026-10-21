import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { ProgressBar } from "@/components/ProgressBar";
import { supabase } from "@/integrations/supabase/client";
import type { LibraryItem } from "@/lib/library";

export function AnnualReadingGoal({ userId, library }: { userId: string; library: LibraryItem[] }) {
  const year = new Date().getFullYear();
  const [goal, setGoal] = useState("30"),
    [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["challenges", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("user_id", userId)
        .order("year", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const current = query.data?.find((item) => item.year === year);
  useEffect(() => {
    if (current) setGoal(String(current.goal));
  }, [current?.goal]);
  const finished = (y: number) =>
    library.filter(
      (item) =>
        item.status === "read" &&
        item.finished_at &&
        new Date(item.finished_at).getFullYear() === y,
    ).length;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(goal);
    if (!Number.isInteger(value) || value < 1 || value > 10000) {
      toast.error("Scegli un obiettivo tra 1 e 10.000 libri.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("challenges")
        .upsert({ user_id: userId, year, goal: value }, { onConflict: "user_id,year" });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["challenges", userId] });
      toast.success("Obiettivo annuale aggiornato");
    } catch (error) {
      toast.error((error as Error).message || "Obiettivo non salvato. Riprova.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="mb-9 rounded-2xl border border-border bg-card p-5 shadow-paper md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Target className="h-4 w-4" />
            Il tuo ritmo
          </p>
          <h2 className="font-display text-xl font-bold">Il mio {year}, un libro alla volta</h2>
        </div>
        <p className="font-display text-2xl font-bold">
          {finished(year)}
          <span className="text-base font-normal text-muted-foreground">
            {" "}
            / {current?.goal ?? "—"}
          </span>
        </p>
      </div>
      {query.isPending && (
        <p className="mt-3 text-sm text-muted-foreground">Caricamento obiettivo…</p>
      )}
      {query.isError && (
        <p role="alert" className="mt-3 text-sm">
          Impossibile caricare l’obiettivo.{" "}
          <button className="text-primary" onClick={() => void query.refetch()}>
            Riprova
          </button>
        </p>
      )}
      {current && (
        <ProgressBar
          current={finished(year)}
          total={current.goal}
          className="mt-4"
          showLabel={false}
        />
      )}
      <form onSubmit={(e) => void save(e)} className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Voglio leggere
          <input
            required
            type="number"
            min={1}
            max={10000}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-20 rounded-lg border border-border bg-background px-2 py-2"
            aria-label="Obiettivo annuale in libri"
          />
          libri quest’anno
        </label>
        <button
          disabled={saving || query.isPending || query.isError}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Salvataggio…" : "Salva obiettivo"}
        </button>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">
        Contano i libri segnati come Letto con una data di fine nel {year}. I libri importati senza
        data non vengono assegnati a un anno.
      </p>
      {(query.data ?? []).some((item) => item.year !== year) && (
        <details className="mt-5 border-t border-border pt-4">
          <summary className="cursor-pointer text-sm font-medium">Gli anni passati</summary>
          <div className="mt-3 space-y-3">
            {query.data
              ?.filter((item) => item.year !== year)
              .map((item) => (
                <div key={item.id}>
                  <p className="mb-1 text-sm">
                    {item.year}: {finished(item.year)} / {item.goal} libri
                  </p>
                  <ProgressBar current={finished(item.year)} total={item.goal} showLabel={false} />
                </div>
              ))}
          </div>
        </details>
      )}
    </section>
  );
}
