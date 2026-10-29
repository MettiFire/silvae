# Dead-code cleanup — 29 October 2026

## Scope and evidence

Behavior-preserving cleanup of application code and template remnants. Findings
were listed in chat before deletion. No feature, database, API-route, deployment,
authentication or reader-sync behavior is intentionally changed.

The scan combined TypeScript unused-local/parameter diagnostics, syntax-tree
inspection of static and literal dynamic imports, exported-symbol references,
repository-wide searches, and inspection of routing, build configuration, service
entrypoints, tests, scripts, public URLs, CSS, the web manifest and service worker.
Reference absence alone was not treated as proof for generated or external files.

## Removed

| Finding | Reason |
| --- | --- |
| 40 UI template modules, listed below | No application, script, test or configuration consumers. Internal references existed only within the unused template group; no computed UI loader was found. |
| `src/components/FollowedAuthors.tsx` | No importer. The active `ReaderProfile` already renders followed authors. |
| `src/hooks/use-mobile.tsx` | Only consumer was the removed template sidebar. |
| `booksByAuthor`, `withCover`, `GENRES` in `src/lib/books.ts` | No callers or references. Active author pages, cover retrieval and genre filtering use other paths. |
| `uniqueRecommendationWorks` in `src/lib/work-identity.ts` | No callers. Active recommendation identity helpers remain. |
| `newReaderSecret`, `readerConfiguration` in `src/lib/reader-connections.ts` | No callers; remnants of the old connection-creation UI. Existing reader connections, imports and sync handlers remain. |
| `inspectKindleWhispersync`, `inspectKindleLastRead` in `src/lib/kindle-cloud.server.ts` | Uncalled investigation helpers. Active native-version and recent-read lookups remain. |
| Four response-schema logging blocks and a log-only XML tag list | Temporary introspection in Kindle metadata, book, native-position and web-reader lookups. Parsing, bounds, result handling, request-status logs and error logs remain. |
| `challengeSlots` and `UiLanguage` imports | TypeScript confirms neither import is read in its importing module. |

Removed modules under `src/components/ui/`:

```text
accordion alert aspect-ratio avatar badge breadcrumb calendar card carousel chart
checkbox collapsible command context-menu drawer form hover-card input-otp input
label menubar navigation-menu pagination progress radio-group resizable
scroll-area select separator sheet sidebar skeleton slider switch table tabs
textarea toggle-group toggle tooltip
```

The six used UI modules remain: `alert-dialog`, `button`, `dialog`,
`dropdown-menu`, `popover` and `sonner`.

## Deliberately retained

- Every page/API route and generated route tree: TanStack uses generated routing.
- `src/server.ts`: configured as the custom server entry in `vite.config.ts`.
- Generated Supabase admin/cron helpers: apparently unreferenced locally, but
  explicitly generated integration files; external tooling ownership is uncertain.
- Drizzle/Supabase migrations, snapshots, schema and configuration: migration
  history and deployment tooling are not ordinary import-graph consumers.
- Brand images, icon variants, fonts and licenses, offline page, CSV template,
  service worker, manifest, robots and sitemap: public/build/browser contracts.
  `favicon.ico` is retained for implicit browser requests.
- Fragment JSON files: selected through the runtime archive manifest.
- Both USB bridge copies: one is the maintained script, one the public download;
  an existing test explicitly verifies that they match.
- Operational scripts and their CLI output, service error logs, security comments
  and failure-handling comments: these are functional/documentary, not debug junk.
- Dependency manifests and lockfile: no speculative package pruning or toolchain
  regeneration was included in the source cleanup.

## Verification

Baseline: 323 Node tests passed; production build and client secret audit passed.
The compiler's optional unused checks found the two imports removed above.

Final cleanup verification passed: all 323 Node tests, production build/client
audit, TypeScript with `--noUnusedLocals --noUnusedParameters`, catalogue-service
TypeScript and `git diff --check`. Independent review found no missed consumers.
ESLint's unused-variable rule was also checked across `src`
and `services`; no unused-variable/import diagnostics remained. Full ESLint is
not clean: existing formatting, React refresh and hook-dependency diagnostics
remain outside this behavior-preserving cleanup.

No public assets were deleted on uncertain evidence. Static analysis cannot
prove the absence of every external consumer; generated/configuration-owned
entrypoints were therefore preserved.
