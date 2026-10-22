import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { BookCover } from "./BookCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { cacheBook, searchBooks, type Book } from "@/lib/books";
import { requireFragmentUser } from "@/lib/fragments";
export function ListBookPicker({
  listId,
  existing,
  close,
}: {
  listId: string;
  existing: string[];
  close: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const library = useLibrary(user?.id);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [error, setError] = useState("");
  const results = useQuery({
    queryKey: ["list-add-search", search],
    enabled: !!search,
    queryFn: () => searchBooks(search, { max: 12 }),
    staleTime: 300000,
  });
  const books = search
    ? (results.data ?? [])
    : (library.data ?? [])
        .flatMap((i) => (i.books ? [i.books] : []))
        .filter((b) =>
          (b.title + " " + b.authors.join(" ")).toLowerCase().includes(term.toLowerCase()),
        )
        .slice(0, 30);
  async function add(book: Book) {
    if (!user || busy) return;
    setBusy(book.id);
    setError("");
    try {
      await requireFragmentUser(supabase, user.id);
      await cacheBook(book);
      const { error } = await supabase
        .from("list_items")
        .upsert(
          { list_id: listId, book_id: book.id },
          { onConflict: "list_id,book_id", ignoreDuplicates: true },
        );
      if (error) throw error;
      setAdded((old) => [...old, book.id]);
      await qc.invalidateQueries({ queryKey: ["list-books", listId] });
      await qc.invalidateQueries({ queryKey: ["profile-lists"] });
      await qc.invalidateQueries({ queryKey: ["list-membership"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) close();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aggiungi libri alla lista</DialogTitle>
          <DialogDescription>
            Scegli dalla tua libreria oppure cerca nel catalogo.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(term.trim());
          }}
        >
          <input
            aria-label="Cerca libri per la lista"
            placeholder="Titolo o autore"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              if (!e.target.value.trim()) setSearch("");
            }}
            className="min-w-0 flex-1 rounded border bg-background px-3 py-2 text-sm"
          />
          <button disabled={term.trim().length < 3} className="button-outline">
            Cerca catalogo
          </button>
        </form>
        {search && (
          <button
            className="text-left text-xs underline"
            onClick={() => {
              setSearch("");
              setTerm("");
            }}
          >
            ← Torna alla tua libreria
          </button>
        )}
        {(error || results.error || library.error) && (
          <p role="alert" className="text-sm text-destructive">
            {error || "Libri non disponibili. Riprova."}
          </p>
        )}
        {results.isFetching && (
          <p role="status" className="text-sm">
            Ricerca…
          </p>
        )}
        <div className="max-h-[50vh] overflow-y-auto">
          {!books.length && !results.isFetching && (
            <p className="editorial-empty">
              Nessun libro da mostrare. Prova a cercare nel catalogo.
            </p>
          )}
          {books.map((book) => {
            const done = existing.includes(book.id) || added.includes(book.id);
            return (
              <div key={book.id} className="flex items-center gap-3 border-b py-3">
                <div className="w-9 shrink-0">
                  <BookCover book={book} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{book.title}</p>
                  <p className="text-xs text-muted-foreground">{book.authors.join(", ")}</p>
                </div>
                <button
                  disabled={!!busy || done}
                  onClick={() => void add(book)}
                  className="text-xs text-primary"
                >
                  {done ? "Aggiunto" : busy === book.id ? "Aggiungo…" : "+ Aggiungi"}
                </button>
              </div>
            );
          })}
        </div>
        <button className="button-ink" disabled={!!busy} onClick={close}>
          Fatto
        </button>
      </DialogContent>
    </Dialog>
  );
}
