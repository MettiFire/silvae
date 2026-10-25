import { mangaCatalogue as serverCatalogue, mangaCovers as serverCovers } from "./manga.functions";

// These providers expose public metadata with CORS; no account or API key is sent.
// Some hosting environments reject server-function routes with HTTP 403.
export async function mangaCatalogue(options: Parameters<typeof serverCatalogue>[0]) {
  try {
    return await serverCatalogue(options);
  } catch (error) {
    if (typeof window === "undefined" || options.signal?.aborted) throw error;
    const { fetchMangaCatalogue } = await import("./manga-catalogue");
    return fetchMangaCatalogue({
      ...options.data,
      query: (options.data.query ?? "").trim().slice(0, 120),
      language: options.data.language ?? "it",
    });
  }
}
export async function mangaCovers(options: Parameters<typeof serverCovers>[0]) {
  try {
    return await serverCovers(options);
  } catch (error) {
    if (typeof window === "undefined" || options.signal?.aborted) throw error;
    const { fetchMangaCovers } = await import("./manga-catalogue");
    return fetchMangaCovers({
      ...options.data,
      title: options.data.title ?? "",
      language: options.data.language ?? "it",
    });
  }
}
