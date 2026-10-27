import { createPublicKey, verify } from "node:crypto";
import { Buffer } from "node:buffer";

const paths = new Set([
  "/auth/create/codepair",
  "/auth/register",
  "/auth/token",
  "/auth/deregister",
  "/kindle/metadata",
  "/kindle/sidecar",
  "/kindle/catalogue",
]);
const allowedHeaders = new Set([
  "content-type",
  "accept",
  "x-amzn-identity-auth-domain",
  "x-amz-access-token",
  "x-adp-token",
  "x-adp-alg",
  "x-adp-signature",
]);
const responseHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex",
};
const failure = (status: number) =>
  new Response(JSON.stringify({ error: "Amazon relay unavailable" }), {
    status,
    headers: responseHeaders,
  });

/** Private server-to-server transport. No cookies, browser CORS, storage or body logs. */
export async function handleAmazonRelay(
  request: Request,
  verifyKey = process.env["KINDLE_RELAY_VERIFY_KEY"],
  fetcher: typeof fetch = fetch,
) {
  if (request.method !== "POST") return failure(405);
  if (!verifyKey) return failure(503);
  const timestamp = request.headers.get("x-silvae-time") ?? "";
  const signature = request.headers.get("x-silvae-signature") ?? "";
  if (
    !/^\d{13}$/.test(timestamp) ||
    Math.abs(Date.now() - Number(timestamp)) > 60_000 ||
    !/^[A-Za-z0-9+/]{86}==$/.test(signature)
  )
    return failure(401);
  if (Number(request.headers.get("content-length")) > 150_000) return failure(413);
  const text = await request.text();
  if (Buffer.byteLength(text) > 150_000) return failure(413);
  try {
    if (
      !verify(
        null,
        Buffer.from(`${timestamp}\n${text}`),
        createPublicKey({ key: Buffer.from(verifyKey, "base64"), format: "der", type: "spki" }),
        Buffer.from(signature, "base64"),
      )
    )
      return failure(401);
  } catch {
    return failure(401);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return failure(400);
  }
  if (
    !data ||
    !["it", "com"].includes(data.region) ||
    !paths.has(data.path) ||
    typeof data.body !== "string" ||
    !data.headers ||
    typeof data.headers !== "object" ||
    Array.isArray(data.headers)
  )
    return failure(400);
  if (data.path === "/kindle/catalogue") {
    try {
      const input = JSON.parse(data.body);
      if (
        typeof input.refreshToken !== "string" ||
        !input.refreshToken ||
        input.refreshToken.length > 32_000 ||
        Object.keys(data.headers).length
      )
        return failure(400);
      const result = await readCatalogue(data.region, input.refreshToken, fetcher);
      return new Response(JSON.stringify(result), { headers: responseHeaders });
    } catch {
      return failure(502);
    }
  }
  const headers = new Headers();
  for (const [name, value] of Object.entries(data.headers)) {
    if (
      !allowedHeaders.has(name.toLowerCase()) ||
      typeof value !== "string" ||
      value.length > 32_000 ||
      /[\r\n]/.test(value)
    )
      return failure(400);
    headers.set(name, value);
  }
  const metadata = data.path === "/kindle/metadata";
  const sidecar = data.path === "/kindle/sidecar";
  if (
    sidecar &&
    (!data.book ||
      !["PDOC", "EBOK"].includes(data.book.type) ||
      typeof data.book.key !== "string" ||
      !/^[A-Z0-9]{10,64}$/.test(data.book.key))
  )
    return failure(400);
  const reading = metadata || sidecar;
  if (
    reading &&
    (data.body !== "" ||
      !headers.get("x-adp-token") ||
      headers.get("x-adp-alg") !== "SHA256withRSA:1.0" ||
      !headers.get("x-adp-signature"))
  )
    return failure(400);
  if (
    !reading &&
    !["application/json", "application/x-www-form-urlencoded"].includes(
      headers.get("Content-Type") ?? "",
    )
  )
    return failure(400);
  if (!reading) headers.set("x-amzn-identity-auth-domain", `api.amazon.${data.region}`);
  try {
    const target = metadata
      ? "https://todo-ta-g7g.amazon.com/FionaTodoListProxy/syncMetaData?item_count=1000"
      : sidecar
        ? `https://cde-ta-g7g.amazon.com/FionaCDEServiceEngine/sidecar?type=${data.book.type}&key=${data.book.key}`
        : `https://api.amazon.${data.region}${data.path}`;
    const response = await fetcher(target, {
      method: reading ? "GET" : "POST",
      headers,
      ...(reading ? {} : { body: data.body }),
      redirect: reading ? "manual" : "error",
      credentials: "omit",
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.text();
    if (Buffer.byteLength(body) > (reading ? 1_000_000 : 150_000)) return failure(502);
    return new Response(response.status === 204 ? null : body, {
      status: response.status,
      headers: {
        ...responseHeaders,
        "Content-Type": metadata ? "application/xml" : "application/json",
      },
    });
  } catch {
    return failure(502);
  }
}
export default { fetch: (request: Request) => handleAmazonRelay(request) };

export function collectionCsrf(html: string) {
  const quoted = "[\"']((?:\\\\.|[^\"'\\\\]){5,4096})[\"']";
  const raw =
    new RegExp("(?:window\\.)csrfToken\\s*=\\s*" + quoted).exec(html)?.[1] ??
    new RegExp("\\b(?:var|let|const)\\s+csrfToken\\s*=\\s*" + quoted).exec(html)?.[1] ??
    new RegExp("csrfToken[\"']?\\s*[:=]\\s*" + quoted).exec(html)?.[1] ??
    /name=["']csrfToken["']\s+value=["']([^"']{5,4096})["']/.exec(html)?.[1];
  if (!raw) return null;
  let token = raw;
  try {
    token = JSON.parse('"' + raw.replace(/\\x([a-f0-9]{2})/gi, "\\u00$1") + '"');
  } catch {
    if (raw.includes("\\")) return null;
  }
  return token
    .replace(/&amp;/g, "&")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_match: string, n: string) => {
      const code = n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
      return code >= 32 && code <= 126 ? String.fromCharCode(code) : "";
    });
}

/** Session cookies exist only inside this invocation and are never returned or logged. */
export async function readCatalogue(
  region: "it" | "com",
  refreshToken: string,
  fetcher: typeof fetch = fetch,
) {
  const base = `https://www.amazon.${region}`;
  const cookies = new Map<string, string>();
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
    // Amazon may rotate the web session when issuing its collection CSRF token.
    for (const header of response.headers.getSetCookie()) {
      const pair = /^([A-Za-z0-9_-]{1,100})=([^;]*)/.exec(header);
      const domain = /;\s*domain=([^;]+)/i.exec(header)?.[1]?.toLowerCase();
      if (
        !pair ||
        (domain &&
          ![`.amazon.${region}`, `amazon.${region}`, `www.amazon.${region}`].includes(domain))
      )
        continue;
      if (!/^[\x21-\x7e]{1,16000}$/.test(pair[2]!) || /[;\\]/.test(pair[2]!)) continue;
      cookies.set(pair[1]!, pair[2]!);
    }
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
  const csrf = collectionCsrf(html);
  if (!csrf) throw Error("Amazon collection unavailable");
  const clientId = /clientId["']?\s*[:=]\s*["']([A-Za-z0-9._-]{1,200})["']/.exec(html)?.[1];
  const items: { key: string; type: "PDOC" | "EBOK"; title: string; authors: string[] }[] = [];
  let partial = false;
  for (const type of ["PDOC", "EBOK"] as const) {
    // Bounded page, loaded on demand. Large collections expose an explicit partial flag.
    const input = {
      contentType: type === "PDOC" ? "KindlePDoc" : "Ebook",
      contentCategoryReference: type === "PDOC" ? "pdocs" : "booksAll",
      itemStatusList: ["Active"],
      ...(type === "EBOK"
        ? {
            originTypes: [
              "Purchase",
              "PublicLibraryLending",
              "PersonalLending",
              "KOLL",
              "RFFLending",
              "Pottermore",
              "Prime",
              "Rental",
              "FreeTrial",
              "KindleUnlimited",
              "Comixology",
              "ComicsUnlimited",
            ],
          }
        : {}),
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
          Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
          Referer: page,
          Origin: base,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          activity: "GetContentOwnershipData",
          activityInput: JSON.stringify(input),
          csrfToken: csrf,
          ...(clientId ? { clientId } : {}),
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
