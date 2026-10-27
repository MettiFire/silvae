export type KindleAmazonRegion = "it" | "com";
export type KindleWebAttempt = {
  owner: string;
  region: KindleAmazonRegion;
  url: string;
  verifier: string;
  expiresAt: number;
};
const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

/** Public-client PKCE: no account credentials or shared client secret are used. */
export async function createKindleWebAttempt(
  region: KindleAmazonRegion,
  owner: string,
  now = Date.now(),
): Promise<KindleWebAttempt> {
  if (!["it", "com"].includes(region) || !owner) throw Error("Configurazione Kindle non valida.");
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
  );
  const serial = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  )
    .join("")
    .toUpperCase();
  const clientId = Array.from(new TextEncoder().encode(`${serial}#A2CZJZGLK2JJVM`), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const url = new URL(`https://www.amazon.${region}/ap/signin`);
  const params = {
    "openid.oa2.response_type": "code",
    "openid.oa2.code_challenge_method": "S256",
    "openid.oa2.code_challenge": challenge,
    "openid.return_to": `https://www.amazon.${region}/ap/maplanding`,
    "openid.assoc_handle": `amzn_audible_ios_${region === "it" ? "it" : "us"}`,
    pageId: "amzn_audible_ios",
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.mode": "checkid_setup",
    "openid.ns.oa2": "http://www.amazon.com/ap/ext/oauth/2",
    "openid.oa2.client_id": `device:${clientId}`,
    "openid.oa2.scope": "device_auth_access",
    "openid.ns": "http://specs.openid.net/auth/2.0",
    marketPlaceId: region === "it" ? "APJ6JRA9NG5V4" : "ATVPDKIKX0DER",
    forceMobileLayout: "true",
    accountStatusPolicy: "P1",
  };
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return { owner, region, verifier, url: url.href, expiresAt: now + 10 * 60_000 };
}

/** Format check only. It does not authenticate the code or register a device. */
export function inspectKindleReturn(
  attempt: KindleWebAttempt,
  owner: string,
  input: string,
  now = Date.now(),
) {
  if (attempt.owner !== owner || now >= attempt.expiresAt)
    throw Error("La prova è scaduta. Prepara un nuovo accesso.");
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw Error("Incolla l’indirizzo finale della pagina Amazon.");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== `www.amazon.${attempt.region}` ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    url.pathname !== "/ap/maplanding"
  )
    throw Error("Questo non è l’indirizzo finale previsto. Completa l’accesso su Amazon.");
  const codes = url.searchParams.getAll("openid.oa2.authorization_code");
  if (!codes.length)
    throw Error(
      "Nell’indirizzo manca il codice Amazon. Ripeti l’accesso: la pagina 404 da sola non conferma il risultato.",
    );
  if (
    input.length > 16000 ||
    codes.length !== 1 ||
    !codes[0] ||
    codes[0].length > 4096 ||
    /[\r\n]/.test(codes[0])
  )
    throw Error("Amazon non ha restituito un codice utilizzabile.");
  return true;
}
