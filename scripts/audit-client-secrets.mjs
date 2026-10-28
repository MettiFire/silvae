import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnv } from "vite";
export function inspectClientText(text, secrets = []) {
  const findings = [];
  if (/sb_secret_[A-Za-z0-9_-]{16,}/.test(text)) findings.push("Supabase secret key");
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) findings.push("private key");
  if (/AIza[A-Za-z0-9_-]{30,}/.test(text)) findings.push("Google API key");
  for (const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
    try {
      if (JSON.parse(Buffer.from(token.split(".")[1], "base64url")).role === "service_role")
        findings.push("privileged JWT");
    } catch {}
  }
  if (secrets.some((value) => value.length >= 16 && text.includes(value)))
    findings.push("server-only environment value");
  return [...new Set(findings)];
}
export function inspectPublicEnv(env) {
  const allowed = new Set([
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PROJECT_ID",
  ]);
  const errors = Object.keys(env)
    .filter((key) => key.startsWith("VITE_") && !allowed.has(key))
    .map((key) => `${key}: public variable not approved`);
  if (env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    try {
      const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const publishable = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
      const anon =
        key.startsWith("eyJ") &&
        JSON.parse(Buffer.from(key.split(".")[1], "base64url")).role === "anon";
      if (!publishable && !anon) throw new Error("Invalid public key");
    } catch {
      errors.push("VITE_SUPABASE_PUBLISHABLE_KEY: expected publishable or anon key");
    }
  }
  return errors;
}
async function files(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
    ),
  );
  return nested.flat();
}
async function main() {
  const modeIndex = process.argv.indexOf("--mode");
  const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : "production";
  const env = {
    ...loadEnv(mode, process.cwd(), ""),
    ...process.env,
  };
  const errors = inspectPublicEnv(env);
  if (process.argv.includes("--bundle")) {
    const secrets = Object.entries(env)
      .filter(
        ([key, value]) =>
          !key.startsWith("VITE_") &&
          /(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|API_KEY|KINDLE_CLOUD_KEY|KINDLE_JOB_KEY|SERVICE_ROLE_KEY|DATABASE_URL|DB_MIGRATION_URL|DB_URL)$/.test(
            key,
          ) &&
          typeof value === "string",
      )
      .map(([, value]) => value);
    const outDir = await fs
      .access(".output/public")
      .then(() => ".output/public")
      .catch(() => "dist/client");
    for (const file of await files(outDir))
      if (/\.(?:js|html|map)$/.test(file)) {
        const text = await fs.readFile(file, "utf8");
        for (const finding of inspectClientText(text, secrets)) errors.push(`${file}: ${finding}`);
      }
  }
  if (errors.length) {
    console.error("Client secret audit failed (values redacted):\n" + errors.join("\n"));
    process.exitCode = 1;
  } else
    console.log(
      process.argv.includes("--bundle")
        ? "Client bundle secret audit passed."
        : "Public environment key audit passed.",
    );
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  await main();
