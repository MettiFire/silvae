# Local library cache

The authenticated browser restores the previous account's own library snapshot
from IndexedDB before rendering authenticated routes. Existing TanStack Query
freshness still applies: library data remains fresh for two minutes, book details
for five minutes, and older data refreshes in the background. The original query
timestamps are retained; reloading never makes old data artificially fresh.

Only `library` for the current user, owned `book` details keyed by content language,
and owned manga volume-cover metadata are persisted. Fragments, reviews, profiles,
authentication data, tokens and mutations are excluded. Cover URLs are cached;
image bytes remain subject to the browser's normal HTTP cache. This is a faster
repeat-loading path, not a complete offline application or offline write queue.

There is one snapshot per browser origin, bounded to 200 queries and approximately
8 MB. Entries expire after seven days. Account changes and logout clear it, and
late restores/writes are ordered so they cannot revive another account's data.
Library invalidation after mutations discards the old persisted snapshot before
the network refresh; removed books cannot be restored from that snapshot.
Unsupported, blocked or full storage falls back to normal network loading.

Book detail pages reuse the saved library row as a temporary preview for regular
books and reuse its reading state while refreshing. Manga pages require actual
series metadata before exposing tracking controls. Previously opened full detail
and manga-cover queries can be restored directly from their own cached results.

Verification includes owner/language isolation, expiry, newer-data precedence,
mutation invalidation, empty libraries, logout/restore races and storage failures.
A Codex browser fixture exercised real IndexedDB: the initial load fetched one
synthetic library, a full reload restored it with zero simulated network requests,
and clearing the account cache returned the next load to the loading path.
No real account data was used in the fixture.
