# Kobo cloud sync

Implement the requested store-purchased-book case in Silvae's existing server-function,
encrypted-state and owner-scoped database architecture. This is an independent,
experimental Kobo device-protocol integration, not StoryGraph's partner API.

1. Verify the public activation page and document the StoryGraph partnership and
   personal-file transfer limitations. Never require passwords, cookies or tokens
   to be copied into Silvae.
2. Add a bounded server-only client: activation code, private workflow polling,
   device token exchange, single token refresh, incremental catalogue/reading-state
   retrieval. Fix all hosts and paths; reject redirects and unexpected poll URLs.
3. Store credentials encrypted with owner/provider binding, inaccessible by table
   reads. Owner-only leases serialize manual and scheduled operations. Disconnect
   clears ciphertext and cancels jobs. Reuse the existing server encryption key
   with a separate Kobo authenticated-data namespace.
4. Apply verified percentages/status dates to uniquely matched owned books or an
   explicit owner-confirmed association. Compare owner, reading session, row version
   and progress timestamp atomically. Preserve finished/abandoned books and newer
   manual edits. Do not derive percentages from page counts or timestamps.
5. Add settings controls for connection, sync, association and opt-in automatic
   checks three times daily. Keep personal EPUBs outside the cloud feature.
6. Test activation parsing/SSRF, token privacy/refresh, catalogue deltas/pagination,
   malformed and stale progress, manual/session conflicts, SQL authorization,
   disconnect races and schedule behavior. Run typecheck, build and client audit.
7. Apply the migration, publish and verify anonymous activation from the deployed
   backend. A real purchased-book end-to-end test requires an authorized Kobo
   account with reading activity; clearly report this limit if none is available.

Sources: Kobo's StoryGraph support pages and June 2026 announcement; the independent
Falx/kobo-ts-notify activation implementation and calibre-web protocol schema.
No third-party implementation code is copied into Silvae.
