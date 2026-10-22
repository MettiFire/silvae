// KOReader protocol adapter. Device credentials, not Supabase JWTs, authorize requests.
type Rpc = (name: string, args: Record<string, unknown>) => Promise<unknown>;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
export function createReaderHandler(rpc: Rpc, now = () => new Date()) {
  return async (req: Request): Promise<Response> => {
    const path = new URL(req.url).pathname.replace(/^.*\/reader-sync\/?/, "/");
    if (req.method === "GET" && path === "/healthcheck") return json({ state: "OK" });
    // Accounts are provisioned by the signed-in owner in the app, never anonymously.
    if (req.method === "POST" && path === "/users/create")
      return json(
        {
          code: 2002,
          message: "Crea il collegamento nella pagina Dispositivi e scegli Login in KOReader.",
        },
        403,
      );
    const connection = req.headers.get("x-auth-user") || "",
      credential = req.headers.get("x-auth-key") || "";
    if (!uuid.test(connection) || !/^[a-f0-9]{32}$/.test(credential))
      return json({ code: 2001, message: "Unauthorized" }, 401);
    try {
      await rpc("reader_kosync", { p_connection: connection, p_credential: credential });
    } catch {
      return json({ code: 2001, message: "Unauthorized" }, 401);
    }
    if (req.method === "GET" && path === "/users/auth") return json({ authorized: true });
    if (req.method === "GET" && path.startsWith("/syncs/progress/")) {
      const document = decodeURIComponent(path.slice("/syncs/progress/".length));
      if (!document || document.length > 500) return json({ message: "Invalid document" }, 400);
      try {
        const data = await rpc("reader_kosync", {
          p_connection: connection,
          p_credential: credential,
          p_document: document,
        });
        return data ? json(data) : json({});
      } catch {
        return json({ message: "Sync unavailable" }, 503);
      }
    }
    if (req.method === "PUT" && path === "/syncs/progress") {
      try {
        // Stream with a hard cap, including chunked requests.
        const reader = req.body?.getReader();
        let bytes = 0,
          text = "";
        const decoder = new TextDecoder();
        if (!reader) return json({ message: "Missing body" }, 400);
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
          if (bytes > 16384) {
            await reader.cancel();
            return json({ message: "Payload too large" }, 413);
          }
          text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode();
        const b = JSON.parse(text);
        if (
          !b ||
          typeof b !== "object" ||
          Array.isArray(b) ||
          typeof b.document !== "string" ||
          !b.document ||
          b.document.length > 500 ||
          typeof b.progress !== "string" ||
          b.progress.length > 1000 ||
          typeof b.percentage !== "number" ||
          !Number.isFinite(b.percentage) ||
          b.percentage < 0 ||
          b.percentage > 1 ||
          typeof b.device !== "string" ||
          b.device.length > 100 ||
          typeof b.device_id !== "string" ||
          b.device_id.length > 100
        )
          return json({ message: "Invalid progress" }, 400);
        const observed = now().toISOString();
        // KOReader does not transmit a reading timestamp: receive time is explicit in UI/docs.
        await rpc("ingest_reader_batch", {
          p_connection: connection,
          p_credential: credential,
          p_documents: [
            {
              external_id: b.document,
              title: typeof b.metadata?.title === "string" ? b.metadata.title.slice(0, 500) : "",
              authors:
                typeof b.metadata?.authors === "string"
                  ? [b.metadata.authors.slice(0, 300)]
                  : Array.isArray(b.metadata?.authors)
                    ? b.metadata.authors
                        .filter((a: unknown) => typeof a === "string")
                        .slice(0, 20)
                        .map((a: string) => a.slice(0, 300))
                    : [],
              percentage: Math.round(b.percentage * 10000) / 100,
              observed_at: observed,
              event_id: crypto.randomUUID(),
              locator: b.progress,
              device: b.device,
              device_id: b.device_id,
              finished: false,
            },
          ],
        });
        return json({
          document: b.document,
          timestamp: Math.floor(new Date(observed).getTime() / 1000),
        });
      } catch (e) {
        return e instanceof SyntaxError
          ? json({ message: "Invalid JSON" }, 400)
          : json({ message: "Sync unavailable" }, 503);
      }
    }
    return json({ message: "Not found" }, 404);
  };
}
