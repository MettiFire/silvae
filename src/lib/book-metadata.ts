/** Compare title AND author before borrowing metadata from another edition. */
const key = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function sameBook(a: { title: string; authors: string[] }, b: { title: string; authors: string[] }) {
  const title = (v: string) => key(v.replace(/:\s*(?:edizione|edition|illustrated edition|revised edition)\b.*$/i, ''));
  const author = (v: string) => key(v).split(' ').sort().join(' ');
  return !!title(a.title) && title(a.title) === title(b.title) && a.authors.some(x => !!author(x) && b.authors.some(y => author(x) === author(y)));
}

/** Descriptions are rendered as React text, never as executable provider HTML. */
export function descriptionText(value: string | null | undefined): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…' };
  return (value ?? '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(?:p|div|li|h[1-6])\s*>|<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (entity.startsWith('#')) {
        const n = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
        return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
      }
      return entities[entity.toLowerCase()] ?? match;
    }).replace(/\n{3,}/g, '\n\n').trim();
}

export function coverUrls(book: { cover_url: string | null; cover_candidates?: string[] | undefined }): string[] {
  return [...new Set([book.cover_url, ...(book.cover_candidates ?? [])].filter((v): v is string => !!v && /^https:\/\//i.test(v)))];
}

/** Personal choices win; otherwise keep the cover actually seen before opening the detail. */
export function displayCoverUrls(book: {
  cover_url: string | null;
  custom_cover_url?: string | null;
  cover_candidates?: string[];
}, resolved?: string): string[] {
  return coverUrls({
    cover_url: book.custom_cover_url || resolved || book.cover_url,
    cover_candidates: [...(book.cover_url ? [book.cover_url] : []), ...(book.cover_candidates ?? [])],
  });
}
