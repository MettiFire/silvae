/** Public catalogue only: never cache account data or unsuccessful responses. */
export function createOpenLibrarySearch(fetcher: typeof fetch = fetch) {
  const cache = new Map<string, { expires: number; json: string }>();
  const pending = new Map<string, Promise<{ status: number; json: string }>>();
  return async (params: Record<string, string>) => {
    const query = new URLSearchParams(
      Object.entries(params).sort(([a], [b]) => a.localeCompare(b)),
    );
    const key = query.toString();
    const stored = cache.get(key);
    if (stored && stored.expires > Date.now()) return { status: 200, json: stored.json };
    const existing = pending.get(key);
    if (existing) return existing;
    const request = (async () => {
      const response = await fetcher(`https://openlibrary.org/search.json?${query}`, {
        signal: AbortSignal.timeout(12000),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return { status: response.status, json: "" };
      const json = await response.text();
      // Validate before caching: proxies can return an HTML error with HTTP 200.
      const payload = JSON.parse(json) as { docs?: unknown };
      if (!Array.isArray(payload.docs)) throw new Error("Invalid catalogue response");
      if (cache.size >= 200) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: Date.now() + 180000, json });
      return { status: 200, json };
    })();
    pending.set(key, request);
    try {
      return await request;
    } finally {
      pending.delete(key);
    }
  };
}
