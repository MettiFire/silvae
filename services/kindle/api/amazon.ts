import { createPublicKey, verify } from "node:crypto";
import { Buffer } from "node:buffer";

const paths = new Set([
  "/auth/create/codepair",
  "/auth/register",
  "/auth/token",
  "/auth/deregister",
  "/kindle/metadata",
  "/kindle/sidecar",
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
