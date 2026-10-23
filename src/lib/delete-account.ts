import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";

export async function deleteOwnAccount(
  client: SupabaseClient<Database>,
  expectedUserId: string,
  confirmation: string,
) {
  if (confirmation !== "ELIMINA") throw Error("Scrivi ELIMINA per confermare.");
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user || auth.user.id !== expectedUserId)
    throw Error("La sessione è cambiata. Accedi di nuovo prima di eliminare l’account.");
  // Profile uploads are public assets: remove owned files while the account can still authorize Storage.
  if (client.storage) {
    const bucket = client.storage.from("profile-images");
    for (let batch = 0; batch < 100; batch++) {
      const { data: files, error: listError } = await bucket.list(expectedUserId, { limit: 100 });
      if (listError) {
        if (/bucket.*not found/i.test(listError.message)) break;
        throw Error(
          "Non è stato possibile rimuovere le immagini del profilo. Nessun account è stato eliminato; riprova.",
        );
      }
      if (!files?.length) break;
      const paths = files
        .filter((file) => file.id && !file.name.includes("/"))
        .map((file) => `${expectedUserId}/${file.name}`);
      if (!paths.length) break;
      const { error: removeError } = await bucket.remove(paths);
      if (removeError)
        throw Error("Rimozione delle immagini non riuscita. Riprova l’eliminazione dell’account.");
      if (batch === 99)
        throw Error("Ci sono ancora immagini da rimuovere. Ripeti l’eliminazione per completarla.");
    }
  }
  const { data, error } = await client.rpc("delete_own_account", {
    p_expected_user_id: expectedUserId,
    p_confirmation: confirmation,
  });
  if (error) {
    if (["PGRST202", "42883"].includes(error.code))
      throw Error(
        "L’eliminazione dell’account non è ancora attiva su questo ambiente. Riprova dopo l’aggiornamento del servizio.",
      );
    throw error;
  }
  if (data !== true) throw Error("Eliminazione non confermata. Riprova.");
}
