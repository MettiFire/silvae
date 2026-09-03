import { createServerFn } from "@tanstack/react-start";

const API = "https://www.googleapis.com/books/v1/volumes";

/** Proxy Google Books search through the server so the API key stays secret. */
export const gbSearch = createServerFn({ method: "GET" })
  .inputValidator((data: { params: Record<string, string> }) => data)
  .handler(async ({ data }) => {
    const key = process.env["GOOGLE_API_KEY"];
    const params = new URLSearchParams(data.params);
    if (key) params.set("key", key);
    const res = await fetch(`${API}?${params}`);
    if (!res.ok) return { status: res.status, json: "" };
    return { status: 200, json: await res.text() };
  });

/** Proxy a single-volume lookup. */
export const gbVolume = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const key = process.env["GOOGLE_API_KEY"];
    const url = key ? `${API}/${encodeURIComponent(data.id)}?key=${key}` : `${API}/${encodeURIComponent(data.id)}`;
    const res = await fetch(url);
    if (!res.ok) return { status: res.status, json: "" };
    return { status: 200, json: await res.text() };
  });
