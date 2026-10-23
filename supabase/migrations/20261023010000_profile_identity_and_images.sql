-- Public handles must not be generated from private email addresses.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE handle text; display text;
BEGIN
 handle=lower(trim(coalesce(NEW.raw_user_meta_data->>'username','')));
 IF handle !~ '^[a-z0-9_.-]{3,64}$' OR EXISTS(SELECT 1 FROM public.profiles WHERE username=handle) THEN
  handle='lettore_'||replace(NEW.id::text,'-','');
 END IF;
 display=nullif(trim(coalesce(NEW.raw_user_meta_data->>'full_name',NEW.raw_user_meta_data->>'name','')),'');
 IF lower(display)=lower(NEW.email) THEN display=NULL; END IF;
 display=left(display,80);
 INSERT INTO public.profiles(id,username,display_name,avatar_url)
 VALUES(NEW.id,handle,display,CASE WHEN NEW.raw_user_meta_data->>'avatar_url' ~* '^https://' THEN NEW.raw_user_meta_data->>'avatar_url' ELSE NULL END)
 ON CONFLICT(id) DO NOTHING;
 RETURN NEW;
END; $$;
-- Replace only the old automatic handles. Explicitly chosen names remain unchanged.
UPDATE public.profiles p SET username='lettore_'||replace(p.id::text,'-',''),
 display_name=CASE WHEN p.display_name=split_part(u.email,'@',1) OR p.display_name=u.email THEN NULL ELSE p.display_name END
FROM auth.users u WHERE u.id=p.id AND p.username=coalesce(u.raw_user_meta_data->>'username',split_part(u.email,'@',1))||'_'||substr(p.id::text,1,4);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_case_insensitive ON public.profiles(lower(username));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format CHECK(username ~ '^[a-z0-9_.-]{3,64}$') NOT VALID;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_name_length CHECK(char_length(coalesce(display_name,''))<=80) NOT VALID;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_bio_length CHECK(char_length(coalesce(bio,''))<=1000) NOT VALID;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_image_url_length CHECK(char_length(coalesce(avatar_url,''))<=2000 AND char_length(coalesce(banner_url,''))<=2000) NOT VALID;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('profile-images','profile-images',true,2097152,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=2097152,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];
CREATE POLICY "profile_images_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='profile-images' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "profile_images_delete_own" ON storage.objects FOR DELETE TO authenticated
USING(bucket_id='profile-images' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY "profile_images_public_read" ON storage.objects FOR SELECT TO anon,authenticated
USING(bucket_id='profile-images');
NOTIFY pgrst,'reload schema';
