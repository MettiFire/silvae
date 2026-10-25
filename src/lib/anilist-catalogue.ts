import { mangaAuthorMatches } from "./manga-search-names.ts";
export { mangaAuthorMatches } from "./manga-search-names.ts";
import { descriptionText } from "./book-metadata.ts";
import type { Book } from "./books";
export type AniListManga = {
  id: number;
  idMal: number | null;
  title: { romaji?: string; english?: string };
  volumes: number | null;
  format?: string;
  isAdult?: boolean;
  status: string;
  description?: string;
  startDate?: { year?: number | null };
  coverImage?: { large?: string };
  staff?: {
    edges?: {
      role: string;
      node: { name: { full: string; native?: string; alternative?: string[] } };
    }[];
  };
};
export function mapAniListManga(record: AniListManga): Book | null {
  // Reuse the existing MAL identity, so switching providers never duplicates a series.
  if (!record.idMal || record.format === "NOVEL" || record.isAdult) return null;
  return {
    id: `manga:mal:${record.idMal}`,
    title: record.title.english || record.title.romaji || "Manga",
    authors: [
      ...new Set(
        (record.staff?.edges ?? [])
          .filter((e) => /story|art|original|author/i.test(e.role))
          .map((e) => e.node.name.full),
      ),
    ],
    author_aliases: [
      ...new Set(
        (record.staff?.edges ?? []).flatMap((e) =>
          [e.node.name.native, ...(e.node.name.alternative ?? [])].filter(
            (name): name is string => !!name,
          ),
        ),
      ),
    ],
    cover_url: record.coverImage?.large ?? null,
    published_year: record.startDate?.year ?? null,
    page_count: null,
    categories: ["Manga", "Comics & Graphic Novels"],
    description: descriptionText(record.description) || null,
    manga: {
      malId: record.idMal,
      totalVolumes: record.volumes,
      status:
        record.status === "FINISHED"
          ? "completed"
          : record.status === "RELEASING"
            ? "ongoing"
            : "unknown",
      source: `https://anilist.co/manga/${record.id}`,
    },
  };
}
export async function aniListCatalogue(
  input: { query?: string; malId?: number },
  fetcher: typeof fetch = fetch,
): Promise<Book[]> {
  const fields =
    "id idMal format isAdult title{romaji english} volumes status description startDate{year} coverImage{large} staff(perPage:8){edges{role node{name{full native alternative}}}}";
  const query = input.malId
    ? `query($id:Int!){Media(idMal:$id,type:MANGA){${fields}}}`
    : `query($q:String!){Page(perPage:15){media(search:$q,type:MANGA,format_not:NOVEL,isAdult:false){${fields}}} authors:Page(perPage:3){staff(search:$q){name{full} staffMedia(type:MANGA,sort:POPULARITY_DESC,perPage:20){nodes{${fields}}}}}}`;
  const response = await fetcher("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      query,
      variables: input.malId ? { id: input.malId } : { q: input.query },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw Error("Catalogo manga non disponibile. Riprova.");
  const raw = (await response.json()) as {
    data?: {
      Media?: AniListManga;
      Page?: { media: AniListManga[] };
      authors?: {
        staff: {
          name: { full: string; native?: string; alternative?: string[] };
          staffMedia?: { nodes: AniListManga[] };
        }[];
      };
    };
    errors?: unknown[];
  };
  if (raw.errors?.length || !raw.data) throw Error("Catalogo manga non disponibile. Riprova.");
  const titles = raw.data.Media ? [raw.data.Media] : (raw.data.Page?.media ?? []);
  const authored = (raw.data.authors?.staff ?? [])
    .filter((a) => mangaAuthorMatches(a.name.full, input.query ?? ""))
    .flatMap((a) => a.staffMedia?.nodes ?? [])
    .filter((r) =>
      (r.staff?.edges ?? []).some(
        (e) =>
          /story|art|original|author/i.test(e.role) &&
          mangaAuthorMatches(e.node.name.full, input.query ?? ""),
      ),
    );
  return [
    ...new Map(
      [...titles, ...authored].flatMap((r) => {
        const book = mapAniListManga(r);
        return book ? [[book.id, book] as const] : [];
      }),
    ).values(),
  ].slice(0, 20);
}
