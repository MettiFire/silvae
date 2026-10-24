import { createServerFn } from "@tanstack/react-start";
import { parseBookMarksWidget, type CriticRating } from "./critic-rating.ts";
const cache = new Map<string, { until: number; value: CriticRating | null }>();
const pending = new Map<string, Promise<CriticRating | null>>();
async function boundedText(response: Response, max: number): Promise<string | null> {
  if (!response.ok) return null;
  const reader = response.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let size = 0,
    text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
let isbnIndex: { until: number; values: Set<string> | null } | undefined;
let indexPending: Promise<Set<string> | null> | undefined;
async function supportedIsbns(): Promise<Set<string> | null> {
  if (isbnIndex && isbnIndex.until > Date.now()) return isbnIndex.values;
  if (indexPending) return indexPending;
  indexPending = (async () => {
    try {
      const response = await fetch("https://s26162.pcdn.co/bookmarks-isbn-list.json", {
        signal: AbortSignal.timeout(4500),
      });
      const text = await boundedText(response, 2000000);
      const values: unknown = text ? JSON.parse(text) : null;
      if (!Array.isArray(values) || values.length > 100000) return null;
      return new Set(
        values.filter((v): v is string => typeof v === "string" && /^97[89]\d{10}$/.test(v)),
      );
    } catch {
      return null;
    }
  })()
    .then((values) => {
      isbnIndex = { until: Date.now() + (values ? 86400000 : 300000), values };
      return values;
    })
    .finally(() => {
      indexPending = undefined;
    });
  return indexPending;
}
async function lookup(isbn: string): Promise<CriticRating | null> {
  const hit = cache.get(isbn);
  if (hit && hit.until > Date.now()) return hit.value;
  if (pending.has(isbn)) return pending.get(isbn)!;
  const task = (async () => {
    try {
      const response = await fetch(
        `https://lithub.com/book-widget/${isbn.slice(0, 3)}-${isbn.slice(3)}/0/1/`,
        { signal: AbortSignal.timeout(4500) },
      );
      const html = await boundedText(response, 1000000);
      if (!html) return null;
      return parseBookMarksWidget(html);
    } catch {
      return null;
    }
  })()
    .then((value) => {
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      cache.set(isbn, { until: Date.now() + (value ? 86400000 : 3600000), value });
      return value;
    })
    .finally(() => pending.delete(isbn));
  pending.set(isbn, task);
  return task;
}
export const bookCriticRating = createServerFn({ method: "GET" })
  .validator((input: { isbns: string[] }) => ({
    isbns: [
      ...new Set(
        (Array.isArray(input.isbns) ? input.isbns.slice(0, 100) : [])
          .filter((v) => typeof v === "string")
          .map((v) => v.replace(/[\s-]/g, ""))
          .filter((v) => /^97[89]\d{10}$/.test(v)),
      ),
    ],
  }))
  .handler(async ({ data }) => {
    if (!data.isbns.length) return null;
    const supported = await supportedIsbns();
    const candidates = (
      supported ? data.isbns.filter((isbn) => supported.has(isbn)) : data.isbns
    ).slice(0, 3);
    const values = await Promise.all(candidates.map(lookup));
    return values.find((v) => v !== null) ?? null;
  });
