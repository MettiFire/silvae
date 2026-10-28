import test from "node:test";
import assert from "node:assert/strict";
import {
  jobSignature,
  authorizedKindleJob,
  handleKindleJob,
  matchKindleLibrary,
} from "../src/lib/kindle-job.server.ts";
import { kindlePercentage } from "../src/lib/kindle-progress.ts";
import {
  metadataPositions,
  readWebProgress,
  inspectWhispersync,
} from "../services/kindle/api/amazon.ts";
const key = "a".repeat(64),
  now = Date.now(),
  body = JSON.stringify({
    action: "run",
    owner: "11111111-1111-1111-1111-111111111111",
    time: now,
  });
test("modern sync discovery uses only the authenticated identity and returns no tokens, profile values or reading records", async () => {
  const result = await inspectWhispersync("private-refresh", async (url, init) => {
    const path = String(url);
    assert.equal(init.redirect, "manual");
    if (path.endsWith("/auth/token")) return Response.json({ access_token: "private-access" });
    assert.equal(init.headers.Authorization, "Bearer private-access");
    if (path.endsWith("/user/profile"))
      return Response.json({ user_id: "amzn1.account.owner", email: "private-email" });
    assert.equal(
      path,
      "https://api.amazon.com/whispersync/v2/data/amzn1.account.owner/datasets?quiet=true",
    );
    return Response.json({
      datasets: [{ name: "kindle.most_recent_read", records: [{ value: "private-reading" }] }],
    });
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.names, ["kindle.most_recent_read"]);
  assert.ok(!JSON.stringify(result).includes("private"));
  let calls = 0;
  const missing = await inspectWhispersync("refresh", async () => {
    calls++;
    return Response.json(calls === 1 ? { access_token: "access" } : {});
  });
  assert.equal(missing.stage, "profile");
  assert.equal(calls, 2);
});
test("Whispersync reads only current book states and filters records to the selected book", async () => {
  const book = { key: "A".repeat(32), type: "PDOC" };
  const calls = [];
  const result = await inspectWhispersync(
    "refresh",
    async (url) => {
      const path = String(url);
      calls.push(path);
      if (path.endsWith("/auth/token")) return Response.json({ access_token: "access" });
      if (path.endsWith("/user/profile")) return Response.json({ user_id: "owner" });
      if (path.includes("/datasets?"))
        return Response.json({
          datasets: [
            {
              name: "CurrentStates",
              namespace: "BookReadStates",
              links: {
                records: "/whispersync/v2/data/owner/datasets/BookReadStates/CurrentStates/records",
              },
            },
            {
              name: "NotebookEntries",
              namespace: "NoteEntriesProd",
              links: { records: "https://evil.test/private" },
            },
          ],
        });
      return Response.json({
        records: [
          {
            key: `PDOC:${book.key}`,
            value: { state: "reading" },
            lastUpdatedTime: "2026-10-28T07:55:17Z",
          },
          { key: "other", value: "other-book-private" },
        ],
      });
    },
    book,
  );
  assert.equal(result.reading.count, 2);
  assert.equal(result.reading.matches.length, 1);
  assert.ok(!JSON.stringify(result).includes("other-book-private"));
  assert.ok(calls.every((x) => x.startsWith("https://api.amazon.com/")));
});
test("scheduled requests authenticate the complete payload and expire before any private data is accessed", async () => {
  const signature = jobSignature(body, key);
  assert.ok(authorizedKindleJob(body, signature, key, now));
  assert.equal(
    authorizedKindleJob(body.replace("11111111", "22222222"), signature, key, now),
    null,
  );
  assert.equal(authorizedKindleJob(body, signature, key, now + 61000), null);
  let called = false;
  const response = await handleKindleJob(
    new Request("https://example.test/api/kindle-job", { method: "POST", body }),
    { KINDLE_JOB_KEY: key },
    async () => {
      called = true;
      throw Error();
    },
  );
  assert.equal(response.status, 401);
  assert.equal(called, false);
});
test("Whispersync never forwards account credentials to off-host or another-owner record links",async()=>{
 for(const link of ["https://evil.test/records","https://api.amazon.com/whispersync/v2/data/someone-else/datasets/records"]){let calls=0;const result=await inspectWhispersync("refresh",async(url)=>{calls++;const path=String(url);if(path.endsWith("/auth/token"))return Response.json({access_token:"access"});if(path.endsWith("/user/profile"))return Response.json({user_id:"owner"});return Response.json({datasets:[{name:"CurrentStates",namespace:"BookReadStates",links:{records:link}}]});},{key:"A".repeat(32),type:"PDOC"});assert.equal(calls,3);assert.equal(result.reading,undefined);}
});
test("percentage uses a verified same-edition total, never an annotation end or assumed scale", () => {
  const reading = { key: "A".repeat(32), type: "PDOC", status: "available", position: 30 };
  assert.equal(kindlePercentage(reading, { start: 10, end: 110 }).percentage, 20);
  assert.equal(kindlePercentage(reading, { end: 110 }).percentage, undefined);
  assert.equal(kindlePercentage(reading, { start: 40, end: 110 }).percentage, undefined);
  assert.equal(kindlePercentage(reading, { percentage: 20 }).percentage, undefined);
  assert.equal(
    kindlePercentage({ ...reading, position: 110 }, { start: 10, end: 110 }).percentage,
    100,
  );
  assert.equal(
    kindlePercentage({ ...reading, type: "EBOK" }, { percentage: 0 }).percentage,
    undefined,
  );
  assert.equal(
    metadataPositions(
      'loadMetadata({"asin":"B000000001","startPosition":10,"endPosition":110});',
      "B000000002",
    ),
    null,
  );
  assert.deepEqual(metadataPositions('loadMetadata({"startPosition":10,"endPosition":110});'), {
    start: 10,
    end: 110,
  });
  assert.equal(metadataPositions('arbitraryCode({"startPosition":10,"endPosition":110});'), null);
});
test("signed format diagnostics bind a bounded book and revision to the existing job capability", () => {
  const data = {
    action: "run",
    owner: "11111111-1111-1111-1111-111111111111",
    time: now,
    probe: { key: "A".repeat(32), type: "PDOC", version: "CR!" + "A".repeat(28) },
  };
  const payload = JSON.stringify(data);
  assert.ok(authorizedKindleJob(payload, jobSignature(payload, key), key, now));
  for (const probe of [
    { ...data.probe, version: "CR!ABC&url=evil" },
    { ...data.probe, key: "../private" },
    { ...data.probe, type: "OTHER" },
  ]) {
    const invalid = JSON.stringify({ ...data, probe });
    assert.equal(authorizedKindleJob(invalid, jobSignature(invalid, key), key, now), null);
  }
  assert.equal(
    authorizedKindleJob(payload.replace("PDOC", "EBOK"), jobSignature(payload, key), key, now),
    null,
  );
});
test("automatic association requires one exact title and an author match", () => {
  const book = { title: "Example Book", authors: ["Example Author"] };
  const item = { books: { title: "Example Book", authors: ["Example Author"] } };
  assert.equal(matchKindleLibrary(book, [item]), item);
  assert.equal(matchKindleLibrary(book, [item, item]), undefined);
  assert.equal(matchKindleLibrary({ ...book, authors: ["Another Author"] }, [item]), undefined);
  assert.equal(matchKindleLibrary({ ...book, title: "Example Book Volume 2" }, [item]), undefined);
});

test("reader metadata never leaks session cookies to a CDN and unsupported documents remain unknown", async () => {
  const pdoc = { key: "A".repeat(32), type: "PDOC" },
    ebook = { key: "B000000001", type: "EBOK" };
  const result = await readWebProgress("it", "test-refresh", [pdoc, ebook], async (url, init) => {
    const href = String(url);
    if (href.endsWith("/cookies"))
      return Response.json({
        response: {
          tokens: { cookies: { ".amazon.it": [{ Name: "session-id", Value: "private-session" }] } },
        },
      });
    if (href.startsWith("https://k4wyjmetadata.s3.amazonaws.com")) {
      assert.equal(init.headers, undefined);
      assert.equal(init.credentials, "omit");
      return new Response(
        'loadMetadata({"asin":"B000000001","startPosition":10,"endPosition":1010});',
      );
    }
    assert.equal(init.headers.Cookie, "session-id=private-session");
    if (href.includes("getDeviceToken")) {
      assert.equal(new URL(href).hostname, "leggi.amazon.it");
      return Response.json({ deviceSessionToken: "reader-private" });
    }
    if (href.includes("kindle-library/search"))
      return Response.json({ itemsList: [{ asin: ebook.key, percentageRead: 50 }] });
    if (href.includes(pdoc.key))
      return Response.json({ downloadRestrictionReason: "ContentUnsupported" });
    return Response.json({
      metadataUrl:
        "https://k4wyjmetadata.s3.amazonaws.com/books2/B000000001/version/book/YJmetadata.jsonp",
    });
  });
  assert.equal(result[0].status, "unsupported");
  assert.equal(result[0].percentage, undefined);
  assert.equal(result[1].start, 10);
  assert.equal(result[1].end, 1010);
  assert.equal(result[1].percentage, 50);
  assert.ok(!JSON.stringify(result).includes("private"));
});
