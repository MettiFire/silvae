import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Avatar } from "@/routes/book.$bookId";
import { FollowedAuthors } from "@/components/FollowedAuthors";
import { ReadingPreferences } from "@/components/ReadingPreferences";
import { BookCard } from "@/components/BookCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { useMyLists } from "@/components/AddToListMenu";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Il mio profilo — Paginae" },
      {
        name: "description",
        content: "Gestisci profilo, biografia, liste create e salvate su Paginae.",
      },
      { property: "og:title", content: "Il mio profilo — Paginae" },
      { property: "og:description", content: "Profilo, liste e letture recenti." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const { data: library = [] } = useLibrary(user?.id);
  const { data: lists = [] } = useMyLists();
  const [form, setForm] = useState({
    username: "",
    display_name: "",
    bio: "",
    avatar_url: "",
    banner_url: "",
  });

  useEffect(() => {
    if (profile)
      setForm({
        username: profile.username,
        display_name: profile.display_name ?? "",
        bio: profile.bio ?? "",
        avatar_url: profile.avatar_url ?? "",
        banner_url: profile.banner_url ?? "",
      });
  }, [profile?.id]);

  const { data: counts } = useQuery({
    queryKey: ["follow-counts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", user!.id),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", user!.id),
      ]);
      return { followers: followers ?? 0, following: following ?? 0 };
    },
  });

  const { data: saved = [] } = useQuery({
    queryKey: ["saved-lists", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_lists")
        .select(
          "list_id, book_lists(id, name, is_public, user_id, profiles:profiles!inner(username, avatar_url))",
        )
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    void qc.invalidateQueries();
    toast.success("Profilo aggiornato");
  };

  const recent = library.filter((i) => i.status === "read").slice(0, 6);
  const favorites = library.filter((i) => i.favorite).slice(0, 6);

  return (
    <AppShell>
      <PageHeader title="Profilo" subtitle={profile ? `@${profile.username}` : ""} />

      <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
        <div
          className="h-28 bg-accent"
          style={
            form.banner_url
              ? { backgroundImage: `url(${form.banner_url})`, backgroundSize: "cover" }
              : undefined
          }
        />
        <div className="flex flex-wrap items-center gap-4 p-5">
          <Avatar
            url={form.avatar_url}
            name={form.display_name || form.username || "?"}
            size={56}
          />
          <div>
            <p className="font-display text-lg font-bold">{form.display_name || form.username}</p>
            <p className="text-sm text-muted-foreground">
              {counts?.followers ?? 0} follower · {counts?.following ?? 0} seguiti ·{" "}
              {library.length} libri
            </p>
          </div>
        </div>
      </div>

      <section className="mb-10 grid gap-3 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
        <Field
          label="Username"
          value={form.username}
          onChange={(v) => setForm({ ...form, username: v })}
        />
        <Field
          label="Nome visualizzato"
          value={form.display_name}
          onChange={(v) => setForm({ ...form, display_name: v })}
        />
        <Field
          label="URL avatar"
          value={form.avatar_url}
          onChange={(v) => setForm({ ...form, avatar_url: v })}
        />
        <Field
          label="URL banner"
          value={form.banner_url}
          onChange={(v) => setForm({ ...form, banner_url: v })}
        />
        <label className="md:col-span-2 flex flex-col gap-1 text-xs text-muted-foreground">
          Biografia
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="rounded-lg border border-border bg-background p-2 text-sm text-foreground"
          />
        </label>
        <div className="md:col-span-2">
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Salva profilo
          </button>
        </div>
      </section>

      <ReadingPreferences />
      <FollowedAuthors />

      <Section title="Letti di recente">
        <Grid items={recent} />
      </Section>
      <Section title="Preferiti">
        <Grid items={favorites} />
      </Section>

      <Section title="Le mie liste">
        <div className="grid gap-3 md:grid-cols-3">
          {lists.length === 0 && (
            <p className="text-sm text-muted-foreground">Nessuna lista creata.</p>
          )}
          {lists.map((l) => (
            <Link
              key={l.id}
              to="/list/$listId"
              params={{ listId: l.id }}
              className="rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
            >
              <p className="font-display font-semibold">{l.name}</p>
              <p className="text-xs text-muted-foreground">
                {l.is_public ? "Pubblica" : "Privata"}
              </p>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Liste salvate">
        <div className="grid gap-3 md:grid-cols-3">
          {saved.length === 0 && (
            <p className="text-sm text-muted-foreground">Nessuna lista salvata.</p>
          )}
          {saved.map((s) => {
            const l = s.book_lists as unknown as {
              id: string;
              name: string;
              profiles: { username: string; avatar_url: string | null };
            };
            if (!l) return null;
            return (
              <Link
                key={l.id}
                to="/list/$listId"
                params={{ listId: l.id }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <p className="font-display font-semibold">{l.name}</p>
                <span className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar
                    url={l.profiles?.avatar_url}
                    name={l.profiles?.username ?? "?"}
                    size={18}
                  />
                  @{l.profiles?.username}
                </span>
              </Link>
            );
          })}
        </div>
      </Section>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
      />
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ items }: { items: ReturnType<typeof useLibrary>["data"] }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">Ancora nulla qui.</p>;
  return (
    <div className="book-grid grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
      {items.map((i) =>
        i.books ? (
          <BookCard key={i.id} book={i.books} rating={i.rating != null ? Number(i.rating) : null} />
        ) : null,
      )}
    </div>
  );
}
