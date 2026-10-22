import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader, SectionHeading } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getProfileMap } from "@/lib/profile-data";
import { requireFragmentUser } from "@/lib/fragments";
export const Route = createFileRoute("/_authenticated/social")({
  head: () => ({ meta: [{ title: "Lettori — Paginae" }] }),
  component: Social,
});
const VERB: Record<string, string> = {
  added: "ha aggiunto",
  started: "ha iniziato",
  finished: "ha finito",
  reviewed: "ha recensito",
  reread: "ha riletto",
};
function Social() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(term.trim()), 300);
    return () => clearTimeout(timer);
  }, [term]);
  const following = useQuery({
    queryKey: ["following", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user!.id);
      if (error) throw error;
      return data.map((r) => r.following_id);
    },
  });
  const feed = useQuery({
    queryKey: ["activities", user?.id, following.data?.join("|")],
    enabled: !!user && following.isSuccess,
    staleTime: 30000,
    refetchInterval: 60000,
    queryFn: async () => {
      const ids = [...(following.data ?? []), user!.id];
      const { data, error } = await supabase
        .from("activities")
        .select("id,type,book_id,metadata,created_at,user_id")
        .in("user_id", ids)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const profiles = await getProfileMap(data.map((a) => a.user_id));
      return data.map((a) => ({ ...a, profile: profiles.get(a.user_id) }));
    },
  });
  const people = useQuery({
    queryKey: ["people", search],
    enabled: search.length > 1,
    queryFn: async () => {
      const escaped = search.replace(/[\\%_]/g, "\\$&");
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .ilike("username", `%${escaped}%`)
        .limit(12);
      if (error) throw error;
      return data.filter((p) => p.id !== user?.id);
    },
  });
  async function toggle(id: string) {
    if (!user || busy || id === user.id) return;
    setBusy(id);
    try {
      await requireFragmentUser(supabase, user.id);
      const { error } = following.data?.includes(id)
        ? await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id)
        : await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
      if (error) throw error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["following"] }),
        qc.invalidateQueries({ queryKey: ["follow-counts"] }),
        qc.invalidateQueries({ queryKey: ["is-following"] }),
      ]);
    } catch {
      toast.error("Impossibile aggiornare il seguito. Riprova.");
    } finally {
      setBusy("");
    }
  }
  return (
    <AppShell>
      <PageHeader title="Tra lettori" subtitle="Le storie che ci fanno incontrare." />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_290px]">
        <section>
          <SectionHeading title="Dai tuoi lettori" number="01" />
          {(feed.isLoading || following.isPending) && (
            <p role="status" className="editorial-empty">
              Caricamento delle attività…
            </p>
          )}
          {(feed.isError || following.isError) && (
            <p role="alert" className="editorial-empty">
              Le attività non sono disponibili.{" "}
              <button
                className="underline"
                onClick={() => {
                  void following.refetch();
                  void feed.refetch();
                }}
              >
                Riprova
              </button>
            </p>
          )}
          {feed.isSuccess && !feed.data.length && (
            <p className="editorial-empty">
              Qui arriveranno le tue letture e quelle delle persone che segui. Cerca un lettore per
              cominciare.
            </p>
          )}
          {feed.data?.map((a) => {
            const p = a.profile;
            const meta = a.metadata as { title?: string };
            return (
              <article key={a.id} className="flex items-start gap-4 border-b py-6">
                <span className="account-initial shrink-0">
                  {(p?.display_name || p?.username || "?")[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed">
                    {p ? (
                      <Link
                        to="/u/$username"
                        params={{ username: p.username }}
                        className="font-medium hover:underline"
                      >
                        {p.display_name || p.username}
                      </Link>
                    ) : (
                      <span>Un lettore</span>
                    )}{" "}
                    <span className="text-muted-foreground">{VERB[a.type] || "ha aggiornato"}</span>{" "}
                    {a.book_id ? (
                      <Link
                        to="/book/$bookId"
                        params={{ bookId: a.book_id }}
                        className="font-display text-base text-primary hover:underline"
                      >
                        {meta?.title || "un libro"}
                      </Link>
                    ) : null}
                  </p>
                  <time
                    className="mt-2 block text-[10px] text-muted-foreground"
                    dateTime={a.created_at}
                  >
                    {new Date(a.created_at).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                    })}
                  </time>
                </div>
              </article>
            );
          })}
        </section>
        <aside className="border-t border-foreground pt-5">
          <p className="eyebrow">Nuove affinità</p>
          <h2 className="mb-5 mt-2 font-display text-2xl">Trova lettori</h2>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            aria-label="Cerca utenti"
            placeholder="Cerca uno username"
            className="h-11 w-full rounded border bg-transparent px-3 text-sm"
          />
          {people.isFetching && <p className="mt-4 text-xs">Ricerca…</p>}
          {people.isError && (
            <p role="alert" className="mt-4 text-xs">
              Ricerca non disponibile.
            </p>
          )}
          {search.length > 1 && people.isSuccess && !people.data.length && (
            <p className="mt-4 text-xs text-muted-foreground">Nessun lettore trovato.</p>
          )}
          {people.data?.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 border-b py-4">
              <Link
                to="/u/$username"
                params={{ username: p.username }}
                className="min-w-0 truncate text-xs hover:underline"
              >
                @{p.username}
              </Link>
              <button
                disabled={!!busy}
                onClick={() => void toggle(p.id)}
                className="text-xs text-primary"
              >
                {following.data?.includes(p.id) ? "Segui già" : "+ Segui"}
              </button>
            </div>
          ))}
        </aside>
      </div>
    </AppShell>
  );
}
