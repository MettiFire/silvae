import { supabase } from "@/integrations/supabase/client";
import { getProfileMap } from "./profile-data";
import { requireFragmentUser } from "./fragments";
export type Club = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  current_book_id: string | null;
  created_at: string;
  book: { id: string; title: string; authors: string[]; cover_url: string | null } | null;
  members: number;
  joined: boolean;
};
export function clubError(error: unknown) {
  const e = error as { code?: string; message?: string };
  if (["PGRST205", "42P01"].includes(e?.code ?? ""))
    return "I book club non sono ancora disponibili su questo ambiente. Riprova dopo l’aggiornamento di Silvae.";
  if (e?.code === "42501")
    return "Questa azione è riservata ai membri del club o a chi lo gestisce.";
  return "Non è stato possibile completare l’operazione. Riprova.";
}
export async function loadClubs(
  userId: string,
  search = "",
  id?: string,
  mine = false,
  offset = 0,
): Promise<Club[]> {
  let query = supabase
    .from("book_clubs")
    .select("*,book:books(id,title,authors,cover_url),totals:club_members(count)")
    .order("created_at", { ascending: false })
    .order("id")
    .range(offset, offset + 49);
  if (mine) {
    const { data: owned, error: ownedError } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", userId)
      .limit(1000);
    if (ownedError) throw ownedError;
    if (!owned.length) return [];
    query = query.in(
      "id",
      owned.map((m) => m.club_id),
    );
  }
  if (id) query = query.eq("id", id);
  if (search) query = query.ilike("name", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
  const { data, error } = await query;
  if (error) throw error;
  const ids = data.map((c) => c.id);
  if (!ids.length) return [];
  const { data: members, error: memberError } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId)
    .in("club_id", ids);
  if (memberError) throw memberError;
  return data.map((c) => ({
    ...c,
    members: c.totals[0]?.count ?? 0,
    joined: members.some((m) => m.club_id === c.id),
  }));
}
export async function loadTopics(clubId: string, offset = 0) {
  const { data, error } = await supabase
    .from("club_topics")
    .select("*,book:books(title)")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .order("id")
    .range(offset, offset + 49);
  if (error) throw error;
  const people = await getProfileMap(data.map((t) => t.author_id));
  return data.map((t) => ({ ...t, author: people.get(t.author_id) }));
}
export async function loadMessages(topicId: string, offset = 0) {
  const { data, error } = await supabase
    .from("club_messages")
    .select("*")
    .eq("topic_id", topicId)
    .order("created_at", { ascending: true })
    .order("id")
    .range(offset, offset + 49);
  if (error) throw error;
  const people = await getProfileMap(data.map((t) => t.author_id));
  return data.map((t) => ({ ...t, author: people.get(t.author_id) }));
}
export async function joinClub(userId: string, clubId: string, joined: boolean) {
  await requireFragmentUser(supabase, userId);
  const { error } = joined
    ? await supabase.from("club_members").delete().eq("club_id", clubId).eq("user_id", userId)
    : await supabase
        .from("club_members")
        .upsert(
          { club_id: clubId, user_id: userId },
          { onConflict: "club_id,user_id", ignoreDuplicates: true },
        );
  if (error) throw error;
}
