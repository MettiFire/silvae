DROP POLICY IF EXISTS profile_images_public_read ON storage.objects;
CREATE POLICY profile_images_read_own ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text);