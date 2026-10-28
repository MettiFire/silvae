# Silvae Amazon transport

Deployed with the owner's approval on 27 October 2026. Production:
https://silvae-kindle.vercel.app/api/amazon

Project `prj_dLJVvWAgz7rCMrxu0beDbPs4SvnJ`, Frankfurt (`fra1`), Node 24.
Unsigned live requests are rejected with HTTP 401. A complete account registration
still requires the account holder's authorization on Amazon.

The Lovable worker could not reach Amazon's code-pair endpoint in the live test.
This independent Node 24 function forwards four fixed Amazon authentication
endpoints for Italy/US, a fixed read-only Kindle metadata endpoint, and the
fixed CDE sidecar endpoint for a validated PDOC/EBOK identifier. Sidecar requests
require ADP signing headers, an empty body and the signed server envelope.

The signed `/kindle/catalogue` operation exchanges an existing refresh token for
a temporary Amazon web session and reads only Kindle collection metadata.
Cookies stay in invocation memory; only sanitized titles/authors/content IDs are
returned. The application requires additional explicit consent before calling
this operation. There is no arbitrary URL, cookie forwarding API or account-wide
proxy. Server logs contain operation names and HTTP status only.
Every request requires a fresh Ed25519 signature; no browser CORS or browser-cookie
forwarding, arbitrary target URL, credential persistence, or request body logging.
Responses are never cached. It has no access to the database or encryption key.

Deployment root: `services/kindle`. Configure `KINDLE_RELAY_VERIFY_KEY` as base64
SPKI DER on Vercel, and the corresponding `KINDLE_RELAY_PRIVATE_KEY` as base64
PKCS8 DER in Lovable server Secrets. Generate a random Ed25519 key pair; do not
commit either a real private key or a personal authorization payload. The verify
key is public. The request signing key differs from `KINDLE_CLOUD_KEY`.

The app only uses this transport when the signing secret is configured.
Deploy production as `silvae-kindle.vercel.app`; keep preview deployments protected.
The relay has no scheduler or storage. Background jobs run on the managed database;
no paid scheduler integration is required.

`/kindle/progress` shares the same temporary session and accepts at most five content
identifiers. It reads Kindle Web Reader progress and delivery metadata only. Signed
metadata URLs are restricted to the known metadata S3 bucket, matching content ID
and metadata path; cookies and device credentials are never sent to that CDN.
No rendering, book-content or DRM endpoint is used.

Deployments use the Vercel connector with these tracked files as the source;
Git metadata alone is not a configured automatic deployment trigger.

Run `node --experimental-strip-types --test tests/kindle-relay.test.mjs` from the
repository root. Tests cover signature expiry/tampering, fixed targets, cookie
rejection and the complete signed app-to-relay request with synthetic data.
