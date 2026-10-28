import type { SupabaseClient } from "@supabase/supabase-js";
import type { KindleBookReading } from "./kindle-cloud.ts";

type Snapshot = {
  id: string;
  book_id: string;
  status: string;
  started_at: string | null;
  updated_at: string;
  progress_updated_at: string | null;
  reading_session_id: string;
};
export function kindleStatusPatch(item: Snapshot, reading: KindleBookReading) {
  if (item.status === "read" || item.status === "abandoned") return null;
  if (
    reading.status !== "available" ||
    !reading.position ||
    !reading.updatedAt ||
    reading.updatedAt > Date.now() + 300_000
  )
    return null;
  if (Date.parse(item.progress_updated_at ?? item.updated_at) >= reading.updatedAt) return null;
  const percentage =
    typeof reading.percentage === "number" &&
    Number.isFinite(reading.percentage) &&
    reading.percentage >= 0 &&
    reading.percentage <= 100
      ? reading.percentage
      : undefined;
  // Raw Kindle locations cannot be converted to pages or percentages without a total.
  return {
    status: percentage === 100 ? "read" : "reading",
    started_at: item.started_at ?? new Date(reading.updatedAt).toISOString(),
    progress_source: "kindle",
    progress_updated_at: new Date(reading.updatedAt).toISOString(),
    updated_at: new Date().toISOString(),
    ...(percentage === undefined ? {} : { progress_percent: percentage }),
    ...(percentage === 100 ? { finished_at: new Date(reading.updatedAt).toISOString() } : {}),
  };
}
export async function applyKindleStatus(
  db: SupabaseClient,
  owner: string,
  item: Snapshot,
  reading: KindleBookReading,
) {
  const patch = kindleStatusPatch(item, reading);
  if (!patch)
    return "Stato conservato: il libro è già letto, i dati manuali sono più recenti oppure manca una posizione datata valida.";
  const result = await db
    .from("library_items")
    .update(patch)
    .eq("user_id", owner)
    .eq("id", item.id)
    .eq("reading_session_id", item.reading_session_id)
    .eq("updated_at", item.updated_at)
    .select("id")
    .maybeSingle();
  if (result.error) throw Error("Collegamento Kindle: aggiornamento libreria non riuscito.");
  return result.data
    ? reading.percentage !== undefined
      ? "Libreria aggiornata con l’avanzamento Kindle verificato."
      : "Libreria aggiornata: libro in lettura. La percentuale non è stata modificata."
    : "La libreria è cambiata durante la verifica: aggiornamento ignorato. Riprova.";
}
