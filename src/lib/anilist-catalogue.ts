import { descriptionText } from "./book-metadata.ts";
import type { Book } from "./books";
export type AniListManga = {
  id: number;
  idMal: number | null;
  title: { romaji?: string; english?: string };
  volumes: number | null;
  status: string;
  description?: string;
  startDate?: { year?: number | null };
  coverImage?: { large?: string };
  staff?: { edges?: { role: string; node: { name: { full: string } } }[] };
};
export function mapAniListManga(record: AniListManga): Book | null {
  // Reuse the existing MAL identity, so switching providers never duplicates a series.
  if (!record.idMal) return null;
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
    "id idMal title{romaji english} volumes status description startDate{year} coverImage{large} staff(perPage:8){edges{role node{name{full}}}}";
  const query = input.malId
    ? `query($id:Int!){Media(idMal:$id,type:MANGA){${fields}}}`
    : `query($q:String!){Page(perPage:15){media(search:$q,type:MANGA,format_not:NOVEL,isAdult:false){${fields}}}}`;
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
    data?: { Media?: AniListManga; Page?: { media: AniListManga[] } };
    errors?: unknown[];
  };
  if (raw.errors?.length || !raw.data) throw Error("Catalogo manga non disponibile. Riprova.");
  return (raw.data.Media ? [raw.data.Media] : (raw.data.Page?.media ?? [])).flatMap((r) => {
    const book = mapAniListManga(r);
    return book ? [book] : [];
  });
}
