import { validAuthorId } from "./catalogue-supplement.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";
export const AUTHORS_FIELD = "followed_authors_v1";
export type FollowedAuthor = { id: string; name: string; followedAt: string };
export function authorNameKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
export function parseFollowedAuthors(raw: unknown): FollowedAuthor[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .filter((a): a is FollowedAuthor => {
      if (
        !a ||
        typeof a !== "object" ||
        typeof a.id !== "string" ||
        !validAuthorId(a.id) ||
        seen.has(a.id) ||
        typeof a.name !== "string" ||
        !a.name.trim() ||
        a.name.length > 160 ||
        typeof a.followedAt !== "string" ||
        !Number.isFinite(Date.parse(a.followedAt))
      )
        return false;
      seen.add(a.id);
      return true;
    })
    .slice(0, 80)
    .map((a) => ({ id: a.id, name: a.name, followedAt: a.followedAt }));
}
export async function changeFollowedAuthor(
  client: SupabaseClient<Database>,
  userId: string,
  author: { id: string; name: string; ids?: string[] },
  follow: boolean,
) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (data.user?.id !== userId) throw new Error("Accedi di nuovo per salvare l’autore.");
  const previous = parseFollowedAuthors(data.user.user_metadata[AUTHORS_FIELD]);
  const ids = new Set([author.id, ...(author.ids ?? []).filter((id) => validAuthorId(id))]);
  if (
    follow &&
    previous.some((a) => a.id === author.id) &&
    !previous.some((a) => a.id !== author.id && ids.has(a.id))
  )
    return previous;
  if (follow && previous.length >= 80) throw new Error("Puoi seguire fino a 80 autori.");
  const next = previous.filter((a) => !ids.has(a.id));
  if (follow) {
    const valid = parseFollowedAuthors([{ ...author, followedAt: new Date().toISOString() }]);
    if (!valid.length) throw new Error("Autore non valido.");
    next.push(valid[0]!);
  }
  const { error: saveError } = await client.auth.updateUser({ data: { [AUTHORS_FIELD]: next } });
  if (saveError) throw saveError;
  return next;
}
