-- Run in the project's admin SQL editor. All fixture writes are rolled back.
BEGIN;
DO $$ DECLARE owner uuid; c jsonb;
BEGIN
 SELECT id INTO owner FROM auth.users LIMIT 1;
 IF owner IS NULL THEN RAISE EXCEPTION 'No fixture owner'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 c := public.kindle_cloud_claim();
 ASSERT c IS NOT NULL, 'claim failed';
 ASSERT public.kindle_cloud_claim() IS NULL, 'concurrent lease allowed';
 ASSERT NOT public.kindle_cloud_finish(gen_random_uuid(),'synthetic'), 'wrong lease accepted';
 ASSERT public.kindle_cloud_finish((c->>'lease')::uuid,'synthetic'), 'finish failed';
 ASSERT public.kindle_cloud_read()='synthetic', 'owner read failed';
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 ASSERT public.kindle_cloud_read() IS NULL, 'cross-owner read';
 ASSERT NOT public.kindle_cloud_finish((c->>'lease')::uuid,'other'), 'cross-owner write';
 ASSERT NOT has_table_privilege('authenticated','public.kindle_cloud_connections','SELECT'), 'table exposed';
 ASSERT NOT has_function_privilege('anon','public.kindle_cloud_read()','EXECUTE'), 'anonymous read exposed';
END $$;
ROLLBACK;
