BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE SCHEMA IF NOT EXISTS silvae_private;
REVOKE ALL ON SCHEMA silvae_private FROM PUBLIC,anon,authenticated;
ALTER TABLE public.kindle_cloud_connections
 ADD COLUMN IF NOT EXISTS automatic_enabled boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS automatic_since timestamptz,
 ADD COLUMN IF NOT EXISTS automatic_due timestamptz,
 ADD COLUMN IF NOT EXISTS automatic_result jsonb;

CREATE OR REPLACE FUNCTION public.kindle_cloud_automatic(p_enabled boolean DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.kindle_cloud_connections;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO r FROM public.kindle_cloud_connections WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('enabled',false); END IF;
 IF p_enabled IS NOT NULL THEN
  IF p_enabled AND r.ciphertext IS NULL THEN RAISE EXCEPTION 'Connect Amazon first'; END IF;
  UPDATE public.kindle_cloud_connections SET automatic_enabled=p_enabled,
   automatic_since=CASE WHEN p_enabled AND NOT r.automatic_enabled THEN now() ELSE automatic_since END,
   automatic_due=CASE WHEN p_enabled THEN now() ELSE NULL END,
   lease=CASE WHEN NOT p_enabled THEN NULL ELSE lease END,
   lease_until=CASE WHEN NOT p_enabled THEN NULL ELSE lease_until END
  WHERE user_id=auth.uid() RETURNING * INTO r;
 END IF;
 RETURN jsonb_build_object('enabled',r.automatic_enabled,'since',r.automatic_since,'result',r.automatic_result);
END; $$;
REVOKE ALL ON FUNCTION public.kindle_cloud_automatic(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kindle_cloud_automatic(boolean) TO authenticated;

-- A narrow job capability. The signature binds the entire payload, not only its owner.
-- No service-role credential or encryption key is given to the relay or scheduler.
CREATE OR REPLACE FUNCTION public.kindle_cloud_job(p_payload text,p_signature text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p jsonb; secret text; r public.kindle_cloud_connections; token uuid; e jsonb;
 item public.library_items; observed timestamptz; percent numeric; changed integer=0;
BEGIN
 IF octet_length(p_payload)>220000 OR p_signature !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name='silvae_kindle_job_key';
 IF secret IS NULL OR encode(extensions.hmac(convert_to(p_payload,'UTF8'),decode(secret,'hex'),'sha256'),'hex') IS DISTINCT FROM p_signature THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 p=p_payload::jsonb;
 IF abs(extract(epoch FROM clock_timestamp())*1000-(p->>'time')::numeric)>60000 OR (p->>'time') IS NULL THEN RAISE EXCEPTION 'Expired'; END IF;
 SELECT * INTO r FROM public.kindle_cloud_connections WHERE user_id=(p->>'owner')::uuid FOR UPDATE;
 IF NOT FOUND OR NOT r.automatic_enabled OR r.ciphertext IS NULL THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=r.user_id AND raw_user_meta_data->'reading_preferences_v1'->'ebookDevices'='[]'::jsonb) THEN
  UPDATE public.kindle_cloud_connections SET automatic_enabled=false,lease=NULL,lease_until=NULL WHERE user_id=r.user_id;
  RETURN NULL;
 END IF;
 IF p->>'action'='claim' THEN
  IF r.lease_until>now() THEN RETURN NULL; END IF;
  token=gen_random_uuid();
  UPDATE public.kindle_cloud_connections SET lease=token,lease_until=now()+interval '120 seconds' WHERE user_id=r.user_id;
  RETURN jsonb_build_object('lease',token,'ciphertext',r.ciphertext,'since',r.automatic_since,'library',
   (SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT l.id,l.book_id,l.status,l.started_at,l.updated_at,l.progress_updated_at,l.reading_session_id,
     jsonb_build_object('title',b.title,'authors',b.authors) AS books
    FROM public.library_items l JOIN public.books b ON b.id=l.book_id WHERE l.user_id=r.user_id ORDER BY l.updated_at DESC LIMIT 2000) x));
 ELSIF p->>'action'='finish' THEN
  IF p->>'lease' IS NULL OR r.lease IS NULL OR r.lease_until IS NULL OR r.lease IS DISTINCT FROM (p->>'lease')::uuid OR r.lease_until<=now() THEN RETURN NULL; END IF;
  IF p->>'ciphertext' IS NULL OR octet_length(p->>'ciphertext')>150000 OR jsonb_typeof(p->'updates') IS DISTINCT FROM 'array' OR jsonb_array_length(p->'updates')>10 THEN RAISE EXCEPTION 'Invalid job'; END IF;
  FOR e IN SELECT value FROM jsonb_array_elements(p->'updates') LOOP
   observed=(e->>'observed')::timestamptz; percent=(e->>'percentage')::numeric;
   IF observed IS NULL OR observed>now()+interval '5 minutes' OR e->>'position' IS NULL OR (e->>'position')::numeric<=0 OR (percent IS NOT NULL AND (percent<0 OR percent>100)) THEN CONTINUE; END IF;
   IF e->>'newBookId' IS NOT NULL AND observed>=r.automatic_since THEN
    INSERT INTO public.library_items(user_id,book_id,status,started_at,progress_percent,progress_source,progress_updated_at,finished_at)
     SELECT r.user_id,b.id,CASE WHEN percent=100 THEN 'read' ELSE 'reading' END,observed,percent,'kindle',observed,CASE WHEN percent=100 THEN observed END
     FROM public.books b WHERE b.id=e->>'newBookId' ON CONFLICT(user_id,book_id) DO NOTHING;
    IF FOUND THEN changed=changed+1; END IF;
   ELSE
    SELECT * INTO item FROM public.library_items WHERE id=(e->>'id')::uuid AND user_id=r.user_id FOR UPDATE;
    IF NOT FOUND OR item.status IN ('read','abandoned') OR item.reading_session_id IS DISTINCT FROM (e->>'session')::uuid
     OR item.updated_at IS DISTINCT FROM (e->>'version')::timestamptz OR observed<=coalesce(item.progress_updated_at,item.updated_at) THEN CONTINUE; END IF;
    UPDATE public.library_items SET status=CASE WHEN percent=100 THEN 'read' ELSE 'reading' END,
     started_at=coalesce(started_at,observed),finished_at=CASE WHEN percent=100 THEN observed ELSE finished_at END,
     progress_percent=coalesce(percent,progress_percent),progress_source='kindle',progress_updated_at=observed,updated_at=now() WHERE id=item.id;
    changed=changed+1;
   END IF;
  END LOOP;
  UPDATE public.kindle_cloud_connections SET ciphertext=p->>'ciphertext',lease=NULL,lease_until=NULL,
   automatic_due=now()+interval '5 minutes',automatic_result=jsonb_build_object('checkedAt',clock_timestamp(),'changed',changed,'unknown',coalesce((p->>'unknown')::integer,0),'unmatched',coalesce((p->>'unmatched')::integer,0),'error',coalesce((p->>'error')::boolean,false)) WHERE user_id=r.user_id;
  RETURN jsonb_build_object('changed',changed);
 END IF;
 RAISE EXCEPTION 'Invalid action';
END; $$;
REVOKE ALL ON FUNCTION public.kindle_cloud_job(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kindle_cloud_job(text,text) TO anon;

CREATE OR REPLACE FUNCTION silvae_private.dispatch_kindle_jobs() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r record; secret text; payload jsonb;
BEGIN
 SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name='silvae_kindle_job_key';
 IF secret IS NULL THEN RETURN; END IF;
 FOR r IN SELECT user_id FROM public.kindle_cloud_connections WHERE automatic_enabled AND ciphertext IS NOT NULL
  AND coalesce(automatic_due,now())<=now() AND coalesce(lease_until,now())<=now() ORDER BY automatic_due NULLS FIRST LIMIT 10 FOR UPDATE SKIP LOCKED LOOP
  payload=jsonb_build_object('owner',r.user_id,'time',floor(extract(epoch FROM clock_timestamp())*1000),'action','run');
  UPDATE public.kindle_cloud_connections SET automatic_due=now()+interval '5 minutes' WHERE user_id=r.user_id;
  PERFORM net.http_post(url:='https://silvae.lovable.app/api/kindle-job',body:=payload,
   headers:=jsonb_build_object('Content-Type','application/json','x-silvae-job-signature',encode(extensions.hmac(convert_to(payload::text,'UTF8'),decode(secret,'hex'),'sha256'),'hex')),timeout_milliseconds:=120000);
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION silvae_private.dispatch_kindle_jobs() FROM PUBLIC,anon,authenticated;
SELECT cron.schedule('silvae-kindle-progress','*/5 * * * *','SELECT silvae_private.dispatch_kindle_jobs()');
COMMIT;
