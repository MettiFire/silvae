import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";
import { requireFragmentUser } from "./fragments.ts";
export function parseProgressPercent(value: string): number {
  const text = value.trim().replace(",", ".");
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(text)) throw Error("Inserisci una percentuale tra 0 e 100.");
  const percent = Number(text);
  if (percent < 0 || percent > 100) throw Error("Inserisci una percentuale tra 0 e 100.");
  return percent;
}
export function progressError(error: unknown): string {
  if (["PGRST202", "PGRST205", "42703", "42P01"].includes((error as { code?: string })?.code ?? ""))
    return "L’aggiornamento percentuale non è ancora disponibile su questo ambiente.";
  return (error as { message?: string })?.message ?? "Impossibile salvare il progresso. Riprova.";
}
export async function saveManualPercent(
  client: SupabaseClient<Database>,
  userId: string,
  bookId: string,
  session: string,
  percentage: number,
  finished: boolean,
) {
  await requireFragmentUser(client, userId);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)
    throw Error("Percentuale non valida.");
  if (!session) throw Error("Ricarica il libro prima di aggiornare la percentuale.");
  const { data, error } = await client.rpc("record_reading_progress", {
    p_book_id: bookId,
    p_percentage: finished ? 100 : percentage,
    p_session_id: session,
    p_source: "manual",
    p_observed_at: new Date().toISOString(),
    p_external_id: crypto.randomUUID(),
    p_finished: finished,
  });
  if (error) throw error;
  if (data === "old_session" || data === "stale")
    throw Error("La lettura è stata aggiornata altrove. Ricarica il libro prima di riprovare.");
  return data;
}
