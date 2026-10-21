export const IMPORT_FIELDS = {
  title: ['title', 'titolo', 'book title', 'nome libro'],
  author: ['author', 'authors', 'autore', 'autori', 'primary author'],
  isbn: ['isbn13', 'isbn 13', 'isbn', 'isbn10', 'isbn 10'],
  status: ['exclusive shelf', 'reading status', 'status', 'stato', 'bookshelves', 'read status'],
  rating: ['my rating', 'rating', 'voto', 'valutazione', 'star rating'],
  pages: ['number of pages', 'pages', 'pagine', 'page count', 'total pages'],
  currentPage: ['current page', 'pagina attuale', 'pages read', 'pagine lette'],
  started: ['date started', 'start date', 'data inizio', 'started at'],
  finished: ['date read', 'end date', 'data fine', 'finished at', 'last date read'],
  favorite: ['is favorite', 'favorite', 'preferito', 'favourite'],
  cover: ['cover', 'cover url', 'copertina', 'image url'],
} as const;
export type ImportField = keyof typeof IMPORT_FIELDS;
export type ColumnMapping = Record<ImportField, string>;
export type ReadingStatus = 'to_read' | 'reading' | 'read' | 'abandoned';
export const FIELD_LABELS: Record<ImportField, string> = {
  title: 'Titolo', author: 'Autore', isbn: 'ISBN', status: 'Stato di lettura', rating: 'Voto (0–5)',
  pages: 'Pagine totali', currentPage: 'Pagina attuale', started: 'Data inizio', finished: 'Data fine',
  favorite: 'Preferito', cover: 'URL copertina',
};
export function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** RFC 4180 fields, including escaped quotes and multiline content. */
export function parseCSV(raw: string) {
  const text = raw.replace(/^\uFEFF/, '');
  // Count delimiters outside quotes in the first logical record.
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"') {
      if (quoted && text[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted) {
      if (c === '\n' || c === '\r') break;
      if (c in counts) counts[c as keyof typeof counts]++;
    }
  }
  const delimiter = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [','])[0]!;
  const records: string[][] = [];
  let row: string[] = [], field = '';
  quoted = false;
  const pushRow = () => { row.push(field); if (row.some(v => v.trim())) records.push(row); row = []; field = ''; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"' && !field) quoted = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\r' || c === '\n') { pushRow(); if (c === '\r' && text[i + 1] === '\n') i++; }
    else field += c;
  }
  if (quoted) throw new Error('CSV non valido: un campo tra virgolette non è chiuso.');
  if (field || row.length) pushRow();
  const headers = (records.shift() ?? []).map(h => h.trim());
  if (!headers.length || !records.length) throw new Error('Il file deve contenere una riga di intestazioni e almeno un libro.');
  if (headers.some(h => !h) || new Set(headers).size !== headers.length) throw new Error('Le intestazioni devono essere uniche e non vuote.');
  if (records.length > 5000) throw new Error('Importa al massimo 5.000 righe alla volta.');
  const rows = records.map((r, i) => {
    if (r.length !== headers.length) throw new Error(`Riga ${i + 2}: il numero di colonne non corrisponde alle intestazioni.`);
    return Object.fromEntries(headers.map((h, j) => [h, (r[j] ?? '').trim()]));
  });
  return { headers, rows, delimiter };
}
export function detectMapping(headers: string[]): ColumnMapping {
  return Object.fromEntries(Object.entries(IMPORT_FIELDS).map(([key, aliases]) => [key,
    aliases.map(a => headers.find(h => normalize(h) === normalize(a))).find(Boolean) ?? '',
  ])) as ColumnMapping;
}
export function mapStatus(value: string): ReadingStatus {
  const s = normalize(value);
  if (/abandon|did not finish|dnf|unfinished|non finit/.test(s)) return 'abandoned';
  if (/to read|to be read|unread|not yet|not started|want|wish|desider|da leggere|da comprare|tbr/.test(s)) return 'to_read';
  if (/currently|in lettura|reading|sto leggendo|in corso/.test(s)) return 'reading';
  if (/finit|terminat|complet|^lett[oi]$|^read$/.test(s)) return 'read';
  return 'to_read';
}
export function parseDate(value: string): string | null {
  if (!value.trim()) return null;
  let year: number, month: number, day: number;
  const iso = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:T.*)?$/);
  const eu = value.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (iso) [, year, month, day] = iso.map(Number) as [number, number, number, number];
  else if (eu) [, day, month, year] = eu.map(Number) as [number, number, number, number];
  else throw new Error(`Data non valida: ${value}. Usa AAAA-MM-GG o GG/MM/AAAA.`);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error(`Data non valida: ${value}`);
  return date.toISOString();
}
export function importRow(row: Record<string, string>, mapping: ColumnMapping) {
  const get = (f: ImportField) => row[mapping[f]]?.trim() ?? '';
  const number = (f: ImportField) => {
    if (!get(f)) return null;
    const n = Number(get(f).replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) throw new Error(`${FIELD_LABELS[f]} non valido`);
    return n;
  };
  const title = get('title'), isbn = get('isbn').replace(/[^0-9Xx]/g, '');
  if (!title && !isbn) throw new Error('Manca il titolo o un ISBN valido.');
  if (isbn && !/^(?:\d{9}[\dXx]|\d{13})$/.test(isbn)) throw new Error('ISBN deve contenere 10 o 13 caratteri.');
  const rawRating = number('rating');
  if (rawRating != null && rawRating > 5) throw new Error('Il voto deve essere compreso tra 0 e 5.');
  const rating = rawRating ? Math.round(rawRating * 2) / 2 : null;
  const finished = parseDate(get('finished')), started = parseDate(get('started'));
  const status = get('status') ? mapStatus(get('status')) : finished || rating ? 'read' : 'to_read';
  const pages = number('pages'), currentPage = number('currentPage');
  if ([pages, currentPage].some(n => n != null && !Number.isInteger(n))) throw new Error('Le pagine devono essere numeri interi.');
  if (pages && currentPage != null && currentPage > pages) throw new Error('La pagina attuale supera le pagine totali.');
  if (started && finished && started > finished) throw new Error('La data di fine precede quella di inizio.');
  const cover = get('cover');
  if (cover && !/^https:\/\//i.test(cover)) throw new Error('La copertina deve avere un indirizzo HTTPS.');
  return { title, author: get('author'), isbn, status, rating, pages, currentPage, started, finished,
    favorite: /^(y|yes|true|1|x|sì|si)$/i.test(get('favorite')), cover };
}
