import test from "node:test";
import assert from "node:assert/strict";
import { readCatalogue } from "../services/kindle/api/amazon.ts";
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
    assert.equal(init.headers.Cookie, "session-id=secret-session");
    if (init.method === "GET") return new Response('"csrfToken":"private-csrf"');
    assert.equal(new URLSearchParams(init.body).get("activity"), "GetContentOwnershipData");
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
