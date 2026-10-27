import test from "node:test";
import assert from "node:assert/strict";
import { deleteOwnAccount } from "../src/lib/delete-account.ts";
const clientFor = (id = "reader", rpc = async () => ({ data: true, error: null })) => ({
  auth: { getUser: async () => ({ data: { user: id ? { id } : null }, error: null }) },
  rpc,
});
test("Account deletion requires exact confirmation and a verified matching user", async () => {
  let calls = 0;
  const rpc = async () => {
    calls++;
    return { data: true, error: null };
  };
  await assert.rejects(deleteOwnAccount(clientFor("reader", rpc), "reader", "elimina"), /ELIMINA/);
  await assert.rejects(deleteOwnAccount(clientFor("other", rpc), "reader", "ELIMINA"), /sessione/);
  await assert.rejects(deleteOwnAccount(clientFor(null, rpc), "reader", "ELIMINA"), /sessione/);
  assert.equal(calls, 0);
  await deleteOwnAccount(
    clientFor("reader", async (name, args) => {
      assert.equal(name, "delete_own_account");
      assert.deepEqual(args, { p_expected_user_id: "reader", p_confirmation: "ELIMINA" });
      calls++;
      return { data: true, error: null };
    }),
    "reader",
    "ELIMINA",
  );
  assert.equal(calls, 1);
});
test("Unavailable migration or failed backend never reports successful deletion", async () => {
  await assert.rejects(
    deleteOwnAccount(
      clientFor("reader", async () => ({ error: { code: "PGRST202" } })),
      "reader",
      "ELIMINA",
    ),
    /non è ancora attiva/,
  );
  await assert.rejects(
    deleteOwnAccount(
      clientFor("reader", async () => ({ data: false, error: null })),
      "reader",
      "ELIMINA",
    ),
    /non confermata/,
  );
  await assert.rejects(
    deleteOwnAccount(
      clientFor("reader", async () => ({ error: new Error("Database failure") })),
      "reader",
      "ELIMINA",
    ),
    /Database failure/,
  );
});
test("Profile and fragment photos are removed only for the verified owner before deleting the account", async () => {
  const events = [];
  const listed = new Set();
  const client = {
    ...clientFor("reader", async () => {
      events.push("delete-account");
      return { data: true, error: null };
    }),
    storage: {
      from: (bucket) => {
        assert.ok(["profile-images", "fragment-photos"].includes(bucket));
        return {
          list: async (folder) => {
            assert.equal(folder, "reader");
            if (listed.has(bucket)) return { data: [], error: null };
            listed.add(bucket);
            return { data: [{ id: "file", name: "avatar.webp" }], error: null };
          },
          remove: async (paths) => {
            assert.deepEqual(paths, ["reader/avatar.webp"]);
            events.push(`remove-${bucket}`);
            return { error: null };
          },
        };
      },
    },
  };
  await deleteOwnAccount(client, "reader", "ELIMINA");
  assert.deepEqual(events, ["remove-profile-images", "remove-fragment-photos", "delete-account"]);
});
test("Profile image removal failure keeps the account; environments without the new bucket still support deletion", async () => {
  let deleted = false;
  const client = {
    ...clientFor("reader", async () => {
      deleted = true;
      return { data: true, error: null };
    }),
    storage: {
      from: () => ({ list: async () => ({ error: { message: "Storage unavailable" } }) }),
    },
  };
  await assert.rejects(deleteOwnAccount(client, "reader", "ELIMINA"), /immagini/);
  assert.equal(deleted, false);
  client.storage.from = () => ({ list: async () => ({ error: { message: "Bucket not found" } }) });
  await deleteOwnAccount(client, "reader", "ELIMINA");
  assert.equal(deleted, true);
});
