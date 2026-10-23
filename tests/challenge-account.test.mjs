import test from "node:test";
import assert from "node:assert/strict";
import { createEnrollment } from "../src/lib/reading-challenges.ts";
import {
  changeReadingChallenge,
  loadReadingChallenges,
  CHALLENGE_ACCOUNT_FIELD,
  encodeReadingChallenges,
  decodeReadingChallenges,
} from "../src/lib/challenge-account.ts";
const first = createEnrollment("strega", "2026-10-21T12:00:00Z"),
  second = createEnrollment("countries", "2026-10-21T12:00:00Z");
function mock(userId = "reader", initial = [first]) {
  let entries = initial;
  const updates = [];
  return {
    updates,
    client: {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: userId,
              user_metadata: { name: "Reader", [CHALLENGE_ACCOUNT_FIELD]: entries },
            },
          },
          error: null,
        }),
        updateUser: async ({ data }) => {
          updates.push(data);
          entries = data[CHALLENGE_ACCOUNT_FIELD];
          return { error: null };
        },
      },
    },
  };
}
test("Subscriptions persist through authenticated account storage and reload", async () => {
  const { client, updates } = mock();
  await changeReadingChallenge(client, "reader", { save: second });
  const loaded = await loadReadingChallenges(client, "reader");
  assert.deepEqual(loaded.map((e) => e.id).sort(), ["countries", "strega"]);
  assert.deepEqual(Object.keys(updates[0]), [CHALLENGE_ACCOUNT_FIELD]);
});
test("Changing one subscription preserves the other subscriptions and leaving removes only that path", async () => {
  const { client } = mock("reader", [first, second]);
  await changeReadingChallenge(client, "reader", { save: { ...second, includePast: false } });
  const loaded = await loadReadingChallenges(client, "reader");
  assert.equal(loaded.find((e) => e.id === "countries").includePast, false);
  await changeReadingChallenge(client, "reader", { remove: "strega" });
  assert.deepEqual(
    (await loadReadingChallenges(client, "reader")).map((e) => e.id),
    ["countries"],
  );
});
test("Changed identity cannot write another account’s subscriptions", async () => {
  const { client, updates } = mock("other");
  await assert.rejects(changeReadingChallenge(client, "reader", { save: second }), /Accedi/);
  assert.equal(updates.length, 0);
});
test("Failed account update reports an error instead of a successful enrolment", async () => {
  const { client } = mock();
  client.auth.updateUser = async () => ({ error: new Error("Offline") });
  await assert.rejects(changeReadingChallenge(client, "reader", { save: second }), /Offline/);
});

test("Compact preferences round-trip safely, including legacy arrays and corrupt strings", () => {
  const encoded = encodeReadingChallenges([first, second]);
  assert.equal(typeof encoded, "string");
  assert.ok(encoded.length < JSON.stringify([first, second]).length);
  assert.deepEqual(decodeReadingChallenges(encoded), [first, second]);
  assert.deepEqual(decodeReadingChallenges([first]), [first]);
  assert.deepEqual(decodeReadingChallenges("z1:broken"), []);
});
