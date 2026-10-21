import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/routes/book.$bookId";
import { BookCard } from "@/components/BookCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";

export const Route = createFileRoute("/u/$username")({
  head: () => ({
    meta: [
      { title: "Profilo lettore — Paginae" },
      { name: "description", content: "Profilo pubblico: letture recenti, preferiti e liste condivise." },
      { property: "og:title", content: "Profilo lettore — Paginae" },
      { property: "og:description", content: "Letture recenti, preferiti e liste condivise." },
    ],
  }),
  component: PublicProfile,
});

function PublicProfile() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      return data;
    },
  });

  const { data: library = [] } = useLibrary(profile?.id);

  const { data: lists = [] } = useQuery({
    queryKey: ["public-lists", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase.from("book_lists").select("*").eq("user_id", profile!.id).eq("is_public", true);
      return data ?? [];
    },
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", user?.id, profile?.id],
    enabled: !!user && !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user!.id)
        .eq("following_id", profile!.id)
        .maybeSingle();
      return !!data;
    },
  });

  if (!profile) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Profilo non trovato.</p>
      </AppShell>
    );
  }

  const toggleFollow = async () => {
    if (!user) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id });
    }
    void qc.invalidateQueries({ queryKey: ["is-following"] });
  };

  const read = library.filter((i) => i.status === "read").slice(0, 6);
  const favs = library.filter((i) => i.favorite).slice(0, 6);

  return (
    <AppShell>
      <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
        <div
          className="h-28 bg-accent"
          style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover" } : undefined}
        />
        <div className="flex flex-wrap items-center gap-4 p-5">
          <Avatar url={profile.avatar_url} name={profile.display_name ?? profile.username} size={56} />
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold">{profile.display_name ?? profile.username}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="mt-2 max-w-xl text-sm">{profile.bio}</p>}
          </div>
          {user && user.id !== profile.id && (
            <button type="button" onClick={toggleFollow} className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              {isFollowing ? "Smetti di seguire" : "Segui"}
            </button>
          )}
        </div>
      </div>

      <h2 className="mb-3 font-display text-lg font-bold">Letti di recente</h2>
      <div className="mb-8 book-grid grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {read.map((i) => (i.books ? <BookCard key={i.id} book={i.books} rating={i.rating != null ? Number(i.rating) : null} /> : null))}
      </div>

      <h2 className="mb-3 font-display text-lg font-bold">Preferiti</h2>
      <div className="mb-8 book-grid grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {favs.map((i) => (i.books ? <BookCard key={i.id} book={i.books} /> : null))}
      </div>

      <h2 className="mb-3 font-display text-lg font-bold">Liste pubbliche</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {lists.length === 0 && <p className="text-sm text-muted-foreground">Nessuna lista pubblica.</p>}
        {lists.map((l) => (
          <Link key={l.id} to="/list/$listId" params={{ listId: l.id }} className="rounded-xl border border-border bg-card p-4">
            <p className="font-display font-semibold">{l.name}</p>
            <p className="text-xs text-muted-foreground">{l.description}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
