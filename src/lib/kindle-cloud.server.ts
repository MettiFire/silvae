// Server-only. Import dynamically inside server function handlers.
import { createCipheriv, createDecipheriv, createPrivateKey, randomBytes, sign } from "node:crypto";
import { Buffer } from "node:buffer";
import type { KindleCloudStatus, KindleRegion } from "./kindle-cloud.ts";

type Pending = {
  phase: "pending";
  region: KindleRegion;
  serial: string;
  publicCode: string;
  privateCode: string;
  expiresAt: number;
  interval: number;
  nextPollAt: number;
};
type Connected = {
  phase: "connected";
  region: KindleRegion;
  serial: string;
  connectedAt: number;
  adpToken: string;
  privateKey: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number;
};
export type KindleState = Pending | Connected;
const DEVICE_TYPE = "A2CZJZGLK2JJVM";
type Fetcher = typeof fetch;
/** Optional authenticated transport for hosts the Lovable worker cannot reach. */
export async function amazonFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const key = process.env["KINDLE_RELAY_PRIVATE_KEY"];
  if (!key) return fetch(input, init);
  const url = new URL(
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
  );
  if (
    url.protocol !== "https:" ||
    !["api.amazon.it", "api.amazon.com"].includes(url.host) ||
    url.username ||
    url.password ||
    url.search ||
    !["/auth/create/codepair", "/auth/register", "/auth/token", "/auth/deregister"].includes(
      url.pathname,
    ) ||
    init?.method !== "POST"
  )
    throw Error("Richiesta Amazon non valida.");
  const body = JSON.stringify({
    region: url.hostname.endsWith(".it") ? "it" : "com",
    path: url.pathname,
    headers: Object.fromEntries(new Headers(init.headers)),
    body: String(init.body ?? ""),
  });
  const timestamp = String(Date.now());
  let signature: ArrayBuffer;
  try {
    const signingKey = await crypto.subtle.importKey(
      "pkcs8",
      new Uint8Array(Buffer.from(key, "base64")),
      "Ed25519",
      false,
      ["sign"],
    );
    signature = await crypto.subtle.sign(
      "Ed25519",
      signingKey,
      new TextEncoder().encode(`${timestamp}\n${body}`),
    );
  } catch {
    throw Error("Amazon: firma del collegamento non disponibile.");
  }
  return fetch("https://silvae-kindle.vercel.app/api/amazon", {
    method: "POST",
    redirect: "manual",
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      "x-silvae-time": timestamp,
      "x-silvae-signature": Buffer.from(signature).toString("base64"),
    },
    body,
    signal: AbortSignal.timeout(20_000),
  }).catch(() => {
    throw Error("Amazon: servizio di collegamento non raggiungibile.");
  });
}
function regionHost(region: KindleRegion) {
  if (region !== "it" && region !== "com") throw Error("Account Amazon non valido.");
  return `https://api.amazon.${region}`;
}
function headers(region: KindleRegion) {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-amzn-identity-auth-domain": `api.amazon.${region}`,
  };
}
// The untrusted provider response is narrowed field by field before use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function json(response: Response): Promise<Record<string, any>> {
  // Never put upstream bodies, private codes or keys in errors or logs.
  const text = await response.text();
  if (text.length > 150_000) throw Error("Risposta Amazon non valida.");
  try {
    return JSON.parse(text);
  } catch {
    throw Error("Risposta Amazon non valida.");
  }
}
export async function createCodePair(
  region: KindleRegion,
  fetcher: Fetcher = amazonFetch,
  now = Date.now(),
): Promise<Pending> {
  const host = regionHost(region);
  const serial = randomBytes(20).toString("hex");
  const response = await fetcher(`${host}/auth/create/codepair`, {
    method: "POST",
    redirect: "manual",
    headers: headers(region),
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      code_data: { device_serial: serial, device_type: DEVICE_TYPE, domain: "Device" },
      code_properties: { code_duration: "600", code_length: "5" },
    }),
  }).catch((failure) => {
    if (
      failure instanceof Error &&
      /^Amazon: (firma del collegamento non disponibile|servizio di collegamento non raggiungibile)\.$/.test(
        failure.message,
      )
    )
      throw failure;
    throw Error("Amazon non è raggiungibile dal server di Silvae.");
  });
  if (!response.ok)
    throw Error("Amazon non ha potuto preparare il collegamento. Riprova più tardi.");
  const data = await json(response);
  if (
    typeof data["public_code"] !== "string" ||
    !/^[A-Z0-9-]{4,12}$/i.test(data["public_code"]) ||
    typeof data["private_code"] !== "string" ||
    !data["private_code"] ||
    data["private_code"].length > 8192 ||
    !Number.isFinite(data["expires_in"]) ||
    data["expires_in"] <= 0 ||
    data["expires_in"] > 600 ||
    !Number.isFinite(data["polling_interval_in_seconds"]) ||
    data["polling_interval_in_seconds"] <= 0 ||
    data["polling_interval_in_seconds"] > 60
  )
    throw Error("Risposta Amazon non valida.");
  const interval = Math.max(3000, data["polling_interval_in_seconds"] * 1000);
  return {
    phase: "pending",
    region,
    serial,
    publicCode: data["public_code"],
    privateCode: data["private_code"],
    expiresAt: now + data["expires_in"] * 1000,
    interval,
    nextPollAt: now + interval,
  };
}
export async function registerCodePair(
  state: Pending,
  fetcher: Fetcher = amazonFetch,
): Promise<Connected | null> {
  const response = await fetcher(`${regionHost(state.region)}/auth/register`, {
    method: "POST",
    redirect: "manual",
    headers: headers(state.region),
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      requested_token_type: ["bearer", "mac_dms"],
      cookies: { website_cookies: [], domain: `.amazon.${state.region}` },
      registration_data: {
        domain: "Device",
        app_version: "4.60",
        device_type: DEVICE_TYPE,
        device_name: "Silvae · Kindle",
        os_version: "26.2",
        software_version: "46000856",
        device_model: "iPhone",
        app_name: "Audible",
        device_serial: state.serial,
      },
      auth_data: {
        code_pair: { public_code: state.publicCode, private_code: state.privateCode },
        use_global_authentication: "true",
      },
      requested_extensions: [],
    }),
  });
  if (response.status === 429 || response.status >= 500)
    throw Error("Amazon è occupato. Riprova tra poco.");
  const data = await json(response);
  const code = data["response"]?.error?.code ?? data["error"];
  if (response.status === 401 && code === "Unauthorized") return null;
  if (!response.ok || !data["response"]?.success)
    throw Error("Amazon ha rifiutato il collegamento. Prepara un nuovo codice.");
  const tokens = data["response"].success.tokens;
  const mac = tokens?.mac_dms;
  const bearer = tokens?.bearer;
  if (
    !mac ||
    typeof mac.adp_token !== "string" ||
    !mac.adp_token ||
    mac.adp_token.length > 32_000 ||
    typeof mac.device_private_key !== "string" ||
    mac.device_private_key.length > 16_000 ||
    typeof bearer?.access_token !== "string" ||
    !bearer.access_token ||
    typeof bearer.refresh_token !== "string" ||
    !bearer.refresh_token
  )
    throw Error("Amazon non ha restituito le credenziali del dispositivo.");
  try {
    if (createPrivateKey(mac.device_private_key).asymmetricKeyType !== "rsa") throw Error();
  } catch {
    throw Error("Amazon non ha restituito le credenziali del dispositivo.");
  }
  return {
    phase: "connected",
    region: state.region,
    serial: state.serial,
    connectedAt: Date.now(),
    adpToken: mac.adp_token,
    privateKey: mac.device_private_key,
    accessToken: bearer.access_token,
    refreshToken: bearer.refresh_token,
    tokenExpiresAt: Date.now() + Math.min(Number(bearer.expires_in) || 3600, 3600) * 1000,
  };
}
export function sealState(state: KindleState, owner: string, key: string) {
  if (!/^[a-f0-9]{64}$/i.test(key)) throw Error("Cifratura Kindle non configurata.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  cipher.setAAD(Buffer.from(`silvae-kindle-v1:${owner}`));
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(state), "utf8")),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}
export function openState(ciphertext: string, owner: string, key: string): KindleState {
  if (!/^[a-f0-9]{64}$/i.test(key) || ciphertext.length > 150_000)
    throw Error("Collegamento Kindle non leggibile.");
  const bytes = Buffer.from(ciphertext, "base64");
  const cipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), bytes.subarray(0, 12));
  cipher.setAAD(Buffer.from(`silvae-kindle-v1:${owner}`));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString());
}
export function publicState(state: KindleState | null, now = Date.now()): KindleCloudStatus {
  if (!state || (state.phase === "pending" && state.expiresAt <= now))
    return { phase: "disconnected" };
  if (state.phase === "pending")
    return {
      phase: "pending",
      region: state.region,
      publicCode: state.publicCode,
      url: `https://www.amazon.${state.region}/code`,
      expiresAt: state.expiresAt,
      nextPollAt: state.nextPollAt,
    };
  return { phase: "connected", region: state.region, connectedAt: state.connectedAt };
}
export function signedHeaders(state: Connected, path: string, date = new Date().toISOString()) {
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(`GET\n${path}\n${date}\n\n${state.adpToken}`),
    state.privateKey,
  ).toString("base64");
  return {
    "x-adp-token": state.adpToken,
    "x-adp-alg": "SHA256withRSA:1.0",
    "x-adp-signature": `${signature}:${date}`,
  };
}
export async function deregister(state: Connected, fetcher: Fetcher = amazonFetch) {
  let access = state.accessToken;
  if (Date.now() >= state.tokenExpiresAt - 30_000) {
    const response = await fetcher(`${regionHost(state.region)}/auth/token`, {
      method: "POST",
      redirect: "manual",
      headers: { ...headers(state.region), "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(15_000),
      body: new URLSearchParams({
        app_name: "Audible",
        app_version: "4.60",
        source_token: state.refreshToken,
        source_token_type: "refresh_token",
        requested_token_type: "access_token",
      }),
    });
    if (!response.ok) throw Error("Amazon non ha confermato la revoca. Riprova più tardi.");
    const data = await json(response);
    if (typeof data["access_token"] !== "string" || !data["access_token"])
      throw Error("Amazon non ha confermato la revoca. Riprova più tardi.");
    access = data["access_token"];
  }
  const response = await fetcher(`${regionHost(state.region)}/auth/deregister`, {
    method: "POST",
    redirect: "manual",
    headers: { ...headers(state.region), "x-amz-access-token": access },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({ deregister_all_existing_accounts: false }),
  });
  if (!response.ok) throw Error("Amazon non ha confermato la revoca. Riprova più tardi.");
}
