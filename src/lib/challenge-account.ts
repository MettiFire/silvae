import { zlibSync, unzlibSync, strToU8, strFromU8 } from "fflate";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";
import {
  decodeEnrollments,
  type ChallengeEnrollment,
  type ChallengeId,
} from "./reading-challenges.ts";
export const CHALLENGE_ACCOUNT_FIELD = "reading_challenges_v1";
// Keep preferences compact: user metadata is also included in the auth token.
export function encodeReadingChallenges(entries: ChallengeEnrollment[]): string {
  const compressed = zlibSync(strToU8(JSON.stringify(entries)));
  return "z1:" + btoa(String.fromCharCode(...compressed));
}
export function decodeReadingChallenges(raw: unknown): ChallengeEnrollment[] {
  if (typeof raw !== "string") return decodeEnrollments(raw);
  try {
    if (!raw.startsWith("z1:") || raw.length > 64000) return [];
    const compressed = Uint8Array.from(atob(raw.slice(3)), (c) => c.charCodeAt(0));
    return decodeEnrollments(JSON.parse(strFromU8(unzlibSync(compressed))));
  } catch {
    return [];
  }
}
export async function loadReadingChallenges(client: SupabaseClient<Database>, userId: string) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (data.user?.id !== userId) throw new Error("Accedi di nuovo per caricare le tue sfide.");
  return decodeReadingChallenges(data.user.user_metadata[CHALLENGE_ACCOUNT_FIELD]);
}
export async function changeReadingChallenge(
  client: SupabaseClient<Database>,
  userId: string,
  change: { save: ChallengeEnrollment } | { remove: ChallengeId },
) {
  // Read the latest account state before changing a single subscription. This
  // preserves other challenges added from another tab since the page loaded.
  const existing = await loadReadingChallenges(client, userId);
  const id = "save" in change ? change.save.id : change.remove;
  const next = existing.filter((entry) => entry.id !== id);
  if ("save" in change) {
    const valid = decodeEnrollments([change.save]);
    if (!valid.length) throw new Error("Impostazioni della sfida non valide.");
    next.push(valid[0]!);
  }
  const { error } = await client.auth.updateUser({
    data: { [CHALLENGE_ACCOUNT_FIELD]: encodeReadingChallenges(next) },
  });
  if (error) throw error;
  return next;
}
