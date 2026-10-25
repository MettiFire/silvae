import test from "node:test";
import assert from "node:assert/strict";
import {
  parseFragmentFeedback,
  changeFragmentFeedback,
  preferredFragmentPool,
} from "../src/lib/fragment-feedback.ts";
test("less-author feedback validates, deduplicates names, is reversible and has bounded account size", () => {
  const first = changeFragmentFeedback([], "José Saramago", "2026-10-25", true);
  assert.equal(changeFragmentFeedback(first, "Jose Saramago", "2026-10-25", true).length, 1);
  assert.deepEqual(changeFragmentFeedback(first, "José Saramago", "2026-10-25", false), []);
  assert.deepEqual(parseFragmentFeedback([{ author: "bad", since: "2026-02-31" }]), []);
  assert.equal(
    parseFragmentFeedback(
      Array.from({ length: 100 }, (_, i) => ({ author: `Author ${i}`, since: "2026-10-25" })),
    ).length,
    40,
  );
});
test("less-author feedback replaces today's author, reduces later frequency, and keeps the page usable for a one-author pool", () => {
  const pool = [{ author: "José Saramago" }, { author: "Jane Austen" }];
  const feedback = changeFragmentFeedback([], pool[0].author, "2026-10-25", true);
  assert.deepEqual(preferredFragmentPool(pool, feedback, "2026-10-25"), [pool[1]]);
  let allowed = 0;
  for (let day = 1; day <= 30; day++)
    if (
      preferredFragmentPool(pool, feedback, `2026-11-${String(day).padStart(2, "0")}`).length === 2
    )
      allowed++;
  assert.ok(allowed > 0 && allowed < 15);
  assert.deepEqual(preferredFragmentPool([pool[0]], feedback, "2026-10-25"), [pool[0]]);
});

test("account feedback reads fresh state, changes only its field and refuses a changed identity", async () => {
  const { saveFragmentAuthorFeedback } = await import("../src/lib/fragment-feedback-account.ts");
  let metadata = {
    reading_preferences_v1: { fragmentLanguages: ["it", "en"] },
    fragment_author_feedback_v1: [{ author: "Existing author", since: "2026-10-24" }],
  };
  let id = "reader";
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id, user_metadata: metadata } }, error: null }),
      updateUser: async ({ data }) => {
        metadata = { ...metadata, ...data };
        return { error: null };
      },
    },
  };
  await saveFragmentAuthorFeedback(client, "reader", "New author", "2026-10-25", true);
  assert.equal(metadata.fragment_author_feedback_v1.length, 2);
  assert.deepEqual(metadata.reading_preferences_v1.fragmentLanguages, ["it", "en"]);
  id = "other";
  await assert.rejects(
    saveFragmentAuthorFeedback(client, "reader", "Other", "2026-10-25", true),
    /Accedi/,
  );
});
