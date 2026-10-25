/** First written letter: articles count, punctuation and accents do not. */
export function titleInitial(title: string): string | null {
  const letter = title.normalize("NFKD").replace(/\p{M}/gu, "").toUpperCase().match(/\p{L}/u)?.[0];
  return letter && /^[A-Z]$/.test(letter) ? letter : null;
}
