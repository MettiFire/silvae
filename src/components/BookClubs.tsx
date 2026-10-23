import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { Users, MessageCircle, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { profileLabel } from "@/lib/profile-model";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cacheBook, type Book } from "@/lib/books";
import {
  clubError,
  joinClub,
  loadClubs,
  loadTopics,
  loadMessages,
  type Club,
} from "@/lib/book-clubs";
import { requireFragmentUser } from "@/lib/fragments";
import { ClubBookPicker } from "./ClubBookPicker";
import { BookCover } from "./BookCard";
const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
export function BookClubs({
  clubId,
  topicId,
  onOpen,
}: {
  clubId?: string | undefined;
  topicId?: string | undefined;
  onOpen: (club?: string, topic?: string) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(false);
  const [create, setCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [managing, setManaging] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const clubs = useInfiniteQuery({
    queryKey: ["book-clubs", "list", user?.id, search, mine],
    enabled: !!user && !clubId,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => loadClubs(user!.id, search, undefined, mine, pageParam),
    getNextPageParam: (last, pages) => (last.length === 50 ? pages.length * 50 : undefined),
    staleTime: 30000,
  });
  const detail = useQuery({
    queryKey: ["book-clubs", "detail", user?.id, clubId],
    enabled: !!user && !!clubId,
    queryFn: () => loadClubs(user!.id, "", clubId),
    staleTime: 15000,
  });
  const club = detail.data?.[0];
  const owner = club?.owner_id === user?.id;
  const topics = useInfiniteQuery({
    queryKey: ["book-clubs", "topics", user?.id, clubId],
    enabled: !!user && !!clubId && !topicId,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => loadTopics(clubId!, pageParam),
    getNextPageParam: (last, pages) => (last.length === 50 ? pages.length * 50 : undefined),
    staleTime: 15000,
    refetchInterval: 60000,
  });
  const selectedTopic = useQuery({
    queryKey: ["book-clubs", "topic", clubId, topicId],
    enabled: !!user && !!clubId && !!topicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_topics")
        .select("*,book:books(title)")
        .eq("club_id", clubId!)
        .eq("id", topicId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const replies = useInfiniteQuery({
    queryKey: ["book-clubs", "messages", topicId],
    enabled: !!user && !!selectedTopic.data,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => loadMessages(topicId!, pageParam),
    getNextPageParam: (last, pages) => (last.length === 50 ? pages.length * 50 : undefined),
    refetchInterval: 60000,
  });
  async function run(action: () => Promise<void>) {
    if (!user || busy) return false;
    setBusy(true);
    try {
      await requireFragmentUser(supabase, user.id);
      await action();
      await qc.invalidateQueries({ queryKey: ["book-clubs"] });
      return true;
    } catch (e) {
      toast.error(clubError(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function createClub(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      const { data, error } = await supabase
        .from("book_clubs")
        .insert({ owner_id: user!.id, name: name.trim(), description: description.trim() })
        .select("id")
        .single();
      if (error) throw error;
      setCreate(false);
      setName("");
      setDescription("");
      onOpen(data.id);
      toast.success("Il tuo book club è pronto");
    });
  }
  async function selectBook(book: Book) {
    await run(async () => {
      await cacheBook(book);
      const { error } = await supabase
        .from("book_clubs")
        .update({ current_book_id: book.id })
        .eq("id", clubId!)
        .select("id")
        .single();
      if (error) throw error;
      setManaging(false);
      toast.success("Lettura del club aggiornata");
    });
  }
  const error = clubs.error || detail.error || topics.error || selectedTopic.error;
  if (!user) return null;
  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="editorial-empty">
          {clubError(error)}{" "}
          <button
            className="underline"
            onClick={() => void qc.invalidateQueries({ queryKey: ["book-clubs"] })}
          >
            Riprova
          </button>
        </p>
      )}
      {!clubId ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <form
              className="flex min-w-0 flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(term.trim());
              }}
            >
              <input
                aria-label="Cerca book club"
                placeholder="Cerca un club"
                className={input}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
              <button className="button-outline">Cerca</button>
            </form>
            <button
              className="button-ink"
              disabled={clubs.isError}
              onClick={() => setCreate((v) => !v)}
            >
              <Plus size={14} />
              Crea un club
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
            Solo i miei club
          </label>
          {create && (
            <form onSubmit={createClub} className="space-y-4 rounded-lg border bg-card p-5">
              <h2 className="font-display text-xl">Un nuovo posto per leggere insieme</h2>
              <p className="text-xs text-muted-foreground">
                Il club, le iscrizioni e i messaggi sono visibili agli altri lettori di Silvae. Puoi
                gestire il libro del momento e moderare le discussioni.
              </p>
              <label className="grid gap-2 text-sm">
                Nome del club
                <input
                  required
                  minLength={3}
                  maxLength={80}
                  className={input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm">
                Di cosa parlerete?
                <textarea
                  maxLength={2000}
                  rows={3}
                  className={input}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <button disabled={busy} className="button-ink">
                {busy ? "Creazione…" : "Crea club pubblico"}
              </button>
            </form>
          )}
          {clubs.isPending && <p role="status">Caricamento club…</p>}
          {clubs.isSuccess && !clubs.data.pages.flat().filter((c) => !mine || c.joined).length && (
            <p className="editorial-empty">
              {mine
                ? "Non sei ancora iscritto a un club. Esplora quelli disponibili o creane uno."
                : "Nessun club trovato. Puoi creare il primo spazio di lettura."}
            </p>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {clubs.data?.pages
              .flat()
              .filter((c) => !mine || c.joined)
              .map((c) => (
                <article key={c.id} className="rounded-xl border bg-card p-5">
                  <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Users size={15} />
                    {c.members} {c.members === 1 ? "lettore" : "lettori"}
                    {c.joined && <span className="ml-auto text-primary">Iscritto</span>}
                  </div>
                  <h2 className="font-display text-2xl">
                    <Link to="/clubs" search={{ club: c.id }}>
                      {c.name}
                    </Link>
                  </h2>
                  <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                    {c.description}
                  </p>
                  {c.book && (
                    <p className="mt-4 text-sm">
                      Insieme leggiamo <span className="font-medium">{c.book.title}</span>
                    </p>
                  )}
                  <Link
                    to="/clubs"
                    search={{ club: c.id }}
                    className="mt-5 inline-block text-sm text-primary"
                  >
                    Entra nel club →
                  </Link>
                </article>
              ))}
          </div>
          {clubs.hasNextPage && (
            <button
              className="button-outline"
              disabled={clubs.isFetchingNextPage}
              onClick={() => void clubs.fetchNextPage()}
            >
              Altri club
            </button>
          )}
        </>
      ) : (
        <>
          <button
            className="button-outline"
            onClick={() => {
              onOpen();
              setManaging(false);
            }}
          >
            <ArrowLeft size={14} />
            Tutti i club
          </button>
          {detail.isPending && <p role="status">Caricamento club…</p>}
          {detail.isSuccess && !club && (
            <p className="editorial-empty">Questo club non è più disponibile.</p>
          )}
          {club && (
            <>
              <header className="space-y-3 border-b pb-6">
                <p className="eyebrow">Club pubblico · {club.members} lettori</p>
                <h2 className="font-display text-3xl">{club.name}</h2>
                <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {club.description}
                </p>
                <div className="flex flex-wrap gap-3">
                  {!owner && (
                    <button
                      className={club.joined ? "button-outline" : "button-ink"}
                      disabled={busy}
                      onClick={() => void run(() => joinClub(user.id, club.id, club.joined))}
                    >
                      {club.joined ? "Lascia il club" : "Iscriviti al club"}
                    </button>
                  )}
                  {owner && (
                    <button className="button-outline" onClick={() => setManaging((v) => !v)}>
                      Gestisci il club
                    </button>
                  )}
                </div>
              </header>
              {owner && managing && (
                <div className="space-y-5 rounded-lg border bg-card p-5">
                  <ClubDetailsEditor
                    club={club}
                    busy={busy}
                    onSave={(values) =>
                      run(async () => {
                        const { error } = await supabase
                          .from("book_clubs")
                          .update(values)
                          .eq("id", club.id)
                          .select("id")
                          .single();
                        if (error) throw error;
                        toast.success("Club aggiornato");
                      })
                    }
                  />
                  <h3 className="font-display text-lg">Scegli il libro del momento</h3>
                  <ClubBookPicker onSelect={selectBook} disabled={busy} />
                  <ConfirmRemove
                    label="Elimina questo club e tutte le discussioni"
                    busy={busy}
                    onRemove={() =>
                      run(async () => {
                        const { error } = await supabase
                          .from("book_clubs")
                          .delete()
                          .eq("id", club.id);
                        if (error) throw error;
                        onOpen();
                      })
                    }
                  />
                  {club.current_book_id && (
                    <button
                      disabled={busy}
                      className="button-outline"
                      onClick={() =>
                        void run(async () => {
                          const { error } = await supabase
                            .from("book_clubs")
                            .update({ current_book_id: null })
                            .eq("id", club.id);
                          if (error) throw error;
                        })
                      }
                    >
                      Rimuovi la lettura corrente
                    </button>
                  )}
                </div>
              )}
              {club.book ? (
                <div className="flex items-center gap-5 rounded-xl border bg-card p-5">
                  <Link
                    to="/book/$bookId"
                    params={{ bookId: club.book.id }}
                    className="w-16 shrink-0"
                  >
                    <BookCover
                      book={{
                        ...club.book,
                        published_year: null,
                        page_count: null,
                        categories: [],
                        description: null,
                      }}
                    />
                  </Link>
                  <div>
                    <p className="eyebrow">La lettura del momento</p>
                    <Link
                      to="/book/$bookId"
                      params={{ bookId: club.book.id }}
                      className="mt-2 block font-display text-xl"
                    >
                      {club.book.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {club.book.authors.join(", ")}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Il club non ha ancora scelto la prossima lettura.
                </p>
              )}
              {!topicId ? (
                <>
                  <h3 className="font-display text-2xl">Discussioni</h3>
                  {club.joined ? (
                    <form
                      className="space-y-3 rounded-lg border p-4"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const ok = await run(async () => {
                          const { error } = await supabase.from("club_topics").insert({
                            club_id: club.id,
                            author_id: user.id,
                            book_id: club.current_book_id,
                            title: title.trim(),
                            body: body.trim(),
                            spoiler,
                          });
                          if (error) throw error;
                        });
                        if (ok) {
                          setTitle("");
                          setBody("");
                          setSpoiler(false);
                        }
                      }}
                    >
                      <label className="grid gap-2 text-sm">
                        Apri una discussione
                        <input
                          className={input}
                          placeholder="Di cosa vuoi parlare?"
                          required
                          minLength={3}
                          maxLength={160}
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                        />
                      </label>
                      <textarea
                        aria-label="Testo della discussione"
                        className={input}
                        required
                        maxLength={6000}
                        rows={3}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                      />
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={spoiler}
                          onChange={(e) => setSpoiler(e.target.checked)}
                        />
                        Contiene spoiler: titolo e testo saranno nascosti fino alla conferma
                      </label>
                      <button
                        disabled={busy || !body.trim() || title.trim().length < 3}
                        className="button-ink"
                      >
                        Pubblica discussione
                      </button>
                    </form>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Iscriviti al club per aprire discussioni e rispondere.
                    </p>
                  )}
                  {topics.isPending && <p role="status">Caricamento discussioni…</p>}
                  {topics.isSuccess && !topics.data.pages.flat().length && (
                    <p className="editorial-empty">
                      La conversazione comincia qui. Apri la prima discussione.
                    </p>
                  )}
                  <div className="divide-y">
                    {topics.data?.pages.flat().map((t) => (
                      <article key={t.id} className="py-5">
                        <p className="mb-2 text-xs text-muted-foreground">
                          {t.author ? profileLabel(t.author) : "Lettore"} ·{" "}
                          {new Date(t.created_at).toLocaleDateString("it-IT")}
                          {t.book ? ` · ${t.book.title}` : ""}
                        </p>
                        <Link
                          to="/clubs"
                          search={{ club: club.id, topic: t.id }}
                          className="font-display text-xl"
                        >
                          {t.spoiler ? "Discussione con spoiler — apri per leggere" : t.title}
                        </Link>
                        <span className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <MessageCircle size={13} />
                          Entra nella discussione
                        </span>
                      </article>
                    ))}
                  </div>
                  {topics.hasNextPage && (
                    <button
                      className="button-outline"
                      disabled={topics.isFetchingNextPage}
                      onClick={() => void topics.fetchNextPage()}
                    >
                      Altre discussioni
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button className="button-outline" onClick={() => onOpen(club.id)}>
                    <ArrowLeft size={14} />
                    Discussioni del club
                  </button>
                  {selectedTopic.isPending && <p role="status">Caricamento discussione…</p>}
                  {selectedTopic.isSuccess && !selectedTopic.data && (
                    <p className="editorial-empty">Discussione non disponibile.</p>
                  )}
                  {selectedTopic.data &&
                    (selectedTopic.data.spoiler && !revealed.includes(topicId) ? (
                      <div className="rounded-lg border p-5">
                        <p>Questa discussione e le risposte possono contenere spoiler.</p>
                        <button
                          className="button-outline mt-4"
                          onClick={() => setRevealed((v) => [...v, topicId])}
                        >
                          Mostra discussione
                        </button>
                      </div>
                    ) : (
                      <>
                        <article className="rounded-lg border bg-card p-5">
                          <h3 className="font-display text-2xl">{selectedTopic.data.title}</h3>
                          {selectedTopic.data.book && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {selectedTopic.data.book.title}
                            </p>
                          )}
                          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {selectedTopic.data.body}
                          </p>
                          {(owner || selectedTopic.data.author_id === user.id) && (
                            <ConfirmRemove
                              label="Rimuovi discussione"
                              busy={busy}
                              onRemove={() =>
                                run(async () => {
                                  const { error } = await supabase
                                    .from("club_topics")
                                    .delete()
                                    .eq("id", topicId);
                                  if (error) throw error;
                                  onOpen(club.id);
                                })
                              }
                            />
                          )}
                        </article>
                        {replies.isError && (
                          <p role="alert">
                            Risposte non disponibili.{" "}
                            <button className="underline" onClick={() => void replies.refetch()}>
                              Riprova
                            </button>
                          </p>
                        )}
                        {replies.isPending && <p role="status">Caricamento risposte…</p>}
                        <div className="divide-y">
                          {replies.data?.pages.flat().map((m) => (
                            <article key={m.id} className="py-4">
                              <Link
                                to="/u/$username"
                                params={{ username: m.author?.username ?? "" }}
                                className="text-xs text-muted-foreground"
                              >
                                {m.author ? profileLabel(m.author) : "Lettore"}
                              </Link>
                              <span className="ml-2 text-xs text-muted-foreground">
                                {new Date(m.created_at).toLocaleString("it-IT")}
                              </span>
                              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                                {m.body}
                              </p>
                              {(owner || m.author_id === user.id) && (
                                <ConfirmRemove
                                  busy={busy}
                                  label="Rimuovi risposta"
                                  onRemove={() =>
                                    run(async () => {
                                      const { error } = await supabase
                                        .from("club_messages")
                                        .delete()
                                        .eq("id", m.id);
                                      if (error) throw error;
                                    })
                                  }
                                />
                              )}
                            </article>
                          ))}
                        </div>
                        {replies.hasNextPage && (
                          <button
                            className="button-outline"
                            disabled={replies.isFetchingNextPage}
                            onClick={() => void replies.fetchNextPage()}
                          >
                            Altre risposte
                          </button>
                        )}
                        {club.joined && (
                          <form
                            className="space-y-3"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const ok = await run(async () => {
                                const { error } = await supabase.from("club_messages").insert({
                                  topic_id: topicId,
                                  author_id: user.id,
                                  body: message.trim(),
                                });
                                if (error) throw error;
                              });
                              if (ok) setMessage("");
                            }}
                          >
                            <label className="grid gap-2 text-sm">
                              La tua risposta
                              <textarea
                                className={input}
                                required
                                maxLength={6000}
                                rows={3}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                              />
                            </label>
                            <button disabled={busy || !message.trim()} className="button-ink">
                              Invia risposta
                            </button>
                          </form>
                        )}
                      </>
                    ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
function ClubDetailsEditor({
  club,
  busy,
  onSave,
}: {
  club: Club;
  busy: boolean;
  onSave: (values: { name: string; description: string }) => Promise<boolean>;
}) {
  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ name: name.trim(), description: description.trim() });
      }}
    >
      <label className="grid gap-2 text-sm">
        Nome
        <input
          className={input}
          value={name}
          required
          minLength={3}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm">
        Descrizione
        <textarea
          className={input}
          value={description}
          maxLength={2000}
          rows={3}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <button disabled={busy} className="button-outline">
        Salva dettagli
      </button>
    </form>
  );
}
function ConfirmRemove({
  label,
  busy,
  onRemove,
}: {
  label: string;
  busy: boolean;
  onRemove: () => Promise<boolean>;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
      {confirm ? (
        <>
          <span>Confermi la rimozione? Non può essere annullata.</span>
          <button
            type="button"
            disabled={busy}
            className="text-destructive underline"
            onClick={() => void onRemove()}
          >
            Conferma
          </button>
          <button type="button" onClick={() => setConfirm(false)}>
            Annulla
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="text-muted-foreground underline"
        >
          {label}
        </button>
      )}
    </div>
  );
}
