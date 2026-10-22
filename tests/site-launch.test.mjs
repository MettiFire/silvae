import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { pageSeo, SITE_URL, SOCIAL_IMAGE, hasNotFoundMatch } from "../src/lib/site-seo.ts";
import { assertPublicClientKey } from "../src/lib/public-client-key.ts";
import { inspectClientText, inspectPublicEnv } from "../scripts/audit-client-secrets.mjs";
const jwt = (role) =>
  [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify({ role })).toString("base64url"),
    "signature",
  ].join(".");
test("Only browser-safe Supabase keys are accepted, without echoing rejected values", () => {
  assert.doesNotThrow(() => assertPublicClientKey("sb_publishable_public123"));
  assert.doesNotThrow(() => assertPublicClientKey(jwt("anon")));
  for (const secret of ["sb_secret_PRIVATE_DO_NOT_SHOW", jwt("service_role"), "broken"])
    assert.throws(
      () => assertPublicClientKey(secret),
      (error) => !error.message.includes(secret),
    );
  assert.equal(inspectPublicEnv({ VITE_GOOGLE_API_KEY: "not-public" }).length, 1);
  assert.equal(inspectPublicEnv({ VITE_SUPABASE_PUBLISHABLE_KEY: jwt("service_role") }).length, 1);
  assert.equal(inspectPublicEnv({ VITE_SUPABASE_PUBLISHABLE_KEY: jwt("anon") }).length, 0);
});
test("Compiled-bundle scanner catches privileged keys and injected server values", () => {
  assert.ok(inspectClientText(jwt("service_role")).includes("privileged JWT"));
  assert.ok(inspectClientText('const k="sb_secret_01234567890123456789"').length);
  assert.ok(
    inspectClientText("server-sentinel-value-for-build-audit", [
      "server-sentinel-value-for-build-audit",
    ]).length,
  );
  assert.deepEqual(inspectClientText(jwt("anon")), []);
});
test("Page metadata contains canonical, description and complete social previews", () => {
  const seo = pageSeo("Privacy — Paginae", "Come trattiamo i dati.", "/privacy");
  assert.equal(seo.links[0].href, SITE_URL + "/privacy");
  for (const name of [
    "og:title",
    "og:description",
    "og:image",
    "og:image:alt",
    "twitter:title",
    "twitter:description",
    "twitter:image",
    "twitter:image:alt",
  ])
    assert.ok(seo.meta.some((m) => (m.property ?? m.name) === name));
  assert.equal(seo.meta.find((m) => m.property === "og:image").content, SOCIAL_IMAGE);
  assert.ok(
    pageSeo("Account", "Pagina riservata", undefined, true).meta.some(
      (m) => m.name === "robots" && m.content.includes("noindex"),
    ),
  );
});
test("Crawler files exclude private screens and point to the correct production host", async () => {
  const robots = await fs.readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
  const sitemap = await fs.readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");
  assert.ok(robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`));
  for (const privatePath of ["/auth", "/settings", "/fragments", "/import"]) {
    assert.ok(robots.includes("Disallow: " + privatePath));
    assert.ok(!sitemap.includes("<loc>" + SITE_URL + privatePath));
  }
  for (const publicPath of ["/privacy", "/terms", "/discover"])
    assert.ok(sitemap.includes("<loc>" + SITE_URL + publicPath + "</loc>"));
});
test("Social image is a compressed 1200×630 PNG", async () => {
  const png = await fs.readFile(new URL("../public/images/paginae-social.png", import.meta.url));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length < 60000);
});

test("404 metadata survives old and new router not-found flags", () => {
  for (const match of [
    { status: "notFound" },
    { status: "success", _notFound: true },
    { status: "success", globalNotFound: true },
  ])
    assert.equal(hasNotFoundMatch([match]), true);
  assert.equal(hasNotFoundMatch([{ status: "success" }]), false);
});
