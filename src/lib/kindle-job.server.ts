import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import {
  openState,
  sealState,
  kindleCatalogue,
  probeKindleBook,
  enrichKindleProgress,
  inspectNativeKindleBook,
  inspectKindleWhispersync,
} from "./kindle-cloud.server.ts";
import { kindleTitleKey, sameKindleAuthor } from "./kindle-progress.ts";
import type { KindleBook, KindleBookReading, KindleCatalogue } from "./kindle-cloud.ts";
import { validKindleBook } from "./kindle-cloud.ts";

export function jobSignature(body: string, key: string) {
  return createHmac("sha256", Buffer.from(key, "hex")).update(body).digest("hex");
}
export function authorizedKindleJob(
  body: string,
  signature: string,
  key: string,
  now = Date.now(),
) {
  if (
    !/^[a-f0-9]{64}$/.test(key) ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    Buffer.byteLength(body) > 4096
  )
    return null;
  if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(jobSignature(body, key), "hex")))
    return null;
  try {
    const value = JSON.parse(body);
    if (
      value.probe !== undefined &&
      (!validKindleBook(value.probe) ||
        typeof value.probe.version !== "string" ||
        !/^(?:_LATEST_|CR![A-Z0-9]{10,100})$/.test(value.probe.version))
    )
      return null;
    return value.action === "run" &&
      typeof value.time === "number" &&
      Number.isFinite(value.time) &&
      Math.abs(now - value.time) <= 60_000 &&
      /^[a-f0-9-]{36}$/i.test(value.owner)
      ? (value as { owner: string; time: number; probe?: KindleBook & { version: string } })
      : null;
  } catch {
    return null;
  }
}
type Item = {
  id: string;
  book_id: string;
  status: string;
  started_at: string | null;
  updated_at: string;
  progress_updated_at: string | null;
  reading_session_id: string;
  books: { title: string; authors: string[] };
};
export function matchKindleLibrary(book: KindleCatalogue["items"][number], library: Item[]) {
  const matches = library.filter(
    (item) =>
      kindleTitleKey(item.books.title) === kindleTitleKey(book.title) &&
      sameKindleAuthor(item.books.authors, book.authors),
  );
  return matches.length === 1 ? matches[0] : undefined;
}
export async function handleKindleJob(
  request: Request,
  env: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
) {
  const json = (value: unknown, status = 200) =>
    Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const key = env["KINDLE_JOB_KEY"] ?? "",
    signature = request.headers.get("x-silvae-job-signature") ?? "";
  if (!/^[a-f0-9]{64}$/.test(key)) return json({ error: "Unavailable" }, 503);
  if (!/^[a-f0-9]{64}$/.test(signature)) return json({ error: "Unauthorized" }, 401);
  const reader = request.body?.getReader();
  let body = "";
  if (reader) {
    const decoder = new TextDecoder();
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return json({ error: "Too large" }, 413);
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
  }
  const input = authorizedKindleJob(body, signature, key);
  if (!input) return json({ error: "Unauthorized" }, 401);
  const cloudKey = env["KINDLE_CLOUD_KEY"] ?? "";
  const apiKey =
    env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env?.["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!apiKey || !/^[a-f0-9]{64}$/.test(cloudKey)) return json({ error: "Unavailable" }, 503);
  const rpc = async (data: Record<string, unknown>) => {
    const payload = JSON.stringify({ ...data, owner: input.owner, time: Date.now() });
    const response = await fetcher(
      "https://eouwfswqnpjgorlkrnyt.supabase.co/rest/v1/rpc/kindle_cloud_job",
      {
        method: "POST",
        headers: { apikey: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ p_payload: payload, p_signature: jobSignature(payload, key) }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) throw Error("Job unavailable");
    return response.json();
  };
  let claim: { lease: string; ciphertext: string; library: Item[]; since: string } | null;
  try {
    claim = await rpc({ action: "claim" });
  } catch {
    return json({ error: "Unavailable" }, 503);
  }
  if (!claim) return json({ skipped: true });
  const updates: Record<string, unknown>[] = [];
  let probe: KindleBookReading["nativeReading"];
  let modern: unknown;
  let ciphertext = claim.ciphertext,
    unknown = 0,
    unmatched = 0,
    error = false;
  try {
    let state = openState(claim.ciphertext, input.owner, cloudKey);
    if (state.phase !== "connected") throw Error();
    if (input.probe)
      probe = await inspectNativeKindleBook(state, input.probe, undefined, input.probe.version);
    if (input.probe) modern = await inspectKindleWhispersync(state);
    const catalogue = await kindleCatalogue(state);
    const mappings = state.mappings ?? {};
    const candidates = catalogue.items.filter((book) => {
      const map = mappings[`${book.type}:${book.key}`];
      const item = map
        ? claim.library.find((row) => row.id === map.libraryId)
        : matchKindleLibrary(book, claim.library);
      return !item || !["read", "abandoned"].includes(item.status);
    });
    const priority = candidates
      .filter((book) => {
        const m = mappings[`${book.type}:${book.key}`];
        return (
          m &&
          claim.library.some(
            (item) =>
              item.id === m.libraryId &&
              item.reading_session_id === m.sessionId &&
              item.status === "reading",
          )
        );
      })
      .slice(0, 3);
    const rest = candidates.filter((book) => !priority.includes(book));
    const cursor = (state.scanCursor ?? 0) % Math.max(1, rest.length);
    const selected = [
      ...priority,
      ...[...rest.slice(cursor), ...rest.slice(0, cursor)].slice(0, 10 - priority.length),
    ];
    const readings: KindleBookReading[] = [];
    for (let i = 0; i < selected.length; i += 3)
      readings.push(
        ...(await Promise.all(
          selected
            .slice(i, i + 3)
            .map((book) =>
              probeKindleBook(state as Extract<typeof state, { phase: "connected" }>, book),
            ),
        )),
      );
    const enriched = await enrichKindleProgress(state, readings);
    const pending: KindleCatalogue["items"] = [];
    const positions = state.positions ?? {};
    for (const reading of enriched.readings) {
      if (reading.status !== "available" || !reading.position || !reading.updatedAt) {
        unknown++;
        continue;
      }
      if (reading.percentage === undefined) unknown++;
      positions[`${reading.type}:${reading.key}`] = {
        position: reading.position,
        updatedAt: reading.updatedAt,
        ...(reading.percentage === undefined ? {} : { percentage: reading.percentage }),
      };
      const book = selected.find((b) => b.key === reading.key && b.type === reading.type)!;
      const map = mappings[`${book.type}:${book.key}`];
      const item = map
        ? claim.library.find(
            (row) => row.id === map.libraryId && row.reading_session_id === map.sessionId,
          )
        : matchKindleLibrary(book, claim.library);
      const event = {
        position: reading.position,
        observed: new Date(reading.updatedAt).toISOString(),
        ...(reading.percentage === undefined ? {} : { percentage: reading.percentage }),
      };
      if (item) {
        updates.push({
          ...event,
          id: item.id,
          session: item.reading_session_id,
          version: item.updated_at,
        });
        mappings[`${book.type}:${book.key}`] = {
          libraryId: item.id,
          sessionId: item.reading_session_id,
        };
      } else if (!map && reading.updatedAt >= Date.parse(claim.since)) {
        // Only public, already-catalogued metadata can be added automatically.
        const url = new URL("https://eouwfswqnpjgorlkrnyt.supabase.co/rest/v1/books");
        url.searchParams.set("select", "id,title,authors");
        url.searchParams.set("title", `eq.${book.title}`);
        url.searchParams.set("limit", "3");
        const response = await fetcher(url, {
          headers: { apikey: apiKey },
          signal: AbortSignal.timeout(10_000),
        });
        const data = response.ok ? await response.json() : [];
        const matches = Array.isArray(data)
          ? data.filter(
              (row: { authors: string[] }) =>
                Array.isArray(row.authors) && sameKindleAuthor(row.authors, book.authors),
            )
          : [];
        if (matches.length === 1) updates.push({ ...event, newBookId: matches[0].id });
        else {
          unmatched++;
          pending.push(book);
        }
      }
    }
    state = {
      ...state,
      mappings,
      totals: enriched.totals,
      scanCursor: (cursor + Math.max(1, 10 - priority.length)) % Math.max(1, rest.length),
      pendingTitles: pending.slice(0, 10),
      positions: Object.fromEntries(
        Object.entries(positions)
          .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
          .slice(0, 100),
      ),
    };
    ciphertext = sealState(state, input.owner, cloudKey);
  } catch {
    error = true;
    updates.length = 0;
  }
  try {
    const result = await rpc({
      action: "finish",
      lease: claim.lease,
      ciphertext,
      updates,
      unknown,
      unmatched,
      error,
    });
    return json({
      ok: !!result,
      ...result,
      ...(probe ? { probe } : {}),
      ...(modern ? { modern } : {}),
    });
  } catch {
    return json({ error: "Unavailable" }, 503);
  }
}
