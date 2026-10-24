export type CriticRating = { favorablePercent: number; count: number; source: string };
/** Our favorable-share calculation, not an official numeric Book Marks grade.
 * Accept only the complete review list; the decorative flags truncate after nine.
 */
export function parseBookMarksWidget(html: string): CriticRating | null {
  const count = Number(html.match(/Based on\s*<span[^>]*>\s*(\d+)\s+reviews/i)?.[1]);
  const source = html.match(
    /href=["']https?:\/\/bookmarks\.reviews(\/reviews\/[^"'?#]+\/)["']/i,
  )?.[1];
  const reviews = [
    ...html.matchAll(
      /<span\b[^>]*class=["']stat_total\s+(rave|good|positive|mixed|pan)["'][^>]*>/gi,
    ),
  ];
  if (!source || !Number.isSafeInteger(count) || count < 3 || count !== reviews.length) return null;
  const favorable = reviews.filter((r) => /^(rave|good|positive)$/i.test(r[1]!)).length;
  return {
    favorablePercent: Math.round((100 * favorable) / count),
    count,
    source: `https://bookmarks.reviews${source}`,
  };
}
