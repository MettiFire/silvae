import type { SupabaseClient } from "@supabase/supabase-js";
import type { KindleBookReading, KindleObservation } from "./kindle-cloud.ts";

type Snapshot = {
  id: string;
  book_id: string;
  status: string;
  started_at: string | null;
  updated_at: string;
  progress_updated_at: string | null;
  reading_session_id: string;
};
export function kindleObservation(reading: KindleBookReading): KindleObservation {
  return {
    position: reading.position,
    updatedAt: reading.updatedAt,
    checkedAt: reading.checkedAt,
    status: reading.status,
    version: reading.contentVersion?.guid,
    percentage: reading.percentage,
  };
}
/** Amazon creationTime may stay fixed forever. A same-version forward movement
 * is evidence observed now, only when the baseline predates no local edit. */
export function kindleReadingEventTime(
  reading: KindleBookReading,
  after: number,
  previous?: KindleObservation,
) {
  if (reading.status !== "available" || !reading.position || !Number.isFinite(after)) return;
  if (reading.updatedAt && reading.updatedAt > after && reading.updatedAt <= Date.now() + 300_000)
    return reading.updatedAt;
  if (
    previous?.status === "available" &&
    previous.checkedAt &&
    previous.checkedAt >= after &&
    previous.checkedAt < reading.checkedAt &&
    reading.checkedAt <= Date.now() + 300_000 &&
    previous.version &&
    previous.version === reading.contentVersion?.guid &&
    typeof previous.position === "number" &&
    reading.position > previous.position
  )
    return reading.checkedAt;
  return undefined;
}
export function kindleStatusPatch(
  item: Snapshot,
  reading: KindleBookReading,
  previous?: KindleObservation,
) {
  if (item.status === "read" || item.status === "abandoned") return null;
  const observed = kindleReadingEventTime(
    reading,
    Date.parse(item.progress_updated_at ?? item.updated_at),
    previous,
  );
  if (!observed) return null;
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
    started_at: item.started_at ?? new Date(observed).toISOString(),
    progress_source: "kindle",
    progress_updated_at: new Date(observed).toISOString(),
    updated_at: new Date().toISOString(),
    ...(percentage === undefined ? {} : { progress_percent: percentage }),
    ...(percentage === 100 ? { finished_at: new Date(observed).toISOString() } : {}),
  };
}
export async function applyKindleStatus(
  db: SupabaseClient,
  owner: string,
  item: Snapshot,
  reading: KindleBookReading,
  previous?: KindleObservation,
) {
  const patch = kindleStatusPatch(item, reading, previous);
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
