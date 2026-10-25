/** Accept only same-site paths; never allow login links to become open redirects. */
export function authDestination(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.length > 2000) return "/";
  if (
    value.startsWith("//") ||
    /[\\\s]/u.test(value) ||
    Array.from(value).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return "/";
  try {
    const url = new URL(value, "https://silvae.invalid");
    if (
      url.origin !== "https://silvae.invalid" ||
      /^\/auth(?:\/|$)/i.test(decodeURIComponent(url.pathname))
    )
      return "/";
    // Browsers/proxies can normalize escaped slashes differently.
    if (/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
