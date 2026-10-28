import { randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";
import type { KoboBook, KoboCloudStatus } from "./kobo-cloud.ts";
import { sealReaderState, openReaderState } from "./reader-cloud-crypto.server.ts";
import { kindleTitleKey, sameKindleAuthor } from "./kindle-progress.ts";

type Pending = {
  phase: "pending";
  device: string;
  code: string;
  pollPath: string;
  expiresAt: number;
  nextPollAt: number;
};
export type KoboConnected = {
  phase: "connected";
  device: string;
  accessToken: string;
  refreshToken: string;
  connectedAt: number;
  books: Record<string, KoboBook>;
  mappings: Record<string, { libraryId: string; sessionId: string }>;
  syncToken?: string;
  checkedAt?: number;
  partial?: boolean;
};
export type KoboState = Pending | KoboConnected;
export class KoboError extends Error {}
export type KoboItem = {
  id: string;
  book_id: string;
  status: string;
  started_at: string | null;
  updated_at: string;
  progress_updated_at: string | null;
  reading_session_id: string;
  books: { title: string; authors: string[] };
};
const PLATFORM = "00000000-0000-0000-0000-000000000373",
  VERSION = "4.38.23171";
const AUTH = "https://auth.kobobooks.com",
  STORE = "https://storeapi.kobo.com";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const validKoboId = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);
