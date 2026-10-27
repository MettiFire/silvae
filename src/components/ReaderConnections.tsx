import { UiText, UiElement } from "@/lib/ui-language-context";
import { KindleCloudSetup } from "./KindleCloudSetup";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cable, Wifi, RefreshCw, Unplug, Download } from "lucide-react";
import { toast } from "@/lib/localized-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { requireFragmentUser } from "@/lib/fragments";
import {
  READER_KINDS,
  READER_RESULTS,
  newReaderSecret,
  readerConfiguration,
  readerError,
  type ReaderKind,
  type ReaderConnection,
  type ReaderDocument,
} from "@/lib/reader-connections";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
const input = "rounded-lg border border-input bg-background px-3 py-2 text-sm";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50";
export function ReaderStatus({ connection: c }: { connection: ReaderConnection }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-accent p-3">
        {c.mode === "wifi" ? <Wifi className="h-5 w-5" /> : <Cable className="h-5 w-5" />}
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold">{c.name}</h3>
        <p className="text-sm text-muted-foreground">
          {READER_KINDS[c.kind as ReaderKind]?.title} ·{" "}
          <UiText
            text={
              c.revoked_at
                ? "Disconnesso"
                : c.last_received_at
                  ? "Dati ricevuti"
                  : "In attesa del lettore"
            }
          />
        </p>
        <p className="text-xs text-muted-foreground">
          <UiText
            text={
              c.last_received_at
                ? `Ultima ricezione: ${new Date(c.last_received_at).toLocaleString("it-IT")}`
                : "Nessun dato ricevuto. La creazione del collegamento non significa che il lettore sia connesso."
            }
          />
        </p>
      </div>
    </div>
  );
}
export function ReaderConnections() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: library = [] } = useLibrary(user?.id);
  const [kind, setKind] = useState<ReaderKind>("kindle");
  const [name, setName] = useState("Il mio Kindle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [setup, setSetup] = useState<{ id: string; kind: ReaderKind; secret: string } | null>(null);
  const [revoke, setRevoke] = useState<ReaderConnection | null>(null);
  const connections = useQuery({
    queryKey: ["reader-connections", user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reader_connections")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const documents = useQuery({
    queryKey: ["reader-documents", user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reader_documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("last_received_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });
  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["reader-connections"] }),
      qc.invalidateQueries({ queryKey: ["reader-documents"] }),
      qc.invalidateQueries({ queryKey: ["library"] }),
      qc.invalidateQueries({ queryKey: ["fragments"] }),
      qc.invalidateQueries({ queryKey: ["fragment-books"] }),
    ]);
  }
  async function action(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await requireFragmentUser(supabase, user!.id);
      await fn();
      await refresh();
    } catch (e) {
      setError(readerError(e));
    } finally {
      setBusy(false);
    }
  }
  function downloadConfig() {
    if (!setup) return;
    const config = readerConfiguration(
      setup.id,
      setup.kind,
      setup.secret,
      import.meta.env["VITE_SUPABASE_URL"],
      import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
    );
    const a = document.createElement("a");
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(config, null, 2)], { type: "application/json" }),
    );
    a.href = url;
    a.download = "silvae-device.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-8">
      <KindleCloudSetup key={user?.id} owner={user?.id ?? ""} />
      <p className="max-w-3xl text-sm text-muted-foreground">
        <UiText text="Collega il lettore per ricevere i dati nel tuo account. Non chiediamo password Amazon o Kobo. Ogni collegamento ha una chiave personale che puoi revocare." />
      </p>
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-4 font-display text-xl font-bold">
          <UiText text="Collega un dispositivo" />
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(READER_KINDS) as ReaderKind[]).map((k) => (
            <button
              key={k}
              disabled={busy}
              aria-pressed={kind === k}
              onClick={() => {
                setKind(k);
                setName(
                  k === "kindle"
                    ? "Il mio Kindle"
                    : k === "kobo"
                      ? "Il mio Kobo"
                      : "Il mio KOReader",
                );
              }}
              className={`rounded-xl border p-4 text-left ${kind === k ? "border-primary bg-accent" : "border-border"}`}
            >
              <span className="font-semibold">{READER_KINDS[k].title}</span>
              <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                {READER_KINDS[k].description}
              </span>
            </button>
          ))}
        </div>
        <form
          className="mt-5 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              const secret = newReaderSecret();
              const { data, error } = await supabase.rpc("create_reader_connection", {
                p_name: name.trim(),
                p_kind: kind,
                p_secret: secret,
              });
              if (error) throw error;
              setSetup({ id: data, kind, secret });
            });
          }}
        >
          <label className="grid gap-1 text-sm">
            <UiText text="Nome del dispositivo" />
            <input
              className={input}
              maxLength={80}
              required
              value={name}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button className={button} disabled={busy || !name.trim() || !!setup}>
            <UiText text="Crea collegamento" />
          </button>
        </form>
      </section>
      {setup && (
        <ReaderSetup setup={setup} downloadConfig={downloadConfig} close={() => setSetup(null)} />
      )}
      {(error || connections.error || documents.error) && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive"
        >
          {error || readerError(connections.error || documents.error)}
        </p>
      )}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">
            <UiText text="I tuoi dispositivi" />
          </h2>
          <UiElement
            as="button"
            disabled={busy}
            aria-label="Aggiorna dispositivi"
            onClick={() => void refresh()}
          >
            <RefreshCw className="h-4 w-4" />
          </UiElement>
        </div>
        {connections.isLoading && (
          <p>
            <UiText text="Caricamento…" />
          </p>
        )}
        {connections.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            <UiText text="Non hai ancora collegato un lettore." />
          </p>
        )}
        {connections.data?.map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
          >
            <ReaderStatus connection={c} />
            {!c.revoked_at && (
              <button
                disabled={busy}
                className="inline-flex items-center gap-2 text-sm"
                onClick={() => setRevoke(c)}
              >
                <Unplug className="h-4 w-4" />
                <UiText text="Disconnetti" />
              </button>
            )}
          </div>
        ))}
      </section>
      <ReaderDocuments
        documents={documents.data ?? []}
        connections={connections.data ?? []}
        books={library
          .filter((i) => i.books)
          .map((i) => ({ id: i.book_id, title: i.books!.title, authors: i.books!.authors }))}
        busy={busy}
        bind={(document, book) =>
          void action(async () => {
            const { data, error } = await supabase.rpc("bind_reader_document", {
              p_document: document,
              p_book: book,
            });
            if (error) throw error;
            toast.success(READER_RESULTS[data] ?? "Associazione salvata");
          })
        }
      />
      {revoke && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setRevoke(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                <UiText text="Disconnettere " />
                {revoke.name}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                <UiText text="La chiave smetterà subito di funzionare. Libri e frammenti già ricevuti rimangono nel tuo account. Per riconnetterlo creerai una nuova configurazione." />
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                <UiText text="Annulla" />
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  void action(async () => {
                    const { error } = await supabase.rpc("revoke_reader_connection", {
                      p_connection: revoke.id,
                    });
                    if (error) throw error;
                    if (setup?.id === revoke.id) setSetup(null);
                    setRevoke(null);
                  })
                }
              >
                <UiText text="Disconnetti" />
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
export function ReaderDocuments({
  documents,
  connections,
  books,
  busy,
  bind,
}: {
  documents: ReaderDocument[];
  connections: ReaderConnection[];
  books: { id: string; title: string; authors: string[] }[];
  busy: boolean;
  bind: (document: string, book: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const matches = documents.filter((d) =>
    (d.title + " " + d.authors.join(" ") + " " + d.external_id)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold">
        <UiText text="Libri ricevuti dal lettore" />
      </h2>
      <p className="text-sm text-muted-foreground">
        <UiText text="Associa il documento alla tua edizione in libreria. Non abbiniamo automaticamente dal solo titolo. Mostriamo i 500 documenti ricevuti più di recente." />
      </p>
      <UiElement
        as="input"
        className={input}
        aria-label="Cerca documenti del lettore"
        placeholder="Cerca un documento…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
      />
      {matches.length === 0 && (
        <p className="text-sm text-muted-foreground">
          <UiText text="I documenti compariranno dopo il primo invio dal lettore." />
        </p>
      )}
      {matches.slice(page * 10, page * 10 + 10).map((d) => {
        const c = connections.find((c) => c.id === d.connection_id);
        return (
          <article key={d.id} className="space-y-3 rounded-xl border p-4">
            <div>
              <h3 className="font-semibold">{d.title || "Documento senza titolo"}</h3>
              <p className="text-xs text-muted-foreground">
                {d.authors.join(", ")} · {c?.name} · {READER_RESULTS[d.result] ?? d.result}
              </p>
              <p className="break-all text-xs text-muted-foreground">
                <UiText text="ID: " />
                {d.external_id}
              </p>
              {d.progress_payload &&
                typeof d.progress_payload === "object" &&
                !Array.isArray(d.progress_payload) &&
                typeof d.progress_payload["percentage"] === "number" && (
                  <p className="mt-1 text-sm">
                    <UiText text="Progresso dal lettore: " />
                    {d.progress_payload["percentage"]}%
                  </p>
                )}
            </div>
            {d.book_id ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  className="text-sm text-primary underline"
                  to="/book/$bookId"
                  params={{ bookId: d.book_id }}
                >
                  <UiText text="Apri libro" />
                </Link>
                {["old_session", "manual_conflict"].includes(d.result) && !c?.revoked_at && (
                  <button className={button} disabled={busy} onClick={() => bind(d.id, d.book_id!)}>
                    <UiText
                      text={
                        d.result === "manual_conflict"
                          ? "Usa questo progresso del lettore"
                          : "Associa alla lettura attuale"
                      }
                    />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <UiElement
                  as="select"
                  className={`${input} max-w-full`}
                  aria-label={`Libro per ${d.title || d.external_id}`}
                  disabled={busy || !!c?.revoked_at}
                  value={selected[d.id] ?? ""}
                  onChange={(e) => setSelected({ ...selected, [d.id]: e.target.value })}
                >
                  <option value="">
                    <UiText text="Scegli nella tua libreria" />
                  </option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} · {b.authors.join(", ")}
                    </option>
                  ))}
                </UiElement>
                <button
                  className={button}
                  disabled={busy || !selected[d.id] || !!c?.revoked_at}
                  onClick={() => bind(d.id, selected[d.id]!)}
                >
                  <UiText text="Associa e sincronizza" />
                </button>
              </div>
            )}
          </article>
        );
      })}
      {matches.length > 10 && (
        <div className="flex gap-4 text-sm">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            <UiText text="Precedenti" />
          </button>
          <span>
            {page + 1} / {Math.ceil(matches.length / 10)}
          </span>
          <button disabled={(page + 1) * 10 >= matches.length} onClick={() => setPage(page + 1)}>
            <UiText text="Successivi" />
          </button>
        </div>
      )}
    </section>
  );
}

