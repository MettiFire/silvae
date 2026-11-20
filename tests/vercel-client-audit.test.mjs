import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("the client audit scans Vercel public output and leaves server credentials private", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "silvae-vercel-audit-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const publicDir = join(root, ".vercel/output/static/assets");
  const serverDir = join(root, ".vercel/output/functions/app.func");
  await mkdir(publicDir, { recursive: true });
  await mkdir(serverDir, { recursive: true });
  const fakeKey = "sb_secret_01234567890123456789";
  await writeFile(join(serverDir, "index.js"), `const key = "${fakeKey}";`);
  const script = new URL("../scripts/audit-client-secrets.mjs", import.meta.url);
  const run = () => spawnSync(process.execPath, [script.pathname, "--bundle"], {
    cwd: root, encoding: "utf8", timeout: 30000,
  });
  await writeFile(join(publicDir, "app.js"), "export const ready = true;");
  assert.equal(run().status, 0, "server-only code must not be treated as a public bundle");
  await writeFile(join(publicDir, "app.js"), `const key = "${fakeKey}";`);
  const failure = run();
  assert.equal(failure.status, 1);
  assert.match(failure.stderr, /Supabase secret key/);
  assert.ok(!failure.stderr.includes(fakeKey));
});
