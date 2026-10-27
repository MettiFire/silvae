# Fragment photos

Readers can attach a JPG, PNG or WebP photo (up to 8 MB) to a book fragment, with an optional caption. Photos are re-encoded as WebP, stripped of embedded metadata, resized to a maximum dimension of 2400 pixels, and limited to 2 MB after conversion. Existing avatar/banner conversion uses the same preparation helper at its original dimensions.

The photo field accepts drag-and-drop or the standard file picker. Before saving, readers can select a free-form crop, rotate by quarter turns, reset, apply, or cancel. Existing private photos can also be downloaded through the current session for editing. Mouse, touch and keyboard crop handles use `react-image-crop`; canvas export applies the actual pixel transformation locally. Changes are uploaded only when the fragment is saved. These editing controls do not require another database migration.

## Activation

Apply `supabase/migrations/20261027093800_fragment_photos.sql` to the **Silvae** backend before publishing the frontend. It adds the optional `fragments.image_path` column, allows photo-only fragments, and creates the private `fragment-photos` bucket with access policies. Text-only fragments remain supported. The project reference is recorded in `supabase/config.toml`; do not apply this migration to an unrelated project.

Activated on **2026-10-27** through the project's authenticated Lovable SQL editor, since the external Supabase connection cannot access this Lovable-managed backend. Schema changes and the `20261027093800` entry in `supabase_migrations.schema_migrations` were committed together in a transaction. A follow-up query confirmed the image column, private bucket, 2 MB limit, all three Storage policies, and migration registration. The updated site was then published from Lovable.

A real upload was verified through the published site's fragment editor using Silvae's existing public app icon as a harmless fixture. Image preparation, saving the fragment, and protected Storage download/rendering all succeeded. The account owner chose to move the clearly labeled test fragment to the trash themselves.

## Access and lifecycle

- Photo reads use authenticated Storage downloads and the fragment's existing visibility policies. No public bucket or public/signed photo URLs are created.
- Unshared collections remain private. Public and follower-only collections retain their existing behavior; trash removes shared access while keeping the owner's ability to restore the fragment.
- Photo bytes are downloaded only near the viewport; temporary browser object URLs are revoked on unmount or account changes.
- Uploads use unique owner paths. Failed fragment writes attempt upload cleanup; successful replacement removes the previous attachment. Account deletion removes photos while the owner can still authorize Storage.
- Photos are not transcribed automatically. An optional caption is searchable; text inside the photo is not.

## Verification

Tests cover private/public/follower access, trash revocation, foreign attachment rejection, upload failures, cleanup on failed saves, and account deletion across both image buckets. The full suite passed 261 tests, alongside TypeScript, targeted lint and the production build. Desktop upload and rendering have been checked on the live site; mobile uploads, caption-only edits, replacing/removing a photo, and access from another real account still require live-device verification.
