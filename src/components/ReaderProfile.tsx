import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ArrowUpRight, Plus, Settings, Lock, Globe, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionHeading } from "./AppShell";
import { BookGridSizeControl } from "./BookGridSizeControl";
import { BookCard, BookCover } from "./BookCard";
import { ListEditor } from "./ListEditor";
import type { BookList } from "./AddToListMenu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/lib/auth";
import { useLibrary, type LibraryItem } from "@/lib/library";
import { getProfileMap, profileShelves } from "@/lib/profile-data";
import { AUTHORS_FIELD, parseFollowedAuthors, type FollowedAuthor } from "@/lib/followed-authors";
import { isGeneratedProfile, profileLabel } from "@/lib/profile-model";
import { requireFragmentUser } from "@/lib/fragments";
import type { Book } from "@/lib/books";
export type ProfileList = BookList & {
  preview?: { books: Book | null }[];
  totals?: { count: number }[];
};
export function ReaderProfile({ username }: { username: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editor, setEditor] = useState<BookList | true | null>(null);
  const [people, setPeople] = useState<"followers" | "following" | null>(null);
  const profile = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url,banner_url,bio")
        .eq("username", username)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const id = profile.data?.id;
  const own = !!id && user?.id === id;
  const library = useLibrary(id);
  const lists = useQuery({
    queryKey: ["profile-lists", id, own],
    enabled: !!id,
    queryFn: async () => {
      let query = supabase
        .from("book_lists")
        .select(
          "*,preview:list_items(books(id,title,authors,cover_url,published_year,page_count,categories)),totals:list_items(count)",
        )
        .eq("user_id", id!)
        .order("created_at", { ascending: false })
        .limit(100)
        .limit(4, { referencedTable: "preview" });
      if (!own) query = query.eq("is_public", true);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ProfileList[];
    },
  });
  const authors = useQuery({
    queryKey: ["public-authors", id, user?.user_metadata[AUTHORS_FIELD]],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("author_follows")
        .select("author_id,author_name,followed_at")
        .eq("user_id", id!)
        .order("followed_at", { ascending: false });
      if (error) {
        if (own && ["42P01", "PGRST205"].includes(error.code))
          return {
            authors: parseFollowedAuthors(user?.user_metadata[AUTHORS_FIELD]),
            localOnly: true,
          };
        throw error;
      }
      return {
        authors: data.map((a) => ({
          id: a.author_id,
          name: a.author_name,
          followedAt: a.followed_at,
        })),
        localOnly: false,
      };
    },
  });
  const counts = useQuery({
    queryKey: ["follow-counts", id],
    enabled: !!id,
    queryFn: async () => {
      const [followers, following] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", id!),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id!),
      ]);
      if (followers.error) throw followers.error;
      if (following.error) throw following.error;
      return { followers: followers.count ?? 0, following: following.count ?? 0 };
    },
  });
  const following = useQuery({
    queryKey: ["is-following", user?.id, id],
    enabled: !!user && !!id && !own,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user!.id)
        .eq("following_id", id!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  const follow = useMutation({
    mutationFn: async () => {
      if (!user || !id || own) return;
      await requireFragmentUser(supabase, user.id);
      const { error } = following.data
        ? await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id)
        : await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["is-following"] });
      void qc.invalidateQueries({ queryKey: ["follow-counts"] });
      void qc.invalidateQueries({ queryKey: ["following"] });
    },
    onError: () => toast.error("Impossibile aggiornare il seguito. Riprova."),
  });
  const saved = useQuery({
    queryKey: ["saved-lists", id],
    enabled: own,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_lists")
        .select("book_lists(id,name,description,is_public,user_id)")
        .eq("user_id", id!);
      if (error) throw error;
      return data.flatMap((s) => (s.book_lists ? [s.book_lists as unknown as ProfileList] : []));
    },
  });
  return (
    <AppShell>
      {profile.isPending ? (
        <ProfileLoading />
      ) : profile.isError ? (
        <p role="alert" className="editorial-empty">
          Il profilo non si è caricato.{" "}
          <button onClick={() => void profile.refetch()} className="underline">
            Riprova
          </button>
        </p>
      ) : !profile.data ? (
        <div className="editorial-empty">
          <h1 className="font-display text-3xl">Questo lettore non c’è ancora.</h1>
          <p className="mt-3">Controlla lo username o cerca un altro lettore.</p>
          <Link to="/social" className="mt-4 inline-block underline">
            Cerca lettori
          </Link>
        </div>
      ) : (
        <>
          {own && profile.data && isGeneratedProfile(profile.data) && (
            <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
              <p>Scegli il tuo username, raccontati con una bio e aggiungi foto e banner.</p>
              <Link
                to="/settings"
                search={{ section: "profile" }}
                className="mt-2 inline-block text-primary underline"
              >
                Personalizza il tuo profilo →
              </Link>
            </div>
          )}
          <ReaderProfileView
            profile={profile.data}
            own={own}
            items={library.data ?? []}
            lists={lists.data ?? []}
            saved={saved.data ?? []}
            authors={authors.data?.authors ?? []}
            counts={counts.data}
            loading={library.isPending}
            libraryError={library.isError}
            listsError={lists.isError}
            authorsError={authors.isError}
            onPeople={setPeople}
            onNewList={() => setEditor(true)}
            onEditList={setEditor}
            followAction={
              own ? (
                <Link to="/settings" search={{ section: "profile" }} className="button-outline">
                  <Settings size={14} />
                  Modifica profilo
                </Link>
              ) : user ? (
                <button
                  className={following.data ? "button-outline" : "button-ink"}
                  disabled={follow.isPending || following.isPending || following.isError}
                  onClick={() => follow.mutate()}
                >
                  {following.data ? (
                    <>
                      <Check size={14} />
                      Segui già
                    </>
                  ) : (
                    "Segui questo lettore"
                  )}
                </button>
              ) : (
                <Link to="/auth" className="button-ink">
                  Accedi per seguire
                </Link>
              )
            }
          />
          {authors.data?.localOnly && (
            <p className="mt-4 text-xs text-muted-foreground">
              Gli autori sono ancora visibili solo a te: la pubblicazione sul profilo richiede
              l’aggiornamento del database.
            </p>
          )}
          {editor && (
            <ListEditor
              {...(editor === true ? {} : { list: editor })}
              close={() => setEditor(null)}
              created={(id) => void navigate({ to: "/list/$listId", params: { listId: id } })}
            />
          )}
          {people && (
            <ProfilePeople userId={profile.data.id} type={people} close={() => setPeople(null)} />
          )}
        </>
      )}
    </AppShell>
  );
}
export function ProfileLoading() {
  return (
    <div role="status" aria-label="Caricamento profilo" className="animate-pulse">
      <div className="h-40 bg-muted" />
      <div className="my-8 h-12 w-1/2 bg-muted" />
      <div className="h-6 w-1/3 bg-muted" />
    </div>
  );
}
export function ReaderProfileView({
  profile,
  own,
  items,
  lists,
  authors,
  counts,
  followAction,
  onNewList,
  onEditList,
  onPeople,
  saved = [],
  loading = false,
  libraryError = false,
  listsError = false,
  authorsError = false,
}: {
  profile: Profile;
  own: boolean;
  items: LibraryItem[];
  lists: ProfileList[];
  authors: FollowedAuthor[];
  counts?: { followers: number; following: number } | undefined;
  followAction: React.ReactNode;
  onNewList: () => void;
  onEditList: (list: BookList) => void;
  onPeople: (type: "followers" | "following") => void;
  saved?: ProfileList[];
  loading?: boolean;
  libraryError?: boolean;
  listsError?: boolean;
  authorsError?: boolean;
}) {
  const [tab, setTab] = useState<"read" | "wishlist" | "favorites" | "lists" | "authors">("read");
  const [visible, setVisible] = useState(20);
  const shelves = profileShelves(items);
  const rows =
    tab === "wishlist" ? shelves.wishlist : tab === "favorites" ? shelves.favorites : shelves.read;
  const name = profileLabel(profile);
  return (
    <article>
      <div
        className={`profile-banner ${profile.banner_url ? "has-image" : ""}`}
        style={
          profile.banner_url
            ? { backgroundImage: `url(${JSON.stringify(profile.banner_url)})` }
            : undefined
        }
      >
        <p className="eyebrow">
          La biblioteca personale{!isGeneratedProfile(profile) ? ` / @${profile.username}` : ""}
        </p>
      </div>
      <header className="profile-identity">
        {profile.avatar_url ? (
          <img
            className="profile-avatar"
            src={profile.avatar_url}
            alt={`Foto di ${name}`}
            width={112}
            height={112}
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="profile-avatar" aria-hidden="true">
            {name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="profile-name">{name}</h1>
          {!isGeneratedProfile(profile) && (
            <p className="mt-2 text-xs text-muted-foreground">@{profile.username}</p>
          )}
          {profile.bio && (
            <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-relaxed">
              {profile.bio}
            </p>
          )}
          <div className="profile-stats">
            <span>
              <strong>{loading || libraryError ? "—" : shelves.read.length}</strong> libri letti
            </span>
            <button onClick={() => onPeople("followers")}>
              <strong>{counts?.followers ?? "—"}</strong> follower
            </button>
            <button onClick={() => onPeople("following")}>
              <strong>{counts?.following ?? "—"}</strong> lettori seguiti
            </button>
          </div>
        </div>
        <div className="self-start sm:ml-auto">{followAction}</div>
      </header>
      <div
        className="profile-tabs"
        role="tablist"
        aria-label="Raccolte del profilo"
        onKeyDown={(event) => {
          const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
          if (!keys.includes(event.key)) return;
          const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]")];
          const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
          const index =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? tabs.length - 1
                : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
          event.preventDefault();
          tabs[index]?.focus();
          tabs[index]?.click();
        }}
      >
        {[
          ["read", "Letti", shelves.read.length],
          ["wishlist", "Da leggere", shelves.wishlist.length],
          ["favorites", "Preferiti", shelves.favorites.length],
          ["lists", "Liste", lists.length],
          ["authors", "Autori", authors.length],
        ].map(([key, label, count]) => (
          <button
            role="tab"
            aria-selected={tab === key}
            tabIndex={tab === key ? 0 : -1}
            aria-controls="profile-collection"
            id={`profile-tab-${key}`}
            key={key}
            onClick={() => {
              setTab(key as typeof tab);
              setVisible(20);
            }}
          >
            {label}
            <span>
              {(key === "authors" && authorsError) ||
              (key === "lists" && listsError) ||
              (["read", "wishlist", "favorites"].includes(String(key)) && (loading || libraryError))
                ? "—"
                : count}
            </span>
          </button>
        ))}
      </div>
      <div className="profile-columns">
        <div
          className="min-w-0"
          role="tabpanel"
          aria-labelledby={`profile-tab-${tab}`}
          id="profile-collection"
        >
          {tab === "lists" ? (
            <>
              <SectionHeading title={own ? "Le tue liste" : "Liste di lettura"} number="01">
                {own && (
                  <button onClick={onNewList} className="inline-flex items-center gap-2">
                    <Plus size={14} />
                    Nuova lista
                  </button>
                )}
              </SectionHeading>
              {listsError ? (
                <p role="alert" className="editorial-empty">
                  Le liste non sono disponibili. Ricarica la pagina per riprovare.
                </p>
              ) : (
                <ProfileLists lists={lists} own={own} onEdit={onEditList} />
              )}{" "}
              {own && saved.length > 0 && (
                <div className="mt-10">
                  <SectionHeading title="Liste salvate" />
                  <ProfileLists lists={saved} own={false} onEdit={onEditList} />
                </div>
              )}
            </>
          ) : tab === "authors" ? (
            <>
              <SectionHeading title="Autori seguiti" number="01" />
              {authorsError ? (
                <p role="alert" className="editorial-empty">
                  Gli autori seguiti non sono disponibili in questo momento.
                </p>
              ) : (
                <AuthorCollection authors={authors} />
              )}
            </>
          ) : (
            <>
              <SectionHeading
                title={
                  tab === "wishlist"
                    ? "Da leggere"
                    : tab === "favorites"
                      ? "Preferiti"
                      : "Letti di recente"
                }
                number="01"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="hidden text-[11px] text-muted-foreground sm:inline">
                    {tab === "read" ? "Dal più recente" : ""}
                  </span>
                  <BookGridSizeControl />
                </div>
              </SectionHeading>
              {loading ? (
                <div className="profile-shelf" role="status" aria-label="Caricamento libri">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="aspect-[2/3] animate-pulse bg-muted" />
                  ))}
                </div>
              ) : libraryError ? (
                <p role="alert" className="editorial-empty">
                  Le letture non sono disponibili. Ricarica la pagina per riprovare.
                </p>
              ) : rows.length ? (
                <>
                  <div className="profile-shelf">
                    {rows
                      .slice(0, visible)
                      .map((i) =>
                        i.books ? (
                          <BookCard
                            key={i.id}
                            book={i.books}
                            rating={i.rating == null ? null : Number(i.rating)}
                          />
                        ) : null,
                      )}
                  </div>
                  {rows.length > visible && (
                    <button
                      className="button-outline mt-8"
                      onClick={() => setVisible(visible + 20)}
                    >
                      Mostra altri libri <ArrowRight size={13} />
                    </button>
                  )}
                </>
              ) : (
                <p className="editorial-empty">
                  {own
                    ? "Questo scaffale è ancora da riempire. Aggiungi un libro dalla sua scheda."
                    : "Non ci sono ancora libri in questo scaffale."}
                </p>
              )}
              {tab === "read" && (
                <div className="mt-12">
                  <SectionHeading title="Liste di lettura" number="02">
                    <button
                      onClick={() => setTab("lists")}
                      className="inline-flex items-center gap-2"
                    >
                      {own ? "Gestisci liste" : "Tutte le liste"}
                      <ArrowUpRight size={13} />
                    </button>
                  </SectionHeading>
                  {listsError ? (
                    <p className="editorial-empty">Liste non disponibili.</p>
                  ) : (
                    <ProfileLists lists={lists.slice(0, 3)} own={own} onEdit={onEditList} />
                  )}{" "}
                  {own && (
                    <button
                      onClick={onNewList}
                      className="mt-5 inline-flex items-center gap-2 text-xs text-primary"
                    >
                      <Plus size={14} />
                      Crea una lista di libri
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <aside className="profile-aside">
          <p className="eyebrow">In questo momento</p>
          <h2 className="mt-3 font-display text-xl">In lettura</h2>
          {shelves.reading.length ? (
            <div className="mt-5 space-y-5">
              {shelves.reading.slice(0, 3).map((i) =>
                i.books ? (
                  <Link
                    key={i.id}
                    to="/book/$bookId"
                    params={{ bookId: i.book_id }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-12 shrink-0">
                      <BookCover book={i.books} />
                    </div>
                    <div>
                      <h3 className="text-xs font-medium">{i.books.title}</h3>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {i.books.authors.join(", ")}
                      </p>
                      <p className="mt-2 text-[10px] text-primary">In lettura</p>
                    </div>
                  </Link>
                ) : null,
              )}
            </div>
          ) : (
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Nessuna lettura in corso condivisa.
            </p>
          )}
          <div className="mt-10">
            <p className="eyebrow">Autori seguiti</p>
            {authors.slice(0, 5).map((a) => (
              <AuthorRow key={a.id} author={a} />
            ))}
            {!authors.length && (
              <p className="mt-4 text-xs text-muted-foreground">
                {authorsError ? "Elenco non disponibile." : "Ancora nessun autore."}
              </p>
            )}
            {authors.length > 0 && (
              <button
                className="mt-4 inline-flex items-center gap-2 text-xs text-primary"
                onClick={() => setTab("authors")}
              >
                Tutti gli autori <ArrowRight size={12} />
              </button>
            )}
          </div>
          <p className="mt-10 border-t pt-5 font-display text-sm italic leading-relaxed text-muted-foreground">
            Sfoglia i libri, scopri gli autori, segui le tue curiosità.
          </p>
        </aside>
      </div>
    </article>
  );
}
export function ProfileLists({
  lists,
  own,
  onEdit,
}: {
  lists: ProfileList[];
  own: boolean;
  onEdit: (list: BookList) => void;
}) {
  return lists.length ? (
    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
      {lists.map((l) => (
        <article className="list-card" key={l.id}>
          <Link to="/list/$listId" params={{ listId: l.id }}>
            <div className="list-card-covers">
              {l.preview?.length ? (
                l.preview.slice(0, 4).map((it, i) =>
                  it.books ? (
                    <div key={i}>
                      <BookCover book={it.books} />
                    </div>
                  ) : null,
                )
              ) : (
                <span className="self-center pb-3 font-display text-lg italic text-muted-foreground">
                  Una storia da comporre.
                </span>
              )}
            </div>
            <h3 className="font-display text-base leading-snug">{l.name}</h3>
            {l.description && (
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {l.description}
              </p>
            )}
          </Link>
          <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {l.is_public ? <Globe size={10} /> : <Lock size={10} />}{" "}
              {l.is_public ? "Pubblica" : "Privata · solo tu"}
              {l.totals?.[0] && ` · ${l.totals[0].count} libri`}
            </span>
            {own && (
              <button onClick={() => onEdit(l)} className="underline">
                Modifica
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  ) : (
    <p className="editorial-empty">
      {own
        ? "Crea una raccolta per un viaggio, un argomento o un autore."
        : "Questo lettore non ha ancora condiviso liste."}
    </p>
  );
}
export function AuthorRow({ author: a }: { author: FollowedAuthor }) {
  const initial = a.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  return (
    <Link
      to="/author/$author"
      params={{ author: a.name }}
      search={{ olid: a.id }}
      className="author-row"
    >
      <span className="author-monogram" aria-hidden="true">
        {initial}
      </span>
      <span>{a.name}</span>
      <ArrowUpRight size={12} className="ml-auto shrink-0 text-muted-foreground" />
    </Link>
  );
}
function AuthorCollection({ authors }: { authors: FollowedAuthor[] }) {
  return authors.length ? (
    <div className="grid gap-x-8 sm:grid-cols-2">
      {authors.map((a) => (
        <AuthorRow key={a.id} author={a} />
      ))}
    </div>
  ) : (
    <p className="editorial-empty">
      Gli autori seguiti appariranno qui. Puoi seguirli dalle loro pagine.
    </p>
  );
}
function ProfilePeople({
  userId,
  type,
  close,
}: {
  userId: string;
  type: "followers" | "following";
  close: () => void;
}) {
  const [page, setPage] = useState(0);
  const people = useQuery({
    queryKey: ["profile-people", userId, type, page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id,following_id")
        .eq(type === "followers" ? "following_id" : "follower_id", userId)
        .order("created_at", { ascending: false })
        .range(page * 30, page * 30 + 29);
      if (error) throw error;
      const ids = data.map((r) => (type === "followers" ? r.follower_id : r.following_id));
      const profiles = await getProfileMap(ids);
      return {
        rows: ids.flatMap((id) => (profiles.get(id) ? [profiles.get(id)!] : [])),
        more: data.length === 30,
      };
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type === "followers" ? "Follower" : "Lettori seguiti"}</DialogTitle>
          <DialogDescription>Le persone con cui condividere la prossima lettura.</DialogDescription>
        </DialogHeader>
        {people.isPending ? (
          <p role="status">Caricamento…</p>
        ) : people.isError ? (
          <p role="alert">
            Elenco non disponibile. <button onClick={() => void people.refetch()}>Riprova</button>
          </p>
        ) : (
          <div className="max-h-[55vh] overflow-y-auto">
            {people.data?.rows.length ? (
              people.data.rows.map((p) => (
                <Link
                  key={p.id}
                  to="/u/$username"
                  params={{ username: p.username }}
                  onClick={close}
                  className="flex items-center gap-3 border-b py-3"
                >
                  <span className="account-initial">{profileLabel(p)[0]}</span>
                  <span className="text-sm">
                    {profileLabel(p)}
                    {!isGeneratedProfile(p) && (
                      <span className="block text-xs text-muted-foreground">@{p.username}</span>
                    )}
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Ancora nessun lettore qui.</p>
            )}
          </div>
        )}
        <div className="flex justify-between text-xs">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            Precedenti
          </button>
          <button disabled={!people.data?.more} onClick={() => setPage(page + 1)}>
            Successivi
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
