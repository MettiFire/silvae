import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";
import {
  requireFragmentUser,
  saveFragment,
  type Fragment,
  type FragmentDraft,
} from "./fragments.ts";

export const FRAGMENT_PHOTO_BUCKET = "fragment-photos";

/** Only re-encoded WebP pixels enter the private bucket. Failed saves clean up uploads. */
export async function saveFragmentPhoto(
  client: SupabaseClient<Database>,
  userId: string,
  bookId: string,
  draft: FragmentDraft,
  photo: Blob | null,
  original?: Fragment,
) {
  await requireFragmentUser(client, userId);
  const bucket = client.storage.from(FRAGMENT_PHOTO_BUCKET);
  let uploaded: string | null = null;
  if (photo) {
    if (photo.type !== "image/webp" || !photo.size || photo.size > 2 * 1024 * 1024)
      throw Error("L’immagine preparata supera il limite consentito.");
    uploaded = `${userId}/${crypto.randomUUID()}.webp`;
    const { error } = await bucket.upload(uploaded, photo, {
      contentType: "image/webp",
      upsert: false,
    });
    if (error)
      throw Error(
        "Caricamento della foto non riuscito. Verifica che le foto dei frammenti siano attive e riprova.",
      );
  }
  try {
    await saveFragment(
      client,
      userId,
      bookId,
      { ...draft, image_path: uploaded ?? draft.image_path ?? null },
      original,
    );
  } catch (error) {
    if (uploaded) await bucket.remove([uploaded]).catch(() => undefined);
    throw error;
  }
  if (original?.image_path && original.image_path !== (uploaded ?? draft.image_path ?? null))
    await bucket.remove([original.image_path]).catch(() => undefined);
}
