import type { Database } from "../integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
export type Fragment = Database["public"]["Tables"]["fragments"]["Row"];
export type FragmentSource =
  "manual" | "kindle" | "kobo" | "bookshelf" | "csv" | "readwise" | "koreader";
export const FRAGMENT_SOURCES: Record<FragmentSource, string> = {
  manual: "Manuale",
  kindle: "Kindle",
  kobo: "Kobo",
  bookshelf: "Bookshelf",
  csv: "CSV",
  readwise: "Readwise",
  koreader: "KOReader",
};
export type FragmentDraft = {
  kind: "quote" | "note";
  quote: string;
  note: string;
  position: string;
  tags: string[];
  favorite: boolean;
};
export function validateFragment(draft: FragmentDraft): FragmentDraft {
  const quote = draft.quote.trim();
  if (!quote || quote.length > 20000)
    throw new Error("Inserisci un testo da 1 a 20.000 caratteri.");
  if (draft.note.length > 10000 || draft.position.length > 300)
    throw new Error("La nota o la posizione è troppo lunga.");
  const tags = [...new Set(draft.tags.map((t) => t.trim()).filter(Boolean))];
  if (tags.length > 20 || tags.some((t) => t.length > 50))
    throw new Error("Usa fino a 20 tag di massimo 50 caratteri.");
  return {
    kind: draft.kind === "note" ? "note" : "quote",
    quote,
    note: draft.note.trim(),
    position: draft.position.trim(),
    tags,
    favorite: !!draft.favorite,
  };
}
export async function fragmentKey(
  bookId: string,
  source: FragmentSource,
  reference: string | null,
  text: string,
  position: string,
) {
  const input = JSON.stringify([
    bookId,
    source,
    reference || null,
    reference ? null : text.normalize("NFC").replace(/\s+/g, " ").trim(),
    reference ? null : position.trim(),
  ]);
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, "0")).join("");
}
export async function requireFragmentUser(client: SupabaseClient<Database>, expected: string) {
  const { data, error } = await client.auth.getUser();
  if (error || data.user?.id !== expected)
    throw new Error("La sessione è cambiata. Accedi di nuovo.");
  return expected;
}
export function fragmentError(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (["42P01", "PGRST205", "PGRST202", "42703"].includes(e?.code ?? ""))
    return "La funzione Frammenti non è ancora disponibile su questo ambiente.";
  return e?.message || "Operazione non riuscita. Riprova.";
}
export async function saveFragment(
  client: SupabaseClient<Database>,
  userId: string,
  bookId: string,
  draft: FragmentDraft,
  original?: Fragment,
) {
  await requireFragmentUser(client, userId);
  const valid = validateFragment(draft);
  if (original) {
    const { data, error } = await client
      .from("fragments")
      .update(valid)
      .eq("user_id", userId)
      .eq("id", original.id)
      .is("deleted_at", null)
      .select("id");
    if (error) throw error;
    if (!data?.length) throw new Error("Il frammento è stato rimosso o non è più disponibile.");
    return;
  }
  const ref = crypto.randomUUID();
  const key = await fragmentKey(bookId, "manual", ref, valid.quote, valid.position);
  const { error } = await client
    .from("fragments")
    .insert({
      ...valid,
      user_id: userId,
      book_id: bookId,
      source: "manual",
      source_ref: ref,
      dedupe_key: key,
    });
  if (error) throw error;
}
export async function moveFragmentToTrash(
  client: SupabaseClient<Database>,
  userId: string,
  id: string,
  restore = false,
) {
  await requireFragmentUser(client, userId);
  const { data, error } = await client
    .from("fragments")
    .update({ deleted_at: restore ? null : new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Frammento non disponibile.");
}
