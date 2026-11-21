# Independent hosting and migration

Silvae can run its TanStack Start server on Vercel and keep its database,
authentication and uploaded files in an independently managed Supabase project.
The existing Lovable deployment remains the source until the data transfer is
complete. A source-code checkout is not a backup of users or uploaded files.

## Build and sign-in settings

- Use Node.js 24, matching the project's declared runtime and Vercel settings.
- Run `NITRO_PRESET=vercel npm run build`. Nitro generates `.vercel/output`;
  deploy the server functions and static assets together, not just static files.
- On Vercel, disable automatic exposure of system environment variables. If the
  platform still injects `VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG`, use
  `env -u VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG NITRO_PRESET=vercel npm run build`
  as the build command. Silvae does not use this client instrumentation setting;
  keep the public environment allowlist strict.
- Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and
  `VITE_SUPABASE_PROJECT_ID` for the destination project before building.
- Set server-side `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for backend jobs.
- Set `VITE_AUTH_MODE=supabase` on independent hosting. Google sign-in then uses
  the destination Supabase provider directly. Missing mode preserves the existing
  Lovable broker; `lovable` selects that broker explicitly. Other values fail the
  public environment audit.
- Configure Google's provider credentials and allowed return URLs in Supabase.
  The code setting alone does not enable the provider. An actual Google login
  must be tested after configuration, not inferred from the build or unit tests.
- The client-secret audit checks Vercel's static output, the existing Cloudflare
  public output and Vite's client output. It does not inspect private server code
  as if that code were public.

Local `.env.local` and `.vercel/` are Git-ignored. Real backend credentials must
remain in server environment variables or a private password manager.

## Transfer before changing the public address

1. Keep the destination database's application schema empty until the full export
   format is inspected. Do not overwrite an existing unrelated Supabase project.
2. Reactivate the source backend when ready to export. Download the full database
   archive, including users, identity links and password hashes, and keep a private
   original copy. Inspect the archive before restoring: the destination already
   has Supabase-managed system schemas. Do not blindly run destructive restore
   commands against those schemas.
3. Transfer uploaded files separately, including public profile images, private
   fragment photos and personal covers. Preserve ownership and paths, recreate
   bucket policies, and update old absolute storage URLs where necessary.
4. Reconcile the live schema and permissions with the source export. Repository
   migrations alone are not proof of the production database's complete state.
5. Preserve user identifiers. Test account access, existing libraries, ratings,
   reading dates, fragments, lists, clubs and challenges before switching traffic.
6. Transfer reader credentials only if the original `KINDLE_CLOUD_KEY` is available.
   It encrypts both Kindle and Kobo state and is bound to each user identifier.
   Otherwise require a new authorization of the readers; retain book progress.
7. Recreate the job-signing secret in both hosting and database Vault, update the
   scheduled jobs' destination URLs, and keep destination jobs off until verified.
   Avoid two installations syncing the same accounts during the transition.
8. Reconfigure Google OAuth, password-reset email links, canonical URLs, sitemap,
   robots and social-preview URLs for the final public address. The Lovable-owned
   `silvae.lovable.app` address is not an independently owned domain.
9. Verify the new installation and a recovery path before removing the source.

Do not enable a Lovable trial merely to wait on local build work. The useful window
starts when the destination can receive the export. Confirm that any trial grants
Cloud access: editor access alone does not necessarily reactivate a paused backend.

## Restore checks

The Lovable export may be a ZIP containing a PostgreSQL custom archive compressed
with zstd. Verify that the chosen `pg_restore` can actually decode its data;
listing the archive alone does not prove compression support. PostgreSQL 17 client
tools with zstd support can read this format. Keep the original and its checksum
outside the repository.

Restore application objects and account identities selectively into the empty
destination in a transaction with error-stop enabled. Preserve user IDs and
password hashes. Keep destination-managed schemas, internal migration history,
role defaults and sessions under the destination's control. Lovable-only grants
such as `sandbox_exec` do not belong in the new project. Include application
triggers on `auth.users` and application policies on `storage.objects` explicitly;
a restore restricted to the `public` schema misses them.

Compare explicit grants after restoring: destination defaults can add permissions
that the source never granted, even when the source's grant statements are replayed.
Check function execution, table and column permissions, RLS, and cross-user writes.
Retain the source's intentional social reads rather than assuming all library
records are private to their owner.

Copy file payloads through the Storage API, preserving bucket settings, paths and
ownership. Compare downloaded hashes after uploading. Regenerate signed cover
URLs with the destination and update public image URLs. Copying old signed URLs
or inserting storage metadata alone does not transfer the files.

Before cutover, compare table counts and account identities/password hashes, test
access boundaries, and complete actual email/Google sign-in on the new host.
An intact database restore does not configure an OAuth provider or recover
server-side reader encryption keys.

## Reported book covers

Deploy the cover-repair migration and the `cover-repair` Supabase Edge Function
before deploying the web app. Use a 32-byte random hex token for Vercel's server-only
`CRON_SECRET` and store the SHA-256 digest of that same token in
`cover_repair_private.settings.secret_hash`. The Edge Function uses Supabase's
built-in service credential. Vercel only needs the dedicated token.

The Vercel production job runs daily. Review `cover_reports.last_checked_at` for
the latest attempt and `verified_book_covers` for successful repairs.
