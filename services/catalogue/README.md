# Silvae catalogue service

Dependency-free Node.js service for public MangaDex metadata. The Lovable runtime
could not retrieve MangaDex metadata, and direct browser requests lacked MangaDex
CORS permission. Catalogue and volume-cover lookup now use this service, including
the browser fallback. Images still load from MangaDex's image CDN.

Production: https://silvae-catalogue.vercel.app/api/mangadex

Vercel project: `silvae-catalogue` (`prj_HDqMoPIcTW0jKhKgqeE4bWDvVmDj`), team
`mettifires-projects`, root `services/catalogue`, Node.js 24. Source lives in this
repository. No environment variables or API keys are required. Preview deployments
retain Vercel authentication; the production metadata endpoint is public.

GET/OPTIONS only. `resource` accepts `/manga` (title search), `/manga/UUID`
(detail), or `/cover` (one manga UUID). Parameters, page sizes, offsets and IDs
are validated. Chapters, arbitrary hosts and redirects are not supported.
Upstream requests never forward client cookies or authorization.

Successful results have bounded one-hour instance and CDN caches, with CDN stale
revalidation. Identical requests share a fetch. Cold requests are paced at four
starts per second per instance, with at most 16 pending keys. Errors are not
cached. Upstream timeout is eight seconds. These are per-instance limits, not a
global distributed rate limiter.

Deploy the `services/catalogue` root to this Vercel project when changing service
code. Use `MettiFire/silvae` main or deploy source files with the Vercel connector.
App changes require a separate Lovable Publish. This service does not replace
the main application or the existing personal website project.

From the repository root, verify with:

```sh
node --experimental-strip-types --test tests/mangadex-relay.test.mjs tests/manga-volume-covers.test.mjs
```

Tests exercise target validation, credential isolation, request deduplication,
cache recovery, pagination and the app's relay URL. Live checks retrieved
20th Century Boys (22 covers), Berserk (43), and Slam Dunk (31).
