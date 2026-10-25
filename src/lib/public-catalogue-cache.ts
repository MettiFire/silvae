type Result = { status: number; json: string };
/** Process-local cache for public metadata only. Never use for account requests. */
export function createPublicCatalogueCache(
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
) {
  const cache = new Map<string, { value: Result; expires: number }>();
  const pending = new Map<string, Promise<Result>>();
  let quotaUntil = 0;
  return async (url: string): Promise<Result> => {
    const cached = cache.get(url);
    if (cached && cached.expires > now()) return cached.value;
    if (quotaUntil > now()) return { status: 429, json: "" };
    const current = pending.get(url);
    if (current) return current;
    const request = (async () => {
      const response = await fetcher(url, { signal: AbortSignal.timeout(8000) });
      if (response.status === 429) quotaUntil = now() + 60_000;
      if (!response.ok) return { status: response.status, json: "" };
      const json = await response.text();
      // Do not retain broken HTML/JSON responses from an upstream proxy.
      JSON.parse(json);
      const value = { status: 200, json };
      cache.delete(url);
      cache.set(url, { value, expires: now() + 180_000 });
      while (cache.size > 200) cache.delete(cache.keys().next().value!);
      return value;
    })();
    pending.set(url, request);
    try {
      return await request;
    } finally {
      pending.delete(url);
    }
  };
}
