import { zlibSync, unzlibSync, strToU8, strFromU8 } from "fflate";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";
import { isMangaId, MANGA_FIELD, parseMangaProgress, type MangaProgress } from "./manga-model.ts";
let previousRaw: unknown;
let previousState: Record<string, MangaProgress> = {};
export function decodeMangaProgress(raw: unknown): Record<string, MangaProgress> {
  if (raw === previousRaw) return previousState;
  previousRaw = raw;
  previousState = readState(raw);
  return previousState;
}
function readState(raw: unknown): Record<string, MangaProgress> {
  try {
    if (typeof raw !== "string" || !raw.startsWith("z1:") || raw.length > 32000) return {};
    const bytes = Uint8Array.from(atob(raw.slice(3)), (c) => c.charCodeAt(0));
    const inflated = unzlibSync(bytes, { out: new Uint8Array(512000) });
    const state = JSON.parse(strFromU8(inflated).replace(/\0+$/, ""));
    if (!state || typeof state !== "object" || Array.isArray(state)) return {};
    return Object.fromEntries(
      Object.entries(state)
        .slice(0, 500)
        .flatMap(([id, value]) => {
          const progress = parseMangaProgress(value);
          return isMangaId(id) && progress ? [[id, progress]] : [];
        }),
    );
  } catch {
    return {};
  }
}
export function encodeMangaProgress(state: Record<string, MangaProgress>) {
  const bytes = zlibSync(strToU8(JSON.stringify(state)));
  if (bytes.length > 4497) throw Error("Troppi dati manga salvati per questo account.");
  const encoded = "z1:" + btoa(String.fromCharCode(...bytes));
  if (encoded.length > 6000) throw Error("Troppi dati manga salvati per questo account.");
  return encoded;
}
export async function saveMangaProgress(
  client: SupabaseClient<Database>,
  userId: string,
  bookId: string,
  value: MangaProgress,
) {
  const progress = parseMangaProgress(value);
  if (!isMangaId(bookId) || !progress) throw Error("Avanzamento manga non valido.");
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (data.user?.id !== userId) throw Error("Accedi di nuovo prima di salvare i volumi.");
  const state = { ...decodeMangaProgress(data.user.user_metadata[MANGA_FIELD]) };
  if (!state[bookId] && Object.keys(state).length >= 500)
    throw Error("Limite delle serie raggiunto.");
  state[bookId] = progress;
  const { error: updateError } = await client.auth.updateUser({
    data: { [MANGA_FIELD]: encodeMangaProgress(state) },
  });
  if (updateError) throw updateError;
  return progress;
}
