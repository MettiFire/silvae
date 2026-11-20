type SupabaseGoogleAuth = {
  signInWithOAuth: (request: {
    provider: "google";
    options: { redirectTo: string };
  }) => Promise<{ data: { url: string | null }; error: Error | null }>;
};
type GoogleBroker = (
  provider: "google",
  options: { redirect_uri: string },
) => Promise<{ error?: Error | null; redirected?: boolean }>;

/** Keep the existing host working while the independent deployment uses its own auth. */
export async function startGoogleSignIn(
  mode: unknown,
  redirectTo: string,
  auth: SupabaseGoogleAuth,
  broker: GoogleBroker,
): Promise<{ redirected: boolean }> {
  if (mode === "supabase") {
    const { data, error } = await auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) throw error;
    if (!data.url) throw new Error("Accesso Google non avviato. Riprova.");
    return { redirected: true };
  }
  if (mode !== undefined && mode !== "lovable")
    throw new Error("Configurazione dell’accesso Google non valida.");
  const result = await broker("google", { redirect_uri: redirectTo });
  if (result.error) throw result.error;
  return { redirected: result.redirected === true };
}
