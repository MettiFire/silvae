# Fragment photos

Readers can attach a JPG, PNG or WebP photo (up to 8 MB) to a book fragment, with an optional caption. Photos are re-encoded as WebP, stripped of embedded metadata, resized to a maximum dimension of 2400 pixels, and limited to 2 MB after conversion. Existing avatar/banner conversion uses the same preparation helper at its original dimensions.

## Activation

Apply `supabase/migrations/20261027093800_fragment_photos.sql` to the **Silvae** backend before publishing the frontend. It adds the optional `fragments.image_path` column, allows photo-only fragments, and creates the private `fragment-photos` bucket with access policies. Text-only fragments remain supported. The project reference is recorded in `supabase/config.toml`; do not apply this migration to an unrelated project.

The Supabase connection available during implementation could not access this Lovable-managed project. The migration has been tested locally with PostgreSQL-compatible PGlite, but has **not** been applied to production and a real upload has **not** been verified there.

## Access and lifecycle

- Photo reads use authenticated Storage downloads and the fragment's existing visibility policies. No public bucket or public/signed photo URLs are created.
- Unshared collections remain private. Public and follower-only collections retain their existing behavior; trash removes shared access while keeping the owner's ability to restore the fragment.
- Photo bytes are downloaded only near the viewport; temporary browser object URLs are revoked on unmount or account changes.
- Uploads use unique owner paths. Failed fragment writes attempt upload cleanup; successful replacement removes the previous attachment. Account deletion removes photos while the owner can still authorize Storage.
- Photos are not transcribed automatically. An optional caption is searchable; text inside the photo is not.

## Verification

Tests cover private/public/follower access, trash revocation, foreign attachment rejection, upload failures, cleanup on failed saves, and account deletion across both image buckets. After applying the migration, verify uploading from desktop and mobile, caption-only edits, replacing/removing a photo, and viewing the public collection from another account.
