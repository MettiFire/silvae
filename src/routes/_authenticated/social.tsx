import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Avatar } from "@/routes/book.$bookId";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/social")({
  head: () => ({
    meta: [
      { title: "Social — Paginae" },
      { name: "description", content: "Feed attività dei lettori che segui: letture iniziate, finite e recensioni." },
      { property: "og:title", content: "Social — Paginae" },
      { property: "og:description", content: "Feed attività dei lettori che segui." },
    ],
  }),
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

  const { data: following = [] } = useQuery({
    queryKey: ["following", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", user!.id);
      return (data ?? []).map((r) => r.following_id as string);
    },
  });

  const { data: feed = [] } = useQuery({
    queryKey: ["activities", following.join("|")],
    queryFn: async () => {
      const ids = [...following, user?.id].filter(Boolean) as string[];
      const query = supabase
        .from("activities")
        .select("id, type, book_id, metadata, created_at, user_id, profiles:profiles!inner(username, display_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(50);
      const { data, error } = ids.length ? await query.in("user_id", ids) : await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("activity-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activities" }, () => {
        void qc.invalidateQueries({ queryKey: ["activities"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const { data: people = [] } = useQuery({
    queryKey: ["people", term],
    enabled: term.trim().length > 1,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .ilike("username", `%${term.trim()}%`)
        .limit(10);
      return data ?? [];
    },
  });

  const toggleFollow = async (id: string) => {
    if (!user) return;
    if (following.includes(id)) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
    }
    void qc.invalidateQueries({ queryKey: ["following"] });
  };

  return (
    <AppShell>
      <PageHeader title="Social" subtitle="Cosa stanno leggendo gli altri" />

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          {feed.length === 0 && <p className="text-sm text-muted-foreground">Ancora nessuna attività.</p>}
          {feed.map((a) => {
            const p = a.profiles as unknown as { username: string; display_name: string | null; avatar_url: string | null };
            const meta = (a.metadata ?? {}) as { title?: string };
            return (
              <article key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <Avatar url={p?.avatar_url} name={p?.display_name ?? p?.username ?? "?"} />
                <p className="text-sm">
                  <Link to="/u/$username" params={{ username: p?.username ?? "" }} className="font-medium hover:underline">
                    {p?.display_name ?? p?.username}
                  </Link>{" "}
                  <span className="text-muted-foreground">{VERB[a.type as string] ?? a.type}</span>{" "}
                  {a.book_id ? (
                    <Link to="/book/$bookId" params={{ bookId: a.book_id as string }} className="text-primary hover:underline">
                      {meta.title ?? "un libro"}
                    </Link>
                  ) : (
                    meta.title
                  )}
                </p>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {new Date(a.created_at as string).toLocaleDateString("it-IT")}
                </span>
              </article>
            );
          })}
        </div>

        <aside>
          <h2 className="mb-2 font-display font-semibold">Trova lettori</h2>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Cerca @username"
            aria-label="Cerca utenti"
            className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm"
          />
          <div className="mt-3 space-y-2">
            {people
              .filter((p) => p.id !== user?.id)
              .map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                  <Avatar url={p.avatar_url} name={p.display_name ?? p.username} size={28} />
                  <Link to="/u/$username" params={{ username: p.username }} className="min-w-0 flex-1 truncate text-sm hover:underline">
                    @{p.username}
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleFollow(p.id)}
                    className="rounded-lg border border-border px-2 py-1 text-xs"
                  >
                    {following.includes(p.id) ? "Segui già" : "Segui"}
                  </button>
                </div>
              ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
