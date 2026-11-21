import { createHash, timingSafeEqual } from "node:crypto";
import { resolveVerifiedCover } from "./verified-cover.server";

const responseHeaders = { "Cache-Control": "no-store" };
const hash = (secret: string) => createHash("sha256").update(secret).digest();

export async function handleCoverRepairJob(request: Request) {
  const secret = process.env["CRON_SECRET"];
  if (!secret) return new Response("Job unavailable", { status: 503, headers: responseHeaders });
  if (!timingSafeEqual(hash(request.headers.get("authorization") ?? ""), hash(`Bearer ${secret}`)))
    return new Response("Unauthorized", { status: 401, headers: responseHeaders });

  const supabaseUrl = process.env["SUPABASE_URL"];
  if (!supabaseUrl)
    return new Response("Job unavailable", { status: 503, headers: responseHeaders });
  const rpc = async (book?: string, cover?: string): Promise<{ book_id: string }[]> => {
    const url = new URL("/functions/v1/cover-repair", supabaseUrl);
    if (book && cover) url.search = new URLSearchParams({ book, cover }).toString();
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`Cover repair queue returned ${response.status}`);
    return response.json();
  };
  const data = await rpc().catch(() => null);
  if (!data) {
    return new Response("Job unavailable", { status: 503, headers: responseHeaders });
  }
  const results = await Promise.all(
    data.map(async ({ book_id }) => {
      try {
        const cover_url = await resolveVerifiedCover(book_id);
        if (!cover_url) return "unresolved";
        await rpc(book_id, cover_url);
        return "resolved";
      } catch {
        return "retry";
      }
    }),
  );
  return Response.json(
    {
      checked: results.length,
      resolved: results.filter((result) => result === "resolved").length,
      unresolved: results.filter((result) => result === "unresolved").length,
      retry: results.filter((result) => result === "retry").length,
    },
    { headers: responseHeaders },
  );
}
