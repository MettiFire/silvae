import test from "node:test";
import assert from "node:assert/strict";
import { readCatalogue, collectionCsrf } from "../services/kindle/api/amazon.ts";
test("collection CSRF is decoded as the page script sees it and prefers the actual window assignment", () => {
  assert.equal(
    collectionCsrf('"csrfToken":"navigation-token"; var csrfToken = "collection-token";'),
    "collection-token",
  );
  assert.equal(
    collectionCsrf('"csrfToken":"example-value"; window.csrfToken = "real\\u002btoken\\u003d";'),
    "real+token=",
  );
  assert.equal(collectionCsrf('"csrfToken":"token&#x2f;value&#61;"'), "token/value=");
  assert.equal(collectionCsrf('"csrfToken":"token\\x2fvalue"'), "token/value");
});
test("catalogue exchanges credentials only with Amazon and returns no web session or unrelated account data", async () => {
  const calls = [];
  const result = await readCatalogue("it", "private-refresh", async (url, init) => {
    calls.push(url);
    assert.equal(init.redirect, "manual");
    if (url.endsWith("/cookies"))
      return Response.json({
        response: {
          tokens: {
            cookies: {
              ".amazon.it": [{ Name: "session-id", Value: "secret-session" }],
              ".evil.test": [{ Name: "evil", Value: "injected" }],
            },
          },
        },
      });
    if (init.method === "GET") {
      assert.equal(init.headers.Cookie, "session-id=secret-session");
      return new Response('"csrfToken":"private-csrf", "clientId":"collection-client"', {
        headers: { "Set-Cookie": "session-id=rotated-session; Domain=.amazon.it; Path=/; Secure" },
      });
    }
    assert.equal(init.headers.Cookie, "session-id=rotated-session");
    assert.equal(new URLSearchParams(init.body).get("activity"), "GetContentOwnershipData");
    assert.equal(new URLSearchParams(init.body).get("clientId"), "collection-client");
    const input = JSON.parse(new URLSearchParams(init.body).get("activityInput"));
    if (input.contentType === "Ebook") {
      assert.ok(input.originTypes.includes("Purchase"));
      assert.ok(input.originTypes.includes("KindleUnlimited"));
      assert.ok(!input.originTypes.includes("DeviceRegistration"));
    }
    return Response.json({
      items: [
        {
          asin: "A".repeat(32),
          title: "Example book",
          authors: ["Example Author"],
          orders: "private-orders",
        },
      ],
    });
  });
  assert.equal(result.items.length, 2);
  assert.ok(!JSON.stringify(result).includes("secret"));
  assert.ok(!JSON.stringify(result).includes("orders"));
  assert.ok(calls.every((url) => url.startsWith("https://www.amazon.it/")));
});
test("catalogue stops at redirects and unknown schemas rather than treating them as an empty library", async () => {
  let calls = 0;
  await assert.rejects(() =>
    readCatalogue("it", "refresh", async () => {
      calls++;
      return new Response(null, { status: 302, headers: { Location: "https://evil.test" } });
    }),
  );
  assert.equal(calls, 1);
  await assert.rejects(() => readCatalogue("it", "refresh", async () => Response.json({})));
});
