// Server-only. Import dynamically inside server function handlers.
import { createCipheriv, createDecipheriv, createPrivateKey, randomBytes, sign } from "node:crypto";
import { Buffer } from "node:buffer";
import type { KindleCloudStatus, KindleRegion, KindleReadingCheck } from "./kindle-cloud.ts";
import { validKindleBook, type KindleBook, type KindleBookReading } from "./kindle-cloud.ts";
import { kindlePercentage } from "./kindle-progress.ts";

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
  reading?: KindleReadingCheck;
  bookReading?: KindleBookReading;
  scanCursor?: number;
  mappings?: Record<string, { libraryId: string; sessionId: string }>;
  totals?: Record<string, { checkedAt: number; start?: number; end?: number }>;
  pendingTitles?: { key: string; type: "PDOC" | "EBOK"; title: string; authors: string[] }[];
  positions?: Record<string, { position: number; updatedAt: number; percentage?: number }>;
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
  const metadata =
    url.href === "https://todo-ta-g7g.amazon.com/FionaTodoListProxy/syncMetaData?item_count=1000" &&
    init?.method === "GET";
  const sidecar =
    /^https:\/\/cde-ta-g7g\.amazon\.com\/FionaCDEServiceEngine\/sidecar\?type=(PDOC|EBOK)&key=[A-Z0-9]{10,64}$/.test(
      url.href,
    ) && init?.method === "GET";
  const lastRead =
    /^https:\/\/cde-ta-g7g\.amazon\.com\/FionaCDEServiceEngine\/getAnnotations\?filter=last_read&type=(PDOC|EBOK)&key=[A-Z0-9]{10,64}$/.test(
      url.href,
    ) && init?.method === "GET";
  if (
    !metadata &&
    !sidecar &&
    !lastRead &&
    (url.protocol !== "https:" ||
      !["api.amazon.it", "api.amazon.com"].includes(url.host) ||
      url.username ||
      url.password ||
      url.search ||
      ![
        "/auth/create/codepair",
        "/auth/register",
        "/auth/token",
        "/auth/deregister",
        "/kindle/catalogue",
        "/kindle/progress",
      ].includes(url.pathname) ||
      init?.method !== "POST")
  )
    throw Error("Richiesta Amazon non valida.");
  const body = JSON.stringify({
    region: url.hostname.endsWith(".it") ? "it" : "com",
    path: metadata
      ? "/kindle/metadata"
      : sidecar
        ? "/kindle/sidecar"
        : lastRead
          ? "/kindle/last-read"
          : url.pathname,
    ...(sidecar || lastRead
      ? { book: { key: url.searchParams.get("key"), type: url.searchParams.get("type") } }
      : {}),
    headers: Object.fromEntries(new Headers(init?.headers)),
    body: String(init?.body ?? ""),
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
    signal: AbortSignal.timeout(
      ["/kindle/catalogue", "/kindle/progress"].includes(url.pathname) ? 55_000 : 20_000,
    ),
  }).catch(() => {
    throw Error("Amazon: servizio di collegamento non raggiungibile.");
  });
}
function regionHost(region: KindleRegion) {
  if (region !== "it" && region !== "com") throw Error("Account Amazon non valido.");
  return `https://api.amazon.${region}`;
}
export async function kindleCatalogue(state: Connected) {
  const response = await amazonFetch(`${regionHost(state.region)}/kindle/catalogue`, {
    method: "POST",
    headers: {},
    body: JSON.stringify({ refreshToken: state.refreshToken }),
  });
  if (!response.ok)
    throw Error("Amazon: raccolta non disponibile. Nessun dato della libreria è stato modificato.");
  const text = await response.text();
  if (Buffer.byteLength(text) > 1_000_000) throw Error("Risposta Amazon non valida.");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw Error("Risposta Amazon non valida.");
  }
  if (
    !Array.isArray(data["items"]) ||
    data["items"].length > 200 ||
    typeof data["partial"] !== "boolean"
  )
    throw Error("Risposta Amazon non valida.");
  const items = data["items"].filter(
    (item: import("./kindle-cloud.ts").KindleCatalogue["items"][number]) =>
      validKindleBook(item) &&
      typeof item.title === "string" &&
      item.title.length <= 500 &&
      Array.isArray(item.authors) &&
      item.authors.every((a) => typeof a === "string"),
  );
  return { items, partial: data["partial"] as boolean };
}
export async function enrichKindleProgress(state: Connected, readings: KindleBookReading[]) {
  const totals = state.totals ?? {};
  const needed = readings
    .filter(
      (r) =>
        r.status === "available" &&
        ((r.type === "EBOK" && !totals[`${r.type}:${r.key}`]?.end) ||
          !totals[`${r.type}:${r.key}`] ||
          totals[`${r.type}:${r.key}`]!.checkedAt < Date.now() - 24 * 60 * 60_000),
    )
    .slice(0, 5);
  let metadata: {
    key: string;
    type: string;
    status?: string;
    start?: number;
    end?: number;
    percentage?: number;
  }[] = [];
  if (needed.length) {
    try {
      const response = await amazonFetch(`${regionHost(state.region)}/kindle/progress`, {
        method: "POST",
        headers: {},
        body: JSON.stringify({
          refreshToken: state.refreshToken,
          books: needed.slice(0, 5).map(({ key, type }) => ({ key, type })),
        }),
      });
      if (response.ok) {
        const data = await json(response);
        if (Array.isArray(data) && data.length <= 5) metadata = data;
      }
    } catch {
      /* Preserve raw, dated positions when Amazon cannot provide a total. */
    }
    for (const reading of needed) {
      const item = metadata.find((m) => m?.key === reading.key && m.type === reading.type);
      const valid =
        item &&
        Number.isSafeInteger(item.start) &&
        Number.isSafeInteger(item.end) &&
        item.start! >= 0 &&
        item.end! > item.start!;
      if (valid || item?.status === "unsupported")
        totals[`${reading.type}:${reading.key}`] = {
          checkedAt: Date.now(),
          ...(valid ? { start: item.start!, end: item.end! } : {}),
        };
    }
  }
  return {
    readings: readings.map((r) =>
      kindlePercentage(
        r,
        metadata.find((m) => m?.key === r.key && m.type === r.type) ??
          totals[`${r.type}:${r.key}`] ??
          {},
      ),
    ),
    totals,
  };
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
  return {
    phase: "connected",
    region: state.region,
    connectedAt: state.connectedAt,
    ...(state.reading ? { reading: state.reading } : {}),
    ...(state.bookReading ? { bookReading: state.bookReading } : {}),
  };
}
export function signedHeaders(
  state: Connected,
  path: string,
  date = new Date().toISOString().replace("Z", "000+00:00Z"),
) {
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
export async function probeKindleMetadata(
  state: Connected,
  fetcher: Fetcher = amazonFetch,
): Promise<KindleReadingCheck> {
  const checkedAt = Date.now();
  const path = "/FionaTodoListProxy/syncMetaData?item_count=1000";
  try {
    const response = await fetcher(`https://todo-ta-g7g.amazon.com${path}`, {
      method: "GET",
      redirect: "manual",
      headers: signedHeaders(state, path),
      signal: AbortSignal.timeout(20_000),
    });
    console.info("[Kindle metadata] HTTP", response.status);
    if (!response.ok)
      return {
        checkedAt,
        status: response.status === 401 || response.status === 403 ? "blocked" : "error",
        message:
          "Amazon non ha consentito il recupero dei metadati Kindle in questa prova. Il collegamento dell’account rimane attivo.",
      };
    const body = await response.text();
    if (
      Buffer.byteLength(body) > 1_000_000 ||
      !body.trimStart().startsWith("<") ||
      /<!DOCTYPE|<!ENTITY/i.test(body)
    )
      return {
        checkedAt,
        status: "error",
        message:
          "Amazon ha restituito un formato di lettura non utilizzabile. La tua libreria non è stata modificata.",
      };
    const count = [...body.matchAll(/<meta_data(?:\s|>)/g)].length;
    const tags = [
      ...new Set(
        [...body.matchAll(/<\/?([A-Za-z_][A-Za-z0-9_.:-]{0,64})(?:[\s/>])/g)].map(
          (match) => match[1],
        ),
      ),
    ].slice(0, 40);
    console.info("[Kindle metadata] XML elements", tags.join(","));
    const emptyFeed =
      /^\s*<response\s*\/>\s*$/.test(body) ||
      (/<add_update_list(?:\s[^>]*)?\/>|<add_update_list(?:\s[^>]*)?>\s*<\/add_update_list>/.test(
        body,
      ) &&
        /<removal_list(?:\s[^>]*)?\/>|<removal_list(?:\s[^>]*)?>\s*<\/removal_list>/.test(body));
    return {
      checkedAt,
      status: count ? "available" : emptyFeed ? "empty" : "error",
      message: count
        ? "Amazon rende disponibili i metadati Kindle. Il recupero del progresso è ancora in verifica; la tua libreria non è stata modificata."
        : emptyFeed
          ? "Amazon ha accettato il collegamento, ma il feed del dispositivo software non contiene libri o avanzamenti. La sincronizzazione della lettura non è ancora attiva."
          : "Amazon ha risposto, ma i metadati Kindle non sono ancora interpretabili. La tua libreria non è stata modificata.",
    };
  } catch {
    return {
      checkedAt,
      status: "error",
      message:
        "Non è stato possibile recuperare i dati Kindle. Il collegamento Amazon rimane attivo.",
    };
  }
}
/** Read only the exact last-read record. Highlight/note content never leaves the server. */
export async function probeKindleBook(
  state: Connected,
  book: KindleBook,
  fetcher: Fetcher = amazonFetch,
): Promise<KindleBookReading> {
  if (!validKindleBook(book)) throw Error("Richiesta Kindle non valida.");
  const base = { ...book, checkedAt: Date.now() };
  const path = `/FionaCDEServiceEngine/sidecar?type=${book.type}&key=${book.key}`;
  try {
    const response = await fetcher(`https://cde-ta-g7g.amazon.com${path}`, {
      method: "GET",
      redirect: "manual",
      headers: signedHeaders(state, path),
      signal: AbortSignal.timeout(20_000),
    });
    console.info("[Kindle book] HTTP", response.status);
    if (!response.ok)
      return {
        ...base,
        status: [401, 403].includes(response.status) ? "blocked" : "error",
        message: "Amazon non ha consentito la lettura della posizione di questo libro.",
      };
    const text = await response.text();
    if (!text.trim())
      return {
        ...base,
        status: "empty",
        message: "Amazon non ha restituito una posizione per questo libro.",
      };
    if (Buffer.byteLength(text) > 1_000_000) throw Error();
    const data = JSON.parse(text);
    if (!Array.isArray(data?.payload?.records)) throw Error();
    const records = data.payload.records.filter(
      (r: Record<string, unknown>) => r?.["type"] === "kindle.lpr",
    );
    // Schema only: never log positions, dates, identifiers, annotation content or credentials.
    console.info(
      "[Kindle book] schema",
      JSON.stringify({
        topFields: Object.keys(data).slice(0,30),
        payloadFields: Object.keys(data.payload).slice(0,30),
        records: data.payload.records.length,
        lastRead: records.length,
        fields: [...new Set(records.flatMap((r: Record<string, unknown>) => Object.keys(r)))].slice(
          0,
          40,
        ),
      }),
    );
    if (!records.length)
      return {
        ...base,
        status: "empty",
        message: "Non è presente una posizione di lettura sincronizzata per questo libro.",
      };
    // Multiple conflicting LPRs are not silently interpreted as a current position.
    const positions = records.map((r: Record<string, unknown>) =>
      typeof r["location"] === "string" && /^\d{1,15}$/.test(r["location"])
        ? Number(r["location"])
        : r["location"],
    );
    const position = positions[0];
    if (
      !Number.isSafeInteger(position) ||
      (position as number) < 0 ||
      positions.some((p: unknown) => p !== position)
    )
      throw Error();
    const rawTime = records[0].creationTime;
    let updatedAt: number | undefined;
    if (typeof rawTime === "string") {
      const normalized = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d{1,6})?$/.test(rawTime)
        ? rawTime.replace(" ", "T") + "Z"
        : /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(rawTime)
          ? rawTime
          : "";
      const timestamp = Date.parse(normalized);
      if (
        Number.isFinite(timestamp) &&
        timestamp >= Date.UTC(2007, 0, 1) &&
        timestamp <= Date.now() + 300_000
      )
        updatedAt = timestamp;
    }
    return {
      ...base,
      status: "available",
      position: position as number,
      ...(updatedAt === undefined ? {} : { updatedAt }),
      message:
        "Posizione più avanzata recuperata da Amazon. Il totale del libro non è disponibile: nessuna percentuale è stata stimata e la libreria non è stata modificata.",
    };
  } catch {
    return {
      ...base,
      status: "error",
      message:
        "La posizione di questo libro non è al momento leggibile. Il collegamento Amazon rimane attivo.",
    };
  }
}
/** Temporary schema probe for an explicitly selected book, restricted to last_read metadata. */
export async function inspectKindleLastRead(
  state: Connected,
  book: KindleBook,
  fetcher: Fetcher = amazonFetch,
) {
  if (!validKindleBook(book)) throw Error("Richiesta Kindle non valida.");
  const path = `/FionaCDEServiceEngine/getAnnotations?filter=last_read&type=${book.type}&key=${book.key}`;
  try {
    const response = await fetcher(`https://cde-ta-g7g.amazon.com${path}`, {
      method: "GET",
      redirect: "manual",
      headers: signedHeaders(state, path),
      signal: AbortSignal.timeout(20_000),
    });
    console.info("[Kindle last-read] HTTP", response.status);
    const text = await response.text();
    if (Buffer.byteLength(text) > 1_000_000) return;
    if (!response.ok)
      console.info(
        "[Kindle last-read] error fields",
        JSON.stringify(
          ["guid", "key", "filter", "type", "missing", "required", "invalid"].filter((word) =>
            new RegExp(`\\b${word}\\b`, "i").test(text),
          ),
        ),
      );
    let fields: string[] = [];
    try {
      const data = JSON.parse(text);
      fields = Object.keys(data);
      for (const [name, value] of Object.entries(data)) {
        if (Array.isArray(value) && value[0] && typeof value[0] === "object")
          fields.push(...Object.keys(value[0]).map((k) => `${name}[].${k}`));
      }
      if (data.payload && typeof data.payload === "object")
        fields.push(...Object.keys(data.payload).map((k) => `payload.${k}`));
    } catch {
      fields = [
        ...new Set([...text.matchAll(/<\/?([A-Za-z][\w:.-]*)\b/g)].map((m) => m[1]!)),
      ].slice(0, 40);
    }
    console.info("[Kindle last-read] schema", JSON.stringify(fields));
  } catch {
    console.info("[Kindle last-read] unavailable");
  }
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
