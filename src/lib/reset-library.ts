import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';

/** Reset only this authenticated reader's library. Never touch the shared books catalogue. */
export async function resetUserLibrary(client: SupabaseClient<Database>, expectedUserId: string) {
  const { data, error: authError } = await client.auth.getUser();
  if (authError || !data.user || data.user.id !== expectedUserId) throw new Error('La sessione è cambiata. Accedi di nuovo prima di svuotare la libreria.');
  const { count, error } = await client.from('library_items').delete({ count: 'exact' }).eq('user_id', data.user.id);
  if (error) throw error;
  return count ?? 0;
}
