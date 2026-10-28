BEGIN;
CREATE TABLE public.kobo_cloud_connections (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 ciphertext text CHECK(octet_length(ciphertext)<=1500000),
 lease uuid, lease_until timestamptz, last_start_at timestamptz,
 automatic_enabled boolean NOT NULL DEFAULT false, automatic_due timestamptz,
 result jsonb
);
ALTER TABLE public.kobo_cloud_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kobo_cloud_connections FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.kobo_cloud_read() RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('ciphertext',ciphertext,'automatic',automatic_enabled,'result',result)
 FROM public.kobo_cloud_connections WHERE user_id=auth.uid();
$$;
CREATE FUNCTION silvae_private.claim_kobo(p_owner uuid,p_start boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.kobo_cloud_connections; token uuid;
BEGIN
 IF p_owner IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 INSERT INTO public.kobo_cloud_connections(user_id) VALUES(p_owner) ON CONFLICT DO NOTHING;
 SELECT * INTO r FROM public.kobo_cloud_connections WHERE user_id=p_owner FOR UPDATE;
 IF r.lease_until>now() THEN RETURN NULL; END IF;
 IF p_start AND r.last_start_at>now()-interval '30 seconds' THEN RAISE EXCEPTION 'Attendi qualche secondo prima di riprovare.'; END IF;
 token=gen_random_uuid();
 UPDATE public.kobo_cloud_connections SET lease=token,lease_until=now()+interval '180 seconds',
 last_start_at=CASE WHEN p_start THEN now() ELSE last_start_at END WHERE user_id=p_owner;
 RETURN jsonb_build_object('lease',token,'ciphertext',r.ciphertext,'library',
 (SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT l.id,l.book_id,l.status,l.started_at,l.updated_at,l.progress_updated_at,l.reading_session_id,
 jsonb_build_object('title',b.title,'authors',b.authors) AS books FROM public.library_items l JOIN public.books b ON b.id=l.book_id
 WHERE l.user_id=p_owner ORDER BY l.updated_at DESC LIMIT 2000) x));
END $$;
CREATE FUNCTION public.kobo_cloud_claim(p_start boolean DEFAULT false) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT silvae_private.claim_kobo(auth.uid(),p_start); $$;

