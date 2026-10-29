import type { Database } from "@/integrations/supabase/types";
export type ReaderConnection = Database["public"]["Tables"]["reader_connections"]["Row"];
export type ReaderDocument = Database["public"]["Tables"]["reader_documents"]["Row"];
export type ReaderKind = "kindle" | "kobo" | "koreader";
export const READER_KINDS: Record<ReaderKind, { title: string; description: string }> = {
  kindle: {
    title: "Kindle · USB",
    description:
      "Sottolineature dai libri acquistati e caricati presenti in My Clippings. Richiede il computer; percentuale di lettura non disponibile.",
  },
  kobo: {
    title: "Kobo · USB",
    description:
      "Percentuale e annotazioni dai libri acquistati e caricati. Richiede il computer e il database del lettore accessibile via USB.",
  },
  koreader: {
    title: "KOReader · Wi-Fi",
    description:
      "Invia il progresso direttamente dal lettore. Richiede KOReader già installato; non è il collegamento dell’account Amazon o Kobo. Non trasferisce le sottolineature.",
  },
};
export const READER_RESULTS: Record<string, string> = {
  unmapped: "Da associare",
  applied: "Progresso aggiornato",
  annotations_only: "Annotazioni ricevute",
  duplicate: "Già aggiornato",
  stale: "Progresso precedente ignorato",
  old_session: "Rilettura: conferma la nuova associazione",
  manual_conflict: "Conferma richiesta dopo una modifica manuale",
  missing_time: "Data di lettura non disponibile",
  missing_library: "Libro rimosso dalla libreria",
};
export function readerError(e: unknown) {
  const error = e as { code?: string; message?: string };
  if (["42P01", "42703", "PGRST202", "PGRST205"].includes(error?.code ?? ""))
    return "Dispositivi non ancora attivi: applica la migrazione del database indicata nelle istruzioni del progetto.";
  return error?.message ?? "Collegamento non riuscito. Riprova.";
}
