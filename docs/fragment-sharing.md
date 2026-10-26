# Fragment visibility and emphasis

A single collection setting controls all active fragments, including personal notes and tags: `private` (default), `followers`, or `public`. Missing preferences mean private. Existing fragments are never published automatically. Trashed fragments remain owner-only. Sharing grants read access only; editing and deleting remain owner-only. Unfollowing immediately revokes database access to follower-only fragments.

The Fragments page provides a selector and an explicit Save action. The profile has a paginated, read-only Fragments tab. The owner can manage the collection from the profile. Bold and italic toolbar actions and Ctrl/Cmd+B/I insert emphasis markers, with a live preview. Rendering supports emphasis only; HTML, links and images stay literal text.

## Rollout

Apply `supabase/migrations/20261026020000_fragment_visibility.sql` before deploying the frontend to the Supabase-backed environment. The equivalent Lovable/Drizzle migration is `drizzle/migrations/0012_fragment_visibility.sql`, registered in its journal. Use the migration system appropriate to the environment; do not apply both copies to the same database. No existing row needs a backfill. Until the migration is applied, the visibility selector reports an unavailable feature and cannot publish anything.

The migration was tested against local PostgreSQL via PGlite, including owner, follower, stranger, anonymous access, trash, write protection, and returning to private. It has not been applied to the live database.