const token = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 16384 && !/[\r\n]/.test(value);
async function body(response: Response, max = 2000000) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "",
    size = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new KoboError("Risposta Kobo troppo grande.");
    }
    text += decoder.decode(part.value, { stream: true });
  }
  return text + decoder.decode();
}
function pollUrl(path: string) {
  const url = new URL(path, AUTH);
  if (
    url.origin !== AUTH ||
    url.username ||
    url.password ||
    url.hash ||
    !/^\/[a-z]{2}\/([a-z]{2})\/activateonweb\/poll$/i.test(url.pathname) ||
    [...url.searchParams.keys()].join(",") !== "workflowId" ||
    !/^[-a-z0-9]{1,100}$/i.test(url.searchParams.get("workflowId") ?? "")
  )
    throw new KoboError("Risposta di associazione Kobo non valida.");
  return url;
}
export function parseKoboActivation(html: string, device: string, now = Date.now()): Pending {
  const raw = /data-poll-endpoint="([^"]{1,500})"/.exec(html)?.[1];
  const code = /(?:%26code%3D|[?&]code=)(\d{4,12})(?!\d)/i.exec(html)?.[1];
  if (!raw || !code) throw new KoboError("Kobo non ha restituito un codice di associazione.");
  const url = pollUrl(raw.replace(/&amp;/g, "&"));
  return {
    phase: "pending",
    device,
    code,
    pollPath: url.pathname + url.search,
    expiresAt: now + 10 * 60_000,
    nextPollAt: now + 10_000,
  };
}
export async function startKobo(fetcher: typeof fetch = fetch): Promise<Pending> {
  const device = randomBytes(32).toString("hex");
  const query = new URLSearchParams({
    pwspid: PLATFORM,
    wsa: "Kobo",
    pwsdid: device,
    pwsav: VERSION,
    pwsdm: "Desktop",
    pwspos: "Web",
    pwspov: "Kobo",
  });
  const response = await fetcher(`${AUTH}/ActivateOnWeb?${query}`, {
    redirect: "manual",
    headers: { "User-Agent": "Mozilla/5.0 Silvae/1.0", Accept: "text/html" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new KoboError("Associazione Kobo temporaneamente non disponibile.");
  return parseKoboActivation(await body(response, 500000), device);
}
export async function pollKobo(
  state: Pending,
  fetcher: typeof fetch = fetch,
): Promise<KoboState | null> {
  if (state.expiresAt <= Date.now()) return null;
  if (state.nextPollAt > Date.now()) return state;
  const response = await fetcher(pollUrl(state.pollPath), {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new KoboError("Verifica Kobo temporaneamente non disponibile.");
  const data = JSON.parse(await body(response, 50000));
  if (data.Status !== "Complete") return { ...state, nextPollAt: Date.now() + 10_000 };
  const target = new URL(typeof data.RedirectUrl === "string" ? data.RedirectUrl : "");
  if (
    target.protocol !== "kobo:" ||
    target.hostname.toLowerCase() !== "userauthenticated" ||
    !token(target.searchParams.get("userKey"))
  )
    throw new KoboError("Autorizzazione Kobo non valida.");
  const auth = await fetcher(`${STORE}/v1/auth/device`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      AffiliateName: "Kobo",
      AppVersion: VERSION,
      ClientKey: Buffer.from(PLATFORM).toString("base64"),
      DeviceId: state.device,
      PlatformId: PLATFORM,
      SerialNumber: state.device.slice(0, 32),
      UserKey: target.searchParams.get("userKey"),
    }),
  });
  if (!auth.ok) throw new KoboError("Kobo non ha completato il collegamento.");
  const values = JSON.parse(await body(auth, 50000));
  if (
    !token(values.AccessToken) ||
    !token(values.RefreshToken) ||
    (values.TokenType && values.TokenType !== "Bearer")
  )
    throw new KoboError("Credenziali Kobo non valide.");
  return {
    phase: "connected",
    device: state.device,
    accessToken: values.AccessToken,
    refreshToken: values.RefreshToken,
    connectedAt: Date.now(),
    books: {},
    mappings: {},
  };
}
const time = (value: unknown) =>
  typeof value === "string" &&
  /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  Date.parse(value) >= Date.UTC(2007, 0, 1) &&
  Date.parse(value) <= Date.now() + 300000
    ? value
    : undefined;
function mergeRows(books: Record<string, KoboBook>, rows: unknown) {
  if (!Array.isArray(rows) || rows.length > 2000) throw new KoboError("Raccolta Kobo non valida.");
  for (const row of rows) {
    const e = row?.NewEntitlement ?? row?.ChangedEntitlement;
    const r = e?.ReadingState ?? row?.ChangedReadingState?.ReadingState;
    const id = e?.BookEntitlement?.Id ?? r?.EntitlementId;
    if (!validKoboId(id)) continue;
    if (e?.BookEntitlement?.IsRemoved === true) {
      delete books[id];
      continue;
    }
    if (e) {
      const m = e.BookMetadata;
      if (
        e.BookEntitlement.Accessibility !== "Full" ||
        typeof m?.Title !== "string" ||
        !m.Title.trim() ||
        m.Title.length > 500
      )
        continue;
      const authors = Array.isArray(m.Contributors)
        ? m.Contributors.filter((a: unknown) => typeof a === "string" && a.length <= 200).slice(
            0,
            10,
          )
        : [];
      books[id] = { ...books[id], id, title: m.Title, authors };
    }
    if (!books[id] || !r) continue;
    // Metadata creation/entitlement dates are never evidence of reading.
    const observed = time(r.CurrentBookmark?.LastModified) ?? time(r.LastModified);
    const percent = r.CurrentBookmark?.ProgressPercent;
    if (
      observed &&
      typeof percent === "number" &&
      Number.isFinite(percent) &&
      percent >= 0 &&
      percent <= 100 &&
      (!books[id].observed || Date.parse(books[id].observed!) <= Date.parse(observed))
    )
      books[id] = { ...books[id], percentage: percent, observed };
    const statusObserved = time(r.StatusInfo?.LastModified) ?? time(r.LastModified);
    if (
      statusObserved &&
      ["Reading", "Finished", "ReadyToRead"].includes(r.StatusInfo?.Status) &&
      (!books[id].statusObserved ||
        Date.parse(books[id].statusObserved!) <= Date.parse(statusObserved))
    )
      books[id] = { ...books[id], status: r.StatusInfo.Status, statusObserved };
  }
  if (Object.keys(books).length > 2000)
    throw new KoboError("La raccolta Kobo supera il limite di questa prima versione.");
}
export async function readKoboLibrary(
  original: KoboConnected,
  fetcher: typeof fetch = fetch,
): Promise<KoboConnected> {
  const state = { ...original, books: { ...original.books } };
  let refreshed = false;
  for (let page = 0; page < 4; page++) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${state.accessToken}`,
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 Silvae/1.0",
      "x-kobo-deviceid": state.device,
      "x-kobo-platformid": PLATFORM,
      "x-kobo-appversion": VERSION,
      "x-kobo-affiliatename": "Kobo",
    };
    if (state.syncToken) headers["x-kobo-synctoken"] = state.syncToken;
    let response = await fetcher(`${STORE}/v1/library/sync`, {
      method: "GET",
      redirect: "manual",
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 401 && !refreshed) {
      refreshed = true;
      const refresh = await fetcher(`${STORE}/v1/auth/refresh`, {
        method: "POST",
        redirect: "manual",
        headers: { Authorization: headers["Authorization"]!, "Content-Type": "application/json" },
        body: JSON.stringify({
          AppVersion: VERSION,
          ClientKey: Buffer.from(PLATFORM).toString("base64"),
          PlatformId: PLATFORM,
          RefreshToken: state.refreshToken,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!refresh.ok)
        throw new KoboError("Il collegamento Kobo è scaduto. Scollega e autorizza di nuovo.");
      const values = JSON.parse(await body(refresh, 50000));
      if (!token(values.AccessToken) || !token(values.RefreshToken ?? state.refreshToken))
        throw new KoboError("Rinnovo Kobo non valido.");
      state.accessToken = values.AccessToken;
      state.refreshToken = values.RefreshToken ?? state.refreshToken;
      headers["Authorization"] = `Bearer ${state.accessToken}`;
      // Preserve rotated credentials even if a later catalogue request fails.
      original.accessToken = state.accessToken;
      original.refreshToken = state.refreshToken;
      response = await fetcher(`${STORE}/v1/library/sync`, {
        method: "GET",
        redirect: "manual",
        headers,
        signal: AbortSignal.timeout(15000),
      });
    }
    if (!response.ok) throw new KoboError("Letture Kobo temporaneamente non disponibili.");
    mergeRows(state.books, JSON.parse(await body(response)));
    const next = response.headers.get("x-kobo-synctoken");
    if (next && (!token(next) || next.length > 8192))
      throw new KoboError("Cursore Kobo non valido.");
    const more = response.headers.get("x-kobo-sync")?.toLowerCase() === "continue";
    if (more && (!next || next === state.syncToken))
      throw new KoboError("Paginazione Kobo non valida.");
    if (next) state.syncToken = next;
    state.partial = more;
    if (!more) break;
  }
  return { ...state, checkedAt: Date.now() };
}
export function koboUpdates(state: KoboConnected, library: KoboItem[]) {
  const mappings = { ...state.mappings };
  const eventTime = (book: KoboBook) =>
    time(book.status === "Finished" ? (book.statusObserved ?? book.observed) : book.observed);
  const updates: {
    id: string;
    session: string;
    version: string;
    observed: string;
    percentage?: number;
    status: string;
  }[] = [];
  for (const book of Object.values(state.books).sort(
    (a, b) => (Date.parse(eventTime(b) ?? "") || 0) - (Date.parse(eventTime(a) ?? "") || 0),
  )) {
    const map = mappings[book.id];
    const matches = map
      ? library.filter((i) => i.id === map.libraryId && i.reading_session_id === map.sessionId)
      : library.filter(
          (i) =>
            kindleTitleKey(i.books.title) === kindleTitleKey(book.title) &&
            sameKindleAuthor(i.books.authors, book.authors),
        );
    if (matches.length !== 1) continue;
    const item = matches[0]!;
    mappings[book.id] = { libraryId: item.id, sessionId: item.reading_session_id };
    if (updates.some((update) => update.id === item.id)) continue;
    if (
      ["read", "abandoned"].includes(item.status) ||
      typeof book.percentage !== "number" ||
      !Number.isFinite(book.percentage) ||
      book.percentage < 0 ||
      book.percentage > 100 ||
      !["Reading", "Finished"].includes(book.status ?? "") ||
      !Number.isFinite(Date.parse(item.progress_updated_at ?? item.updated_at))
    )
      continue;
    // Kobo can mark an unfinished book Finished. Match its documented DNF rule.
    const status =
      book.status === "Finished" ? (book.percentage < 90 ? "abandoned" : "read") : "reading";
    const after = Date.parse(item.progress_updated_at ?? item.updated_at);
    const progressTime = time(book.observed),
      observed = eventTime(book);
    if (
      !observed ||
      Date.parse(observed) <= after ||
      (status === "reading" && book.percentage === 0)
    )
      continue;
    updates.push({
      id: item.id,
      session: item.reading_session_id,
      version: item.updated_at,
      observed,
      ...(progressTime &&
      Date.parse(progressTime) > after &&
      Date.parse(progressTime) <= Date.parse(observed)
        ? { percentage: book.percentage }
        : {}),
      status,
    });
  }
  return { mappings, updates: updates.slice(0, 100) };
}
export function sealKobo(state: KoboState, owner: string, key: string) {
  return sealReaderState(state, owner, key, "kobo");
}
export function openKobo(ciphertext: string, owner: string, key: string) {
  return openReaderState(ciphertext, owner, key, "kobo") as KoboState;
}
export function publicKobo(state: KoboState | null): KoboCloudStatus {
  if (!state || (state.phase === "pending" && state.expiresAt <= Date.now()))
    return { phase: "disconnected" };
  if (state.phase === "pending")
    return {
      phase: "pending",
      code: state.code,
      url: "https://www.kobo.com/activate",
      expiresAt: state.expiresAt,
      nextPollAt: state.nextPollAt,
    };
  return {
    phase: "connected",
    connectedAt: state.connectedAt,
    books: Object.values(state.books),
    partial: state.partial ?? false,
    ...(state.checkedAt ? { checkedAt: state.checkedAt } : {}),
  };
}
