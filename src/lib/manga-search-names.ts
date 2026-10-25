export function mangaAuthorMatches(name: string, query: string) {
  const words = (text: string) =>
    text
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/kentarou/g, "kentaro")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .split(" ");
  const q = words(query),
    n = words(name);
  return (
    q.length > 0 &&
    q.every((w) => w.length >= 2 && n.some((x) => x === w || (w.length >= 3 && x.startsWith(w))))
  );
}
