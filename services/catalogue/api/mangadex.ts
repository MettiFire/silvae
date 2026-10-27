const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "X-Content-Type-Options": "nosniff",
};
const cache = new Map<string, { body: string; until: number }>();
const pending = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();

// This is a public metadata endpoint, not an arbitrary URL proxy. Never forward
// request headers (in particular cookies or authorization) to MangaDex.
function upstreamUrl(request: Request) {
  if (request.url.length > 2000) throw Error("Invalid request");
  const params = new URL(request.url).searchParams;
  const resource = params.get("resource");
  const detail = resource?.startsWith("/manga/") && uuid.test(resource.slice(7));
  if (resource !== "/manga" && resource !== "/cover" && !detail) throw Error("Invalid resource");
  const allowed =
    resource === "/cover"
      ? ["manga[]", "limit", "offset", "order[volume]"]
      : ["title", "limit", "order[relevance]", "includes[]", "excludedTags[]", "contentRating[]"];
  const target = new URL(resource!, "https://api.mangadex.org");
  for (const [key, value] of params) {
    if (key === "resource") continue;
    if (!allowed.includes(key)) throw Error("Invalid parameter");
    if (key === "title" && (value.trim().length < 2 || value.length > 160))
      throw Error("Invalid title");
    if (
      key === "limit" &&
      (!/^\d+$/.test(value) || +value < 1 || +value > (resource === "/cover" ? 100 : 32))
    )
      throw Error("Invalid limit");
    if (key === "offset" && (!/^\d+$/.test(value) || +value > 9900)) throw Error("Invalid offset");
    if (["manga[]", "excludedTags[]"].includes(key) && !uuid.test(value))
      throw Error("Invalid identity");
    if (key === "includes[]" && !["cover_art", "author", "artist"].includes(value))
      throw Error("Invalid relation");
    if (key === "contentRating[]" && !["safe", "suggestive", "erotica"].includes(value))
      throw Error("Invalid rating");
    if (key.startsWith("order[") && !["asc", "desc"].includes(value)) throw Error("Invalid order");
    if (!key.endsWith("[]") && params.getAll(key).length !== 1) throw Error("Duplicate parameter");
    target.searchParams.append(key, value);
  }
  if (resource === "/cover" && params.getAll("manga[]").length !== 1)
    throw Error("One series required");
  if (resource === "/manga" && !params.get("title")) throw Error("Title required");
  if (!detail)
    target.searchParams.set("limit", params.get("limit") ?? (resource === "/cover" ? "100" : "32"));
  target.searchParams.sort();
  return target.href;
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { ...cors, "Access-Control-Max-Age": "86400" },
  });
}

export async function GET(request: Request) {
  let url: string;
  try {
    url = upstreamUrl(request);
  } catch {
    return Response.json(
      { error: "Invalid catalogue request" },
      { status: 400, headers: { ...cors, "Cache-Control": "no-store" } },
    );
  }
  try {
    const cached = cache.get(url);
    let body = cached && cached.until > Date.now() ? cached.body : undefined;
    if (!body) {
      let task = pending.get(url);
      if (!task) {
        if (pending.size >= 16) throw Error("Catalogue request queue full");
        const slot = queue
          .catch(() => undefined)
          .then(() => new Promise<void>((resolve) => setTimeout(resolve, 250)));
        queue = slot;
        task = slot
          .then(async () => {
            const response = await fetch(url, {
              headers: {
                Accept: "application/json",
                "User-Agent": "Silvae/1.0 (+https://silvae.lovable.app)",
              },
              redirect: "error",
              signal: AbortSignal.timeout(8000),
            });
            if (!response.ok) throw Error(`MangaDex HTTP ${response.status}`);
            const text = await response.text();
            if (text.length > 2000000) throw Error("Catalogue response too large");
            const data = JSON.parse(text);
            if (data.result !== "ok" || !data.data) throw Error("Invalid catalogue response");
            cache.set(url, { body: text, until: Date.now() + 3600000 });
            while (cache.size > 128) cache.delete(cache.keys().next().value!);
            return text;
          })
          .finally(() => pending.delete(url));
        pending.set(url, task);
      }
      body = await task;
    }
    return new Response(body, {
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error(
      "MangaDex metadata request failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      { error: "Catalogue temporarily unavailable" },
      { status: 502, headers: { ...cors, "Cache-Control": "no-store", "Retry-After": "30" } },
    );
  }
}
