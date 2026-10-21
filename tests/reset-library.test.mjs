import test from 'node:test';
import assert from 'node:assert/strict';
import { resetUserLibrary } from '../src/lib/reset-library.ts';

test('Reset deletes only the signed-in user library, never the shared catalogue', async () => {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'anna' } }, error: null }) },
    from: table => { calls.push(['table', table]); return { delete: opts => { calls.push(['delete', opts]); return { eq: async (column, value) => { calls.push(['eq', column, value]); return { error: null, count: 12 }; } }; } }; },
  };
  assert.equal(await resetUserLibrary(client, 'anna'), 12);
  assert.deepEqual(calls, [['table', 'library_items'], ['delete', { count: 'exact' }], ['eq', 'user_id', 'anna']]);
});
test('Changed or expired session prevents every deletion', async () => {
  let called = false;
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'someone-else' } }, error: null }) }, from: () => { called = true; } };
  await assert.rejects(resetUserLibrary(client, 'anna'), /sessione/);
  assert.equal(called, false);
});
test('A failed deletion propagates an error rather than reporting success', async () => {
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'anna' } }, error: null }) }, from: () => ({ delete: () => ({ eq: async () => ({ error: new Error('Database non disponibile'), count: null }) }) }) };
  await assert.rejects(resetUserLibrary(client, 'anna'), /Database/);
});
