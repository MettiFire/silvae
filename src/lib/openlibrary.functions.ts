import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createOpenLibrarySearch } from "./openlibrary-search";

const search = createOpenLibrarySearch();
const allowed = new Set([
  "q",
  "limit",
  "offset",
  "fields",
  "sort",
  "lang",
  "isbn",
  "author",
  "subject",
]);
export const olCatalogueSearch = createServerFn({ method: "GET" })
  .validator(
    z.object({
      params: z
        .record(z.string().max(2000))
        .refine(
          (params) => Object.keys(params).every((key) => allowed.has(key)),
          "Invalid catalogue parameter",
        ),
    }),
  )
  .handler(async ({ data }) =>
    search({
      ...data.params,
      limit: String(Math.max(1, Math.min(40, Number(data.params["limit"]) || 20))),
      offset: String(Math.max(0, Math.min(10000, Number(data.params["offset"]) || 0))),
    }),
  );
