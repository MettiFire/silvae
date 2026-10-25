import { createServerFn } from "@tanstack/react-start";
import { fetchMangaCatalogue, fetchMangaCovers } from "./manga-catalogue";
export const mangaCatalogue = createServerFn({ method: "GET" })
  .validator((input: { query?: string; id?: string; malId?: number; language?: string }) => {
    if (input.id && !/^[0-9a-f-]{36}$/.test(input.id)) throw Error("Serie non valida");
    if (
      input.malId !== undefined &&
      (!Number.isInteger(input.malId) || input.malId < 1 || input.malId > 99999999)
    )
      throw Error("Serie non valida");
    const query = (input.query ?? "").trim().slice(0, 120);
    if (!input.id && !input.malId && query.length < 2) throw Error("Scrivi almeno due caratteri");
    return {
      id: input.id,
      malId: input.malId,
      query,
      language: /^[a-z]{2}$/.test(input.language ?? "") ? input.language! : "it",
    };
  })
  .handler(async ({ data }) => fetchMangaCatalogue(data));
export const mangaCovers = createServerFn({ method: "GET" })
  .validator((input: { id?: string; malId?: number; title?: string; language?: string }) => {
    if (input.id && !/^[0-9a-f-]{36}$/.test(input.id)) throw Error("Serie non valida");
    if (
      !input.id &&
      (!Number.isInteger(input.malId) ||
        !input.malId ||
        input.malId < 1 ||
        input.malId > 99999999 ||
        !input.title?.trim())
    )
      throw Error("Serie non valida");
    return {
      id: input.id,
      malId: input.malId,
      title: (input.title ?? "").trim().slice(0, 160),
      language: /^[a-z]{2}$/.test(input.language ?? "") ? input.language! : "it",
    };
  })
  .handler(async ({ data }) => fetchMangaCovers(data));
