/** Only publishable/legacy anon keys may be embedded in browser code. */
export function assertPublicClientKey(key: string): void {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return;
  if (key.startsWith("eyJ")) {
    try {
      const payload = key.split(".")[1]!;
      const parsed = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      if (parsed.role === "anon") return;
    } catch {
      /* Reject malformed or privileged credentials without echoing them. */
    }
  }
  throw new Error(
    "Configurazione non sicura: usa soltanto la chiave pubblica Supabase nel frontend.",
  );
}
