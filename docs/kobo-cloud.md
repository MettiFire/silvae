# Kobo account sync

Silvae's experimental Kobo connection uses the device activation protocol. It is
independent of Kobo and StoryGraph; it is not an approved partner integration.

## What StoryGraph does

Kobo's official integration is a direct partnership, announced June 29, 2026.
Users connect through Kobo account settings → Integrations → StoryGraph. Kobo
shares percentages, reading sessions and finish dates. Kobo's documentation limits
this to store purchases and Kobo Plus, excluding sideloaded files. No public
registration process or reusable StoryGraph partner credentials was found during
this investigation. Silvae would need its own agreement to offer that same
official integration; no contact was made on the user's behalf.

Sources:
- https://help.kobo.com/hc/en-us/articles/41397329904919-About-Storygraph
- https://help.kobo.com/hc/en-us/articles/40276991427223-Sync-Your-Kobo-Reading-Progress-with-StoryGraph
- https://www.kobo.com/news/media-alert-read-on-kobo-track-on-storygraph-new-integration-now-live
- https://buttondown.com/nodunayo/archive/the-one-woman-dev-team-diaries-227/

## Sending personal books

Compatible devices can download files from Dropbox/Google Drive. Independent
services such as send2ereader transfer a file through the device's browser. These
transfers do not turn a personal EPUB into a Kobo-store entitlement or upload its
reading state to Kobo's account cloud. They do not solve progress synchronization.
Kobo also documents email delivery through Dropbox's email-upload feature, with
a compatible reader and a paid Dropbox account. This is still a file transfer,
not a Kobo personal-document cloud equivalent to Amazon Send to Kindle.

- https://www.kobo.com/blog/accessing-cloud-files-on-your-kobo-ereader
- https://www.kobo.com/blog/how-to-email-books-to-your-kobo
- https://help.kobo.com/hc/en-us/articles/43753873356055-Missing-books-reading-stats-or-notes-after-Kobo-software-update
- https://github.com/daniel-j/send2ereader

## Silvae implementation

Settings → Devices → Kobo starts a ten-minute activation. Login and passwords
stay on Kobo. Only the public activation code is returned to the browser; the
workflow URL and access/refresh tokens stay encrypted on the backend.
Consent explains that device credentials are not technically read-only; Silvae's
implementation restricts its own requests to the listed metadata operations.
The existing
server encryption key is reused with a separate `silvae-kobo-v1:<owner>` AES-GCM
authenticated-data namespace. Kindle ciphertext remains compatible and cannot be
opened as Kobo ciphertext. The relay is not used for Kobo.

The client requests only fixed activation, polling, device-auth, refresh and
library-sync endpoints. It rejects redirects and non-Kobo polling URLs, limits
response bytes and fetches at most four incremental pages per operation. Sync
tokens and the matching catalogue snapshot are committed together; a failed fetch
does not advance the cursor. Rotated auth tokens are retained even on a later
fetch failure. No downloads, annotations, purchases or remote state writes occur.

Verified reading dates come from the reading-state/bookmark record, never from
entitlement creation. Percentages are validated in 0–100, not inferred from pages.
Bookmark and status modification dates remain distinct: finishing a book with an
unchanged bookmark still updates its status, without re-dating the old percentage
or replacing a newer manual percentage with an older bookmark.
New positive reading progress updates uniquely matching books already in Silvae's
library. Ambiguous matches need an explicit owner-confirmed association. To link
a book absent from Silvae, add it to the library first. Duplicate Kobo editions
targeting one library item use the newest reading record only. Kobo's documented
Finished-under-90% rule maps to abandoned; other Finished records map to read.
Finished/abandoned local books and newer manual edits are preserved. Owner, session,
row-version and timestamp checks happen atomically in the database.

Automatic access is separately opt-in and is due at three UTC slots per day
(00:00, 08:00 and 16:00). A minute-by-minute database dispatcher drains due accounts
in batches of ten; it does not contact Kobo for accounts whose next slot is not
due. This avoids limiting the entire service to thirty account checks per day.
Full-payload HMAC verification is provider-bound; it uses
the existing private scheduler secret, never a service-role credential. Disconnect
removes stored tokens, disables jobs and invalidates in-flight leases. It does not
claim to invalidate all Kobo-side sessions: the device protocol's revocation
behavior has not been verified.

The account catalogue includes up to 2,000 entries in this first version and the
server commits up to 100 library changes per pass. Kobo Plus entries can be present
in the same catalogue; purchased ebooks are the initial validation target.

Protocol references (schemas inspected; implementation code not copied):
- https://github.com/Falx/kobo-ts-notify/blob/main/backend/src/auth/auth.service.ts
- https://github.com/janeczku/calibre-web/blob/master/cps/kobo.py

## Verification

Tests exercise activation URL restrictions, private-field filtering, owner/provider
encryption binding, token rotation, incremental pages, removal, malformed progress,
HMAC expiry/tampering, ambiguous matches, finished books, dates, edition deduplication,
and database ownership/lease/session/manual-conflict/disconnect rules.

The unauthenticated Kobo activation page was verified from the development host.
After publication, the public Silvae backend also generated a valid activation
code and a fixed `https://www.kobo.com/activate` link. The pending test connection
was cancelled without logging into any Kobo account; no automatic access was enabled.
The schema was applied to the managed database. The rollback-only live SQL test
passed owner privileges, real HMAC verification, leases, cancellation, a reading
update and a concurrent manual edit, without retaining any fixture data.
It also verified status-only completion without overwriting the saved percentage.
The complete automated suite passed 323 tests; TypeScript, production build and
the client-bundle secret audit passed. An independent review's scheduling and
status-timestamp findings were corrected and rechecked before release.
A purchased-book end-to-end test requires an authorized Kobo account containing
reading activity. Mocked protocol tests are not evidence that a particular real
account's cloud progress is available. No Kobo password, token or personal book
identifier belongs in this repository or test fixtures.