CREATE FUNCTION silvae_private.finish_kobo(p_owner uuid,p_lease uuid,p_ciphertext text,p_updates jsonb,p_error boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.kobo_cloud_connections; e jsonb; item public.library_items; observed timestamptz; percent numeric; changed integer=0;
BEGIN
 SELECT * INTO r FROM public.kobo_cloud_connections WHERE user_id=p_owner FOR UPDATE;
 IF NOT FOUND OR p_lease IS NULL OR r.lease IS NULL OR r.lease IS DISTINCT FROM p_lease OR r.lease_until IS NULL OR r.lease_until<=now() THEN RETURN NULL; END IF;
 IF p_ciphertext IS NOT NULL AND octet_length(p_ciphertext)>1500000 THEN RAISE EXCEPTION 'Invalid state'; END IF;
 IF p_error IS NULL OR jsonb_typeof(p_updates) IS DISTINCT FROM 'array' OR jsonb_array_length(p_updates)>100 OR (p_ciphertext IS NULL AND p_updates<>'[]'::jsonb) OR (p_error AND p_updates<>'[]'::jsonb) THEN RAISE EXCEPTION 'Invalid updates'; END IF;
 FOR e IN SELECT value FROM jsonb_array_elements(p_updates) LOOP
  observed=(e->>'observed')::timestamptz; percent=(e->>'percentage')::numeric;
  IF observed IS NULL OR NOT isfinite(observed) OR observed<'2007-01-01'::timestamptz OR observed>now()+interval '5 minutes' OR (percent IS NOT NULL AND (percent::text IN ('NaN','Infinity','-Infinity') OR percent<0 OR percent>100)) OR e->>'status' IS NULL OR e->>'status' NOT IN ('reading','read','abandoned') OR (e->>'status'='reading' AND (percent IS NULL OR percent<=0)) OR (e->>'status'='read' AND percent IS NOT NULL AND percent<90) THEN CONTINUE; END IF;
  SELECT * INTO item FROM public.library_items WHERE id=(e->>'id')::uuid AND user_id=p_owner FOR UPDATE;
  IF NOT FOUND OR item.status IN ('read','abandoned') OR item.reading_session_id IS DISTINCT FROM (e->>'session')::uuid
   OR item.updated_at IS DISTINCT FROM (e->>'version')::timestamptz OR observed<=coalesce(item.progress_updated_at,item.updated_at) THEN CONTINUE; END IF;
  UPDATE public.library_items SET status=e->>'status',started_at=coalesce(started_at,observed),
   finished_at=CASE WHEN e->>'status'='read' THEN coalesce(finished_at,observed) ELSE finished_at END,
   progress_percent=coalesce(percent,progress_percent),progress_source='kobo',progress_updated_at=observed,updated_at=now() WHERE id=item.id AND user_id=p_owner;
  changed=changed+1;
 END LOOP;
 UPDATE public.kobo_cloud_connections SET ciphertext=p_ciphertext,lease=NULL,lease_until=NULL,
 automatic_due=CASE WHEN automatic_enabled THEN date_trunc('day',now())+(extract(hour FROM now())::integer/8+1)*interval '8 hours' ELSE NULL END,
 result=CASE WHEN p_ciphertext IS NOT NULL THEN jsonb_build_object('checkedAt',clock_timestamp(),'changed',changed,'error',p_error) ELSE NULL END
 WHERE user_id=p_owner;
 RETURN jsonb_build_object('changed',changed);
END $$;
CREATE FUNCTION public.kobo_cloud_finish(p_lease uuid,p_ciphertext text,p_updates jsonb DEFAULT '[]',p_error boolean DEFAULT false) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT silvae_private.finish_kobo(auth.uid(),p_lease,p_ciphertext,p_updates,p_error); $$;

CREATE FUNCTION public.kobo_cloud_disconnect() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE public.kobo_cloud_connections SET ciphertext=NULL,lease=NULL,lease_until=NULL,automatic_enabled=false,automatic_due=NULL,result=NULL WHERE user_id=auth.uid();
$$;
CREATE FUNCTION public.kobo_cloud_automatic(p_enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR p_enabled IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 UPDATE public.kobo_cloud_connections SET automatic_enabled=p_enabled,automatic_due=CASE WHEN p_enabled THEN now() ELSE NULL END,
 lease=CASE WHEN NOT p_enabled THEN NULL ELSE lease END,lease_until=CASE WHEN NOT p_enabled THEN NULL ELSE lease_until END
 WHERE user_id=auth.uid() AND (NOT p_enabled OR ciphertext IS NOT NULL);
 IF NOT FOUND THEN RAISE EXCEPTION 'Connect Kobo first'; END IF;
END $$;
REVOKE ALL ON FUNCTION silvae_private.claim_kobo(uuid,boolean),silvae_private.finish_kobo(uuid,uuid,text,jsonb,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.kobo_cloud_read(),public.kobo_cloud_claim(boolean),public.kobo_cloud_finish(uuid,text,jsonb,boolean),public.kobo_cloud_disconnect(),public.kobo_cloud_automatic(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.kobo_cloud_read(),public.kobo_cloud_claim(boolean),public.kobo_cloud_finish(uuid,text,jsonb,boolean),public.kobo_cloud_disconnect(),public.kobo_cloud_automatic(boolean) TO authenticated;

CREATE FUNCTION public.kobo_cloud_job(p_payload text,p_signature text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p jsonb; secret text; r public.kobo_cloud_connections;
BEGIN
 IF p_payload IS NULL OR p_signature IS NULL OR octet_length(p_payload)>2000000 OR p_signature !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name='silvae_kindle_job_key';
 IF secret IS NULL OR encode(extensions.hmac(convert_to(p_payload,'UTF8'),decode(secret,'hex'),'sha256'),'hex') IS DISTINCT FROM p_signature THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 p=p_payload::jsonb;
 IF p->>'provider' IS DISTINCT FROM 'kobo' OR p->>'time' IS NULL OR abs(extract(epoch FROM clock_timestamp())*1000-(p->>'time')::numeric)>60000 THEN RAISE EXCEPTION 'Expired'; END IF;
 SELECT * INTO r FROM public.kobo_cloud_connections WHERE user_id=(p->>'owner')::uuid FOR UPDATE;
 IF NOT FOUND OR NOT r.automatic_enabled OR r.ciphertext IS NULL THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=r.user_id AND raw_user_meta_data->'reading_preferences_v1'->'ebookDevices'='[]'::jsonb) THEN
  UPDATE public.kobo_cloud_connections SET automatic_enabled=false,lease=NULL,lease_until=NULL WHERE user_id=r.user_id; RETURN NULL;
 END IF;
 IF p->>'action'='claim' THEN RETURN silvae_private.claim_kobo(r.user_id,false);
 ELSIF p->>'action'='finish' THEN RETURN silvae_private.finish_kobo(r.user_id,(p->>'lease')::uuid,p->>'ciphertext',p->'updates',(p->>'error')::boolean);
 END IF;
 RAISE EXCEPTION 'Invalid action';
END $$;
REVOKE ALL ON FUNCTION public.kobo_cloud_job(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kobo_cloud_job(text,text) TO anon;
CREATE FUNCTION silvae_private.dispatch_kobo_jobs() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r record; secret text; payload jsonb;
BEGIN
 SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name='silvae_kindle_job_key';
 IF secret IS NULL THEN RETURN; END IF;
 FOR r IN SELECT user_id FROM public.kobo_cloud_connections WHERE automatic_enabled AND ciphertext IS NOT NULL
 AND coalesce(automatic_due,now())<=now() AND coalesce(lease_until,now())<=now() ORDER BY automatic_due NULLS FIRST LIMIT 10 FOR UPDATE SKIP LOCKED LOOP
  payload=jsonb_build_object('provider','kobo','owner',r.user_id,'time',floor(extract(epoch FROM clock_timestamp())*1000),'action','run');
  UPDATE public.kobo_cloud_connections SET automatic_due=date_trunc('day',now())+(extract(hour FROM now())::integer/8+1)*interval '8 hours' WHERE user_id=r.user_id;
  PERFORM net.http_post(url:='https://silvae.lovable.app/api/kobo-job',body:=payload,headers:=jsonb_build_object('Content-Type','application/json','x-silvae-job-signature',encode(extensions.hmac(convert_to(payload::text,'UTF8'),decode(secret,'hex'),'sha256'),'hex')),timeout_milliseconds:=120000);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION silvae_private.dispatch_kobo_jobs() FROM PUBLIC,anon,authenticated;
-- Drain due owners in small batches. This wakes the dispatcher, not Kobo:
-- each owner's automatic_due advances to the next 8-hour UTC boundary.
SELECT cron.schedule('silvae-kobo-progress','* * * * *','SELECT silvae_private.dispatch_kobo_jobs()');
COMMIT;
