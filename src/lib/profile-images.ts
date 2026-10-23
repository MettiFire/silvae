import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";
import { requireFragmentUser } from "./fragments.ts";

export const PROFILE_IMAGE_LIMIT = 2 * 1024 * 1024;
export type ProfileImageKind = "avatar" | "banner";
const imageTypes = ["image/jpeg", "image/png", "image/webp"];

export function validateProfileImage(file: { type: string; size: number }) {
  if (!imageTypes.includes(file.type) || file.size <= 0 || file.size > 8 * 1024 * 1024)
    throw Error("Scegli una foto JPG, PNG o WebP fino a 8 MB.");
}

/** Re-encode decoded pixels, strip embedded metadata and fit the Storage size limit. */
export async function prepareProfileImage(file: File, kind: ProfileImageKind): Promise<Blob> {
  validateProfileImage(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw Error("Immagine non leggibile. Prova a esportarla come JPG, PNG o WebP.");
  }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40000000)
      throw Error("Immagine troppo grande. Scegli una versione più piccola.");
    let longest = kind === "avatar" ? 512 : 1600;
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, longest / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw Error("Impossibile preparare l’immagine.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.85 - attempt * 0.08),
      );
      if (!blob) throw Error("Immagine non leggibile.");
      if (blob.size && blob.size <= PROFILE_IMAGE_LIMIT && imageTypes.includes(blob.type))
        return blob;
      longest *= 0.75;
    }
    throw Error("Non riesco a ridurre abbastanza questa immagine. Prova con una foto più piccola.");
  } finally {
    bitmap.close();
  }
}

/** Verify delivery before allowing the URL to be saved in the public profile. */
export function verifyProfileImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const finish = (error?: Error) => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(
      () => finish(Error("L’immagine non è ancora raggiungibile. Riprova.")),
      15000,
    );
    image.referrerPolicy = "no-referrer";
    image.onload = () =>
      finish(image.naturalWidth > 0 ? undefined : Error("Immagine non leggibile."));
    image.onerror = () => finish(Error("L’immagine caricata non è raggiungibile. Riprova."));
    image.src = url;
  });
}

export async function uploadProfileImage(
  client: SupabaseClient<Database>,
  userId: string,
  kind: ProfileImageKind,
  blob: Blob,
  verify: (url: string) => Promise<void> = verifyProfileImage,
) {
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !["avatar", "banner"].includes(kind))
    throw Error("Profilo non valido.");
  if (!imageTypes.includes(blob.type) || !blob.size || blob.size > PROFILE_IMAGE_LIMIT)
    throw Error("L’immagine preparata supera il limite consentito.");
  await requireFragmentUser(client, userId);
  const extension =
    blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : "png";
  const path = `${userId}/${kind}-${crypto.randomUUID()}.${extension}`;
  const bucket = client.storage.from("profile-images");
  const { error } = await bucket.upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) {
    if (/bucket.*not found/i.test(error.message))
      throw Error("Il caricamento delle immagini non è ancora attivo su questo ambiente.");
    if (/row.level.security|unauthorized|not authorized/i.test(error.message))
      throw Error("Non è stato possibile autorizzare il caricamento. Accedi di nuovo e riprova.");
    throw Error("Caricamento non riuscito. Riprova tra poco.");
  }
  const url = bucket.getPublicUrl(path).data.publicUrl;
  try {
    await verify(url);
    // A session switch during conversion/upload must not update a different profile.
    await requireFragmentUser(client, userId);
    return url;
  } catch (error) {
    await bucket.remove([path]).catch(() => undefined);
    throw error;
  }
}
