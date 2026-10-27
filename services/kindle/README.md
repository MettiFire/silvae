# Silvae Amazon transport

Prepared, **not deployed or enabled**. Activation requires the owner's approval
to process Amazon authorization requests on their Vercel account.

The Lovable worker could not reach Amazon's code-pair endpoint in the live test.
This independent Node 24 function forwards only four fixed Amazon authentication
endpoints for Italy/US. Every request requires a fresh Ed25519 signature; no CORS,
cookies, arbitrary target URL, credential persistence, or request body logging.
Responses are never cached. It has no access to the database or encryption key.

Deployment root: `services/kindle`. Configure `KINDLE_RELAY_VERIFY_KEY` as base64
SPKI DER on Vercel, and the corresponding `KINDLE_RELAY_PRIVATE_KEY` as base64
PKCS8 DER in Lovable server Secrets. Generate a random Ed25519 key pair; do not
commit either a real private key or a personal authorization payload. The verify
key is public. The request signing key differs from `KINDLE_CLOUD_KEY`.

The app only uses this transport when the signing secret is configured.
Deploy production as `silvae-kindle.vercel.app`; keep preview deployments protected.
No new storage, scheduled jobs or paid integrations are required.

Run `node --experimental-strip-types --test tests/kindle-relay.test.mjs` from the
repository root. Tests cover signature expiry/tampering, fixed targets, cookie
rejection and the complete signed app-to-relay request with synthetic data.
