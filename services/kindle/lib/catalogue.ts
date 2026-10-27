import { Buffer } from "node:buffer";
/** Session cookies exist only inside this invocation and are never returned or logged. */
export async function readCatalogue(
  region: "it" | "com",
  refreshToken: string,
  fetcher: typeof fetch = fetch,
) {
  const base = `https://www.amazon.${region}`;
  const request = async (url: string, init: RequestInit, max = 2_000_000) => {
    const response = await fetcher(url, {
      ...init,
      redirect: "manual",
      credentials: "omit",
      signal: AbortSignal.timeout(12_000),
    });
    console.info(
      "[Kindle collection]",
      new URL(url).pathname.endsWith("/cookies")
        ? "session"
        : init.method === "GET"
          ? "csrf"
          : "titles",
      response.status,
    );
    if (response.status !== 200) throw Error("Amazon collection unavailable");
    const text = await response.text();
    if (Buffer.byteLength(text) > max) throw Error("Amazon collection unavailable");
    return text;
  };
  const exchanged = JSON.parse(
    await request(
      `${base}/ap/exchangetoken/cookies`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          app_name: "Audible",
          app_version: "4.60",
          source_token: refreshToken,
          source_token_type: "refresh_token",
          requested_token_type: "auth_cookies",
          domain: `.amazon.${region}`,
        }),
      },
      150_000,
    ),
  );
  const domains = exchanged?.response?.tokens?.cookies;
  if (!domains || typeof domains !== "object") throw Error("Amazon collection unavailable");
  const cookies = new Map<string, string>();
  for (const [domain, rows] of Object.entries(domains)) {
    if (
      ![`.amazon.${region}`, `amazon.${region}`, `www.amazon.${region}`].includes(domain) ||
      !Array.isArray(rows)
    )
      continue;
    for (const row of rows) {
      if (typeof row?.Name !== "string" || typeof row?.Value !== "string") continue;
      const value = row.Value.replaceAll('"', "");
      if (
        /^[A-Za-z0-9_-]{1,100}$/.test(row.Name) &&
        /^[\x21-\x7e]{1,16000}$/.test(value) &&
        !/[;\\]/.test(value)
      )
        cookies.set(row.Name, value);
    }
  }
  if (!cookies.size) throw Error("Amazon collection unavailable");
  const cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  if (cookie.length > 64_000) throw Error("Amazon collection unavailable");
  const page = `${base}/hz/mycd/digital-console/contentlist/pdocs/dateDsc/`;
  const html = await request(page, { method: "GET", headers: { Cookie: cookie } });
  const csrf =
    /csrfToken["']?\s*[:=]\s*["']([^"']{5,4096})["']/.exec(html)?.[1] ??
    /name=["']csrfToken["']\s+value=["']([^"']{5,4096})["']/.exec(html)?.[1];
  if (!csrf) throw Error("Amazon collection unavailable");
  const items: { key: string; type: "PDOC" | "EBOK"; title: string; authors: string[] }[] = [];
  let partial = false;
  for (const type of ["PDOC", "EBOK"] as const) {
    // Bounded page, loaded on demand. Large collections expose an explicit partial flag.
    const input = {
      contentType: type === "PDOC" ? "KindlePDoc" : "Ebook",
      contentCategoryReference: type === "PDOC" ? "pdocs" : "booksAll",
      itemStatusList: ["Active"],
      showSharedContent: false,
      fetchCriteria: {
        sortOrder: "DESCENDING",
        sortIndex: "DATE",
        startIndex: 0,
        batchSize: 100,
        totalContentCount: -1,
      },
      surfaceType: "LargeDesktop",
    };
    const data = JSON.parse(
      await request(`${base}/hz/mycd/digital-console/ajax`, {
        method: "POST",
        headers: {
          Cookie: cookie,
          Referer: page,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          activity: "GetContentOwnershipData",
          activityInput: JSON.stringify(input),
          csrfToken: csrf,
        }),
      }),
    );
    const rows = data?.items ?? data?.GetContentOwnershipData?.items;
    if (data.success === false || !Array.isArray(rows))
      throw Error("Amazon collection unavailable");
    if (rows.length >= 100) partial = true;
    for (const row of rows.slice(0, 100)) {
      if (
        typeof row?.asin !== "string" ||
        !/^[A-Z0-9]{10,64}$/.test(row.asin) ||
        typeof row.title !== "string" ||
        !row.title.trim()
      )
        continue;
      const authors =
        typeof row.authors === "string"
          ? [row.authors]
          : Array.isArray(row.authors)
            ? row.authors
            : typeof row.author === "string"
              ? [row.author]
              : [];
      if (!items.some((item) => item.key === row.asin && item.type === type))
        items.push({
          key: row.asin,
          type,
          title: row.title.slice(0, 500),
          authors: authors
            .filter((a: unknown) => typeof a === "string")
            .slice(0, 5)
            .map((a: string) => a.slice(0, 150)),
        });
    }
  }
  return { items, partial };
}
