# Kindle device-code implementation

Goal: replace the nonfunctional pasted-return-URL experiment with real Amazon device authorization in the existing web app.

Architecture: authenticated TanStack server functions own the Amazon protocol. One owner-scoped database row holds an AES-256-GCM encrypted state; the encryption key is a Lovable server secret. The browser receives only the public authorization code and connection status. Atomic database leases serialize registration and cancellation, and expired pending codes are discarded. No passwords, cookies or private device keys enter client responses, browser storage or logs.

The user explicitly requested direct implementation without additional design interviews. Use the existing checkout and inline execution.

- [x] Test code-pair validation, polling/error distinctions, encryption/owner binding and response redaction.
- [x] Implement protocol and authenticated persistence; replace the manual URL interface with code authorization, waiting, cancellation and disconnect.
- [x] Apply additive RLS migration and configure server encryption secret in Lovable.
- [x] Verify tests, TypeScript, build/client-secret audit; push and publish. Live test found an outbound-network blocker on the Lovable worker.
- [ ] Human authorizes a real Amazon code; verify registration and reading-data access separately. Never label authorization as working progress synchronization.

Private upstream device authentication is experimental, not official Kindle OAuth. Amazon may reject registration or Kindle endpoints. A last-read position without a documented total is not an exact reading percentage. Do not modify library progress until a trustworthy event can be established.

Follow-up: an optional signed, fixed-destination Node transport is prepared in
`services/kindle`. The owner approved Vercel processing on 27 October 2026;
the Frankfurt service is deployed and rejects unsigned requests. The signing
private key is configured only in Lovable; Vercel holds only its public key.
Live authorization and Kindle data retrieval remain to be validated.
