-- Atomic self-service deletion. All personal tables reference auth.users with
-- ON DELETE CASCADE (including lists' items, saved lists, device credentials).
-- The shared books catalogue has no user ownership and is deliberately retained.
CREATE FUNCTION public.delete_own_account(p_expected_user_id uuid, p_confirmation text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL OR p_expected_user_id IS DISTINCT FROM caller THEN
    RAISE EXCEPTION 'Sessione non valida. Accedi di nuovo.' USING ERRCODE = '42501';
  END IF;
  IF p_confirmation IS DISTINCT FROM 'ELIMINA' THEN
    RAISE EXCEPTION 'Scrivi ELIMINA per confermare.' USING ERRCODE = '22023';
  END IF;
  DELETE FROM auth.users WHERE id = caller;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account non trovato. Accedi di nuovo.' USING ERRCODE = '42501';
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_own_account(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_account(uuid, text) TO authenticated;
