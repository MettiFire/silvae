import test from "node:test";
import assert from "node:assert/strict";
import { createKindleWebAttempt, inspectKindleReturn } from "../src/lib/kindle-web-auth.ts";

test("web attempt uses PKCE and the chosen Amazon region without embedded credentials", async () => {
  const attempt = await createKindleWebAttempt("it", "reader", 1000);
  const url = new URL(attempt.url);
  assert.equal(url.origin, "https://www.amazon.it");
  assert.equal(url.searchParams.get("openid.oa2.scope"), "device_auth_access");
  assert.equal(url.searchParams.get("openid.oa2.code_challenge_method"), "S256");
  const digest = Buffer.from(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(attempt.verifier)),
  ).toString("base64url");
  assert.equal(url.searchParams.get("openid.oa2.code_challenge"), digest);
  assert.ok(!attempt.url.includes(attempt.verifier));
  assert.equal(attempt.expiresAt, 601000);
  assert.equal(new URL((await createKindleWebAttempt("com", "reader")).url).host, "www.amazon.com");
  await assert.rejects(createKindleWebAttempt("evil", "reader"));
});

test("return checking is bound to account, region, origin and expiration", async () => {
  const attempt = await createKindleWebAttempt("it", "reader", 1000);
  const valid = "https://www.amazon.it/ap/maplanding?openid.oa2.authorization_code=temporary-code";
  assert.equal(inspectKindleReturn(attempt, "reader", valid, 2000), true);
  for (const url of [
    "https://evil.test/ap/maplanding?openid.oa2.authorization_code=temporary-code",
    "https://www.amazon.it.evil.test/ap/maplanding?openid.oa2.authorization_code=temporary-code",
    "https://www.amazon.it@evil.test/ap/maplanding?openid.oa2.authorization_code=temporary-code",
    valid.replace("https:", "http:"),
    valid.replace("amazon.it", "amazon.com"),
    valid.replace("/ap/maplanding", "/ap/mfa"),
    valid.replace("amazon.it/", "amazon.it:444/"),
    valid + "&openid.oa2.authorization_code=another",
    valid + "#untrusted",
    valid.replace("temporary-code", ""),
    "not a URL",
  ])
    assert.throws(() => inspectKindleReturn(attempt, "reader", url, 2000));
  assert.throws(() => inspectKindleReturn(attempt, "other", valid, 2000));
  assert.throws(() => inspectKindleReturn(attempt, "reader", valid, attempt.expiresAt));
});

test("format checking never returns the code or claims that the device is registered", async () => {
  const attempt = await createKindleWebAttempt("it", "reader", 1000);
  assert.equal(
    inspectKindleReturn(
      attempt,
      "reader",
      "https://www.amazon.it/ap/maplanding?openid.oa2.authorization_code=secret",
      2000,
    ),
    true,
  );
  const a = await createKindleWebAttempt("it", "reader", 1000);
  assert.notEqual(a.verifier, attempt.verifier);
  assert.notEqual(a.url, attempt.url);
});

test("a 404 landing address is usable only when it contains a code, for both marketplaces", async () => {
  for (const region of ["it", "com"]) {
    const attempt = await createKindleWebAttempt(region, "reader", 1000);
    const landing = new URL(`https://www.amazon.${region}/ap/maplanding`);
    landing.searchParams.set("openid.mode", "id_res");
    landing.searchParams.set(
      "openid.identity",
      `https://www.amazon.${region}/ap/id/synthetic-account`,
    );
    assert.throws(
      () => inspectKindleReturn(attempt, "reader", landing.href, 2000),
      /manca il codice/,
    );
    landing.searchParams.set("openid.oa2.authorization_code", "synthetic-temporary-code");
    assert.equal(inspectKindleReturn(attempt, "reader", landing.href, 2000), true);
  }
});
