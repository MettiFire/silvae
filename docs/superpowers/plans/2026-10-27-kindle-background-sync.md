# Kindle background progress

User-authorized continuation of the working title-based sync. Keep Amazon credentials
encrypted on the existing Lovable backend, temporary web sessions in relay memory,
and explicit per-user revocable consent for background reads.

1. Reuse the web-session transport to retrieve reader progress and same-edition
   position totals; treat unsupported personal-document totals as unknown.
2. Persist book associations and advance scan cursors in the encrypted state.
   Match existing library entries only with unambiguous title/author identity;
   expose uncertain or missing associations for confirmation rather than guessing.
3. Run consented accounts with Supabase's existing scheduler. Authenticate narrow
   job operations with a separate HMAC key in Vault and Lovable Secrets; do not
   copy encryption keys or grant a service-role key to Vercel.
4. Apply updates atomically with owner, session, row-version and observation-time
   guards. Preserve finished/abandoned books and newer manual edits. Set completion
   only from verified progress; preserve raw positions when percentages are unknown.
5. Test authentication/replay/ownership/cancellation and progress calculations;
   deploy, verify a scheduled run and the real document without fabricated values.

The managed database is absent from the Supabase connector; use the authenticated
Lovable SQL editor for migration and scheduler setup. No paid scheduler or native client.
