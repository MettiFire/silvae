const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const headers = { "Cache-Control": "no-store" };

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405, headers });
  const secret = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!secret) return new Response(null, { status: 401, headers });

  const url = new URL(request.url);
  const bookId = url.searchParams.get("book");
  const cover = url.searchParams.get("cover");
  if ((bookId?.length ?? 0) > 512 || (cover?.length ?? 0) > 1024)
    return new Response(null, { status: 400, headers });

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/run_cover_repair`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_secret: secret, p_book_id: bookId, p_cover_url: cover }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const status = error?.code === "42501" ? 401 : error?.code === "22023" ? 400 : 503;
    return new Response(null, { status, headers });
  }
  return Response.json(await response.json(), { headers });
});
