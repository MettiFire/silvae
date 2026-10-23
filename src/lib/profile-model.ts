import type { LibraryItem } from "./library";
import { sortLibrary } from "./library-order.ts";
export function profileShelves(items: LibraryItem[]) {
  return {
    read: sortLibrary(
      items.filter((i) => i.status === "read"),
      "last-read",
    ),
    reading: items.filter((i) => i.status === "reading"),
    wishlist: sortLibrary(
      items.filter((i) => i.status === "to_read"),
      "added",
    ),
    favorites: sortLibrary(
      items.filter((i) => i.favorite),
      "last-read",
    ),
  };
}
export function validateProfile(form: {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  banner_url: string;
}) {
  const username = form.username.trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,64}$/.test(username))
    throw Error(
      "Lo username deve contenere da 3 a 64 lettere, numeri, punti, trattini o underscore.",
    );
  if (form.display_name.trim().length > 80 || form.bio.length > 1000)
    throw Error("Usa fino a 80 caratteri per il nome e 1.000 per la biografia.");
  for (const value of [form.avatar_url, form.banner_url]) {
    if (!value.trim()) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password || value.length > 2000)
        throw Error();
    } catch {
      throw Error("Le immagini devono avere un indirizzo HTTPS valido.");
    }
  }
  return {
    ...form,
    username,
    display_name: form.display_name.trim(),
    bio: form.bio.trim(),
    avatar_url: form.avatar_url.trim(),
    banner_url: form.banner_url.trim(),
  };
}

export function isGeneratedProfile(profile: { id: string; username: string }) {
  return (
    profile.username === `lettore_${profile.id.replaceAll("-", "")}` ||
    profile.username.endsWith(`_${profile.id.slice(0, 4)}`)
  );
}

export function profileLabel(profile: {
  id: string;
  username: string;
  display_name?: string | null;
}) {
  return (
    profile.display_name?.trim() || (isGeneratedProfile(profile) ? "Lettore" : profile.username)
  );
}
