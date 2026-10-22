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