export function ReaderSetup({
  setup,
  downloadConfig,
  close,
}: {
  setup: { id: string; kind: ReaderKind; secret: string };
  downloadConfig: () => void;
  close: () => void;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-primary/40 bg-card p-5">
      <h2 className="font-display text-xl font-bold">
        <UiText text="Configura " />
        {READER_KINDS[setup.kind].title}
      </h2>
      <p className="text-sm">
        <UiText text="La chiave è mostrata solo adesso. Conserva la configurazione sul tuo computer: autorizza l’invio dei dati a questo account. Se la perdi, disconnetti il dispositivo e creane uno nuovo." />
      </p>
      {setup.kind === "koreader" ? (
        <>
          <ol className="list-inside list-decimal space-y-3 text-sm">
            <li>
              <UiText text="Apri un libro in KOReader → Impostazioni → Sincronizza progresso → Server personalizzato." />
            </li>
            <li>
              <UiText text="Inserisci questo server:" />{" "}
              <code className="block break-all rounded bg-accent p-2">
                {import.meta.env["VITE_SUPABASE_URL"]}
                <UiText text="/functions/v1/reader-sync" />
              </code>
            </li>
            <li>
              <UiText text="Scegli " />
              <strong>
                <UiText text="Login" />
              </strong>
              <UiText text=" (non Registrati). Username:" />{" "}
              <code className="block break-all bg-accent p-2">{setup.id}</code>
              <UiText text="Password dedicata:" />{" "}
              <code className="block break-all bg-accent p-2">{setup.secret}</code>
            </li>
            <li>
              <UiText text="Attiva la sincronizzazione automatica e, se desideri, l’invio dei metadati. Invia il primo progresso e associa il documento qui sotto." />
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            <UiText text="Serve il servizio reader-sync attivo sul server. KOReader invia la posizione e la percentuale, senza la data dell’ultima lettura: usiamo l’ora di ricezione. Il collegamento non invia le modifiche manuali dell’app al lettore e non imposta automaticamente “Letto”." />
          </p>
        </>
      ) : (
        <>
          <ol className="list-inside list-decimal space-y-3 text-sm">
            <li>
              <UiText text="Scarica nella stessa cartella la configurazione e il programma ponte. Serve Python 3.10 o successivo." />
            </li>
            <li>
              <UiText text="Collega " />
              <UiText text={setup.kind === "kindle" ? "il Kindle" : "il Kobo"} />
              <UiText text=" via USB e consenti l’accesso ai file." />
            </li>
            <li>
              <UiText text="Avvia il comando sostituendo il percorso con quello del tuo lettore:" />
              <code className="mt-2 block overflow-x-auto rounded bg-accent p-3">
                <UiText text="python3 reader-bridge.py --config silvae-device.json --path" />{" "}
                {setup.kind === "kindle" ? "/Volumes/Kindle" : "/Volumes/KOBOeReader"}
              </code>
            </li>
            <li>
              <UiText text="Lascia aperto il programma: controlla ogni minuto e invia le novità quando ricolleghi il lettore. Associa una volta i libri ricevuti qui sotto." />
            </li>
          </ol>
          <div className="flex flex-wrap gap-3">
            <button className={button} onClick={downloadConfig}>
              <Download className="h-4 w-4" />
              <UiText text="Scarica configurazione" />
            </button>
            <a
              className="rounded-lg border px-4 py-2 text-sm"
              href="/downloads/reader-bridge.py"
              download
            >
              <UiText text="Scarica programma ponte" />
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            <UiText
              text={
                setup.kind === "kindle"
                  ? "Kindle 11ª generazione: il ponte legge documents/My Clippings.txt, senza modificare il lettore. Trasferisce evidenziazioni disponibili nel file; note e segnalibri non vengono importati. Non legge la percentuale e non funziona con il solo Wi-Fi."
                  : "Il ponte legge una copia coerente del database Kobo, compresi libri acquistati e caricati. Il lettore non viene modificato. Le percentuali senza data valida non vengono inviate."
              }
            />{" "}
            <UiText text="Se il dispositivo non appare come disco USB, usa l’importazione dei file in Frammenti." />
          </p>
        </>
      )}
      <button className="text-sm font-medium underline" onClick={close}>
        <UiText text="Ho conservato la configurazione · chiudi" />
      </button>
    </section>
  );
}
