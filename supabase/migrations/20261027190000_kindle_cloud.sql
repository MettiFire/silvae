-- Ciphertext only. Amazon credentials are encrypted by the application server;
-- the encryption key is never in this database or in a browser response.
BEGIN;
CREATE TABLE IF NOT EXISTS public.kindle_cloud_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ciphertext text CHECK (octet_length(ciphertext) <= 150000),
  lease uuid,
  lease_until timestamptz,
  last_start_at timestamptz
);
ALTER TABLE public.kindle_cloud_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kindle_cloud_connections FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.kindle_cloud_read() RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT ciphertext FROM public.kindle_cloud_connections WHERE user_id = auth.uid();
$$;
CREATE OR REPLACE FUNCTION public.kindle_cloud_claim(p_start boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.kindle_cloud_connections; token uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.kindle_cloud_connections(user_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING;
  SELECT * INTO r FROM public.kindle_cloud_connections WHERE user_id=auth.uid() FOR UPDATE;
  IF r.lease_until > now() THEN RETURN NULL; END IF;
  IF p_start AND r.last_start_at > now()-interval '30 seconds' THEN RAISE EXCEPTION 'Attendi qualche secondo prima di riprovare.'; END IF;
  token = gen_random_uuid();
  UPDATE public.kindle_cloud_connections SET lease=token,lease_until=now()+interval '60 seconds',last_start_at=CASE WHEN p_start THEN now() ELSE last_start_at END WHERE user_id=auth.uid();
  RETURN jsonb_build_object('lease',token,'ciphertext',r.ciphertext);
END; $$;
CREATE OR REPLACE FUNCTION public.kindle_cloud_finish(p_lease uuid,p_ciphertext text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.kindle_cloud_connections SET ciphertext=p_ciphertext,lease=NULL,lease_until=NULL
  WHERE user_id=auth.uid() AND lease=p_lease AND lease_until>now();
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.kindle_cloud_read(),public.kindle_cloud_claim(boolean),public.kindle_cloud_finish(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kindle_cloud_read(),public.kindle_cloud_claim(boolean),public.kindle_cloud_finish(uuid,text) TO authenticated;
COMMIT;
