import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import {
  openKobo,
  sealKobo,
  readKoboLibrary,
  koboUpdates,
  type KoboState,
} from "./kobo-cloud.server.ts";
const signature = (body: string, key: string) =>
  createHmac("sha256", Buffer.from(key, "hex")).update(body).digest("hex");
export function authorizeKoboJob(body: string, signed: string, key: string, now = Date.now()) {
  if (
    body.length > 4096 ||
    !/^[a-f0-9]{64}$/.test(key) ||
    !/^[a-f0-9]{64}$/.test(signed) ||
    !timingSafeEqual(Buffer.from(signed, "hex"), Buffer.from(signature(body, key), "hex"))
  )
    return null;
  try {
    const p = JSON.parse(body);
    return p.provider === "kobo" &&
      p.action === "run" &&
      typeof p.time === "number" &&
      Number.isFinite(p.time) &&
      Math.abs(now - p.time) <= 60000 &&
      typeof p.owner === "string" &&
      /^[a-f0-9-]{36}$/i.test(p.owner)
      ? { owner: p.owner as string }
      : null;
  } catch {
    return null;
  }
}
export async function handleKoboJob(
  request: Request,
  env: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
) {
  const json = (value: unknown, status = 200) =>
    Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
  const key = env["KINDLE_JOB_KEY"] ?? "",
    cloudKey = env["KINDLE_CLOUD_KEY"] ?? "";
  if (!/^[a-f0-9]{64}$/.test(key) || !/^[a-f0-9]{64}$/.test(cloudKey))
    return json({ error: "Unavailable" }, 503);
  const signed = request.headers.get("x-silvae-job-signature") ?? "";
  if (request.method !== "POST" || !/^[a-f0-9]{64}$/.test(signed))
    return json({ error: "Unauthorized" }, 401);
  const reader = request.body?.getReader();
  let body = "",
    size = 0;
  const decoder = new TextDecoder();
  if (reader)
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return json({ error: "Too large" }, 413);
      }
      body += decoder.decode(part.value, { stream: true });
    }
  body += decoder.decode();
  const input = authorizeKoboJob(body, signed, key);
  if (!input) return json({ error: "Unauthorized" }, 401);
  const apiKey =
    env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env?.["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!apiKey) return json({ error: "Unavailable" }, 503);
  const rpc = async (data: Record<string, unknown>) => {
    const payload = JSON.stringify({
      ...data,
      provider: "kobo",
      owner: input.owner,
      time: Date.now(),
    });
    const response = await fetcher(
      "https://eouwfswqnpjgorlkrnyt.supabase.co/rest/v1/rpc/kobo_cloud_job",
      {
        method: "POST",
        headers: { apikey: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_payload: payload, p_signature: signature(payload, key) }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) throw Error();
    return response.json();
  };
  try {
    const claim = await rpc({ action: "claim" });
    if (!claim) return json({ skipped: true });
    let ciphertext = claim.ciphertext,
      updates: unknown[] = [],
      error = false,
      original: KoboState | null = null;
    try {
      original = openKobo(claim.ciphertext, input.owner, cloudKey);
      if (original.phase !== "connected") throw Error();
      const current = await readKoboLibrary(original),
        planned = koboUpdates(current, claim.library);
      ciphertext = sealKobo({ ...current, mappings: planned.mappings }, input.owner, cloudKey);
      updates = planned.updates;
    } catch {
      error = true;
      if (original) ciphertext = sealKobo(original, input.owner, cloudKey);
    }
    const result = await rpc({ action: "finish", lease: claim.lease, ciphertext, updates, error });
    return json({ ok: !!result, ...result, error });
  } catch {
    return json({ error: "Unavailable" }, 503);
  }
}
