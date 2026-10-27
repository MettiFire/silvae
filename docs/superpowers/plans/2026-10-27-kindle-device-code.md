# Kindle device-code implementation

Goal: replace the nonfunctional pasted-return-URL experiment with real Amazon device authorization in the existing web app.

Architecture: authenticated TanStack server functions own the Amazon protocol. One owner-scoped database row holds an AES-256-GCM encrypted state; the encryption key is a Lovable server secret. The browser receives only the public authorization code and connection status. Atomic database leases serialize registration, cancellation invalidates in-flight saves, and expired pending codes are discarded. No passwords, cookies or private device keys enter client responses, browser storage or logs.

The user explicitly requested direct implementation without additional design interviews. Use the existing checkout and inline execution.

- [ ] Test code-pair validation, polling/error distinctions, encryption/owner binding and response redaction.
- [ ] Implement protocol and authenticated persistence; replace the manual URL interface with code authorization, waiting, cancellation and disconnect.
- [ ] Apply additive RLS migration and configure server encryption secret in Lovable.
- [ ] Verify tests, TypeScript, build/client-secret audit and live authentication boundary; push and publish.
- [ ] Human authorizes a real Amazon code; verify registration and reading-data access separately. Never label authorization as working progress synchronization.

Private upstream device authentication is experimental, not official Kindle OAuth. Amazon may reject registration or Kindle endpoints. A last-read position without a documented total is not an exact reading percentage. Do not modify library progress until a trustworthy event can be established.
