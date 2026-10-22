export const SITE_URL = "https://silvae.lovable.app";
export const SOCIAL_IMAGE = `${SITE_URL}/images/silvae-social.png`;
export const SOCIAL_ALT =
  "Silvae. Tieni il filo di ogni storia. La tua libreria, le tue scoperte, le tue parole.";
export function pageSeo(title: string, description: string, path?: string, noindex = false) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Silvae" },
      { property: "og:locale", content: "it_IT" },
      { property: "og:image", content: SOCIAL_IMAGE },
      { property: "og:image:secure_url", content: SOCIAL_IMAGE },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: SOCIAL_ALT },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: SOCIAL_IMAGE },
      { name: "twitter:image:alt", content: SOCIAL_ALT },
      ...(path ? [{ property: "og:url", content: `${SITE_URL}${path}` }] : []),
      ...(noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
    ],
    links: path ? [{ rel: "canonical", href: `${SITE_URL}${path}` }] : [],
  };
}

/** Router releases use different flags for an unmatched root route. */
export function hasNotFoundMatch(
  matches: readonly { status?: string; _notFound?: boolean; globalNotFound?: boolean }[],
): boolean {
  return matches.some(
    (match) =>
      match.status === "notFound" || match._notFound === true || match.globalNotFound === true,
  );
}
