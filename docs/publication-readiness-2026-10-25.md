# Publication privacy check — 25 October 2026

Scope: tracked source at `4e446f3` and all reachable local Git history (177 commits,
918 unique file versions; repository is not shallow). This is a source disclosure
check, not a complete application vulnerability assessment.

## Results

- No real private keys or privileged API credentials identified. Searched for PEM
  private keys, Supabase secret keys and privileged JWTs, GitHub, AWS, Google,
  Stripe and Slack key formats, credential-bearing URLs and literal credential
  assignments. Reviewed matches without exposing credential values.
- Secret-shaped matches in `tests/site-launch.test.mjs` are synthetic test values.
  Other credential assignment matches are UI labels, input attributes, validation
  code and test fixtures.
- The tracked `.env` contains only Supabase URLs/project identifiers and publishable
  keys, including their `VITE_` counterparts. These are intentionally public client
  configuration, not service-role credentials. `.env` remains tracked for the
  existing Lovable setup; `.gitignore` alone does not untrack an existing file.
- The privacy contact appears in legal configuration and the Wikiquote importer
  user-agent. This is the deliberately public contact chosen for the site.
  Other email addresses are test fixtures under `example.test`.
- No personal home directory paths, reader exports, session JSON files, database
  dumps, ZIP archives or private-key files identified in reachable history. The
  tracked CSV is the import template. No unexplained binary files were found.
- Local Kindle session/progress JSON, environment overrides and local files are
  already ignored. Keep downloaded device connection files out of Git as well.

No sensitive finding requiring history rewriting or credential rotation was
identified. Never put server credentials under `VITE_`; the existing build audit
checks public environment keys and compiled client assets. Recheck new commits
before changing visibility. Pattern scanning cannot prove the absence of every
possible secret; hosted secrets, production data, GitHub Actions artifacts,
issues and other external systems are outside this check.

## Author search and graphic novels

Author rows now work in every search mode, including Manga. Shared catalogue IDs
merge alias results while conflicting biographical dates continue to separate
namesakes. Autocomplete treats compact and spaced initials consistently and
cannot reuse a single surname to match multiple query words.

Volume tracking currently applies only to MangaDex/MyAnimeList-backed series IDs.
Graphic novels retrieved as Open Library/Google Books records remain individual
books. A future general series model should keep book format separate from volume
progress; this change does not migrate or reclassify existing library entries.

Validation: author matching/identity/account tests, including regression cases for
shared IDs, conflicting birth dates, dotted initials and unrelated substrings.
