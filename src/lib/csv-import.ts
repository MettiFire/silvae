export const IMPORT_FIELDS = {
  sourceId: ['id', 'book id'],
  source: ['book source', 'source', 'fonte'],
  year: ['year published', 'published year', 'anno pubblicazione'],
  categories: ['category', 'categories', 'generi', 'categoria'],
  percent: ['progress (%)', 'progress percent', 'percent complete', 'percentuale completata'],
  readCount: ['read count', 'read number', 'numero letture'],
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
  description: ['description', 'descrizione', 'sinossi', 'summary', 'synopsis'],
  cover: ['cover', 'cover url', 'copertina', 'image url'],
} as const;
export type ImportField = keyof typeof IMPORT_FIELDS;
export type ColumnMapping = Record<ImportField, string>;
export type ReadingStatus = 'to_read' | 'reading' | 'read' | 'abandoned';
export const FIELD_LABELS: Record<ImportField, string> = {
  sourceId: 'ID originale del libro', source: 'Fonte originale', year: 'Anno pubblicazione', categories: 'Generi / categorie', percent: 'Progresso (%)', readCount: 'Numero di letture',
  title: 'Titolo', author: 'Autore', isbn: 'ISBN', status: 'Stato di lettura', rating: 'Voto (0–5)',
  pages: 'Pagine totali', currentPage: 'Pagina attuale', started: 'Data inizio', finished: 'Data fine',
  favorite: 'Preferito', description: 'Descrizione / sinossi', cover: 'URL copertina',
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
  if (/abandon|abbandon|did not finish|dnf|unfinished|non finit/.test(s)) return 'abandoned';
  if (/to read|to be read|unread|not yet|not started|want|wish|desider|da leggere|da comprare|tbr/.test(s)) return 'to_read';
  if (/currently|in lettura|^lettura$|reading|sto leggendo|in corso/.test(s)) return 'reading';
  if (/finit|terminat|complet|^lett[oi]$|^read$/.test(s)) return 'read';
  return 'to_read';
}
export function parseDate(value: string): string | null {
  if (!value.trim()) return null;
  let year: number, month: number, day: number;
  const months: Record<string, number> = { gen: 1, gennaio: 1, jan: 1, january: 1, feb: 2, febbraio: 2, february: 2, mar: 3, marzo: 3, march: 3, apr: 4, aprile: 4, april: 4, mag: 5, maggio: 5, may: 5, giu: 6, giugno: 6, jun: 6, june: 6, lug: 7, luglio: 7, jul: 7, july: 7, ago: 8, agosto: 8, aug: 8, august: 8, set: 9, sett: 9, settembre: 9, sep: 9, sept: 9, september: 9, ott: 10, ottobre: 10, oct: 10, october: 10, nov: 11, novembre: 11, november: 11, dic: 12, dicembre: 12, dec: 12, december: 12 };
  const named = value.trim().toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})$/);
  const iso = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:T.*)?$/);
  const eu = value.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (named && months[named[2]!]) { day = Number(named[1]); month = months[named[2]!]!; year = Number(named[3]); }
  else if (iso) [, year, month, day] = iso.map(Number) as [number, number, number, number];
  else if (eu) [, day, month, year] = eu.map(Number) as [number, number, number, number];
  else throw new Error(`Data non valida: ${value}. Usa AAAA-MM-GG, GG/MM/AAAA o 15 ago 2023.`);
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
  const ratingParts = get('rating').match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/);
  let rawRating = ratingParts ? Number(ratingParts[1]!.replace(',', '.')) : number('rating');
  if (ratingParts) {
    const scale = Number(ratingParts[2]!.replace(',', '.'));
    if (!scale || rawRating! > scale) throw new Error('Voto non valido. Usa per esempio 4/5.');
    rawRating = rawRating! / scale * 5;
  }
  if (rawRating != null && rawRating > 5) throw new Error('Il voto deve essere compreso tra 0 e 5.');
  const rating = rawRating ? Math.round(rawRating * 2) / 2 : null;
  const finished = parseDate(get('finished')), started = parseDate(get('started'));
  const status = get('status') ? mapStatus(get('status')) : finished || rating ? 'read' : 'to_read';
  const pages = number('pages');
  let currentPage = number('currentPage');
  const rawPercent = get('percent');
  if (rawPercent && currentPage == null && pages) {
    let percent = Number(rawPercent.replace('%', '').replace(',', '.'));
    // Bookshelf stores fractions (0.465...), sometimes just over 1 due to a changed page count.
    if (normalize(mapping.percent) === 'percent complete' && !rawPercent.includes('%')) percent = Math.min(percent, 1) * 100;
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error('Progresso non valido: usa un valore tra 0 e 100.');
    currentPage = Math.min(pages, Math.round(pages * percent / 100));
  }
  const year = number('year'), readCount = number('readCount');
  if (year != null && (!Number.isInteger(year) || year < 1 || year > 9999)) throw new Error('Anno di pubblicazione non valido.');
  if (readCount != null && !Number.isInteger(readCount)) throw new Error('Il numero di letture deve essere intero.');
  if ([pages, currentPage].some(n => n != null && !Number.isInteger(n))) throw new Error('Le pagine devono essere numeri interi.');
  if (pages && currentPage != null && currentPage > pages) throw new Error('La pagina attuale supera le pagine totali.');
  if (started && finished && started > finished) throw new Error('La data di fine precede quella di inizio.');
  const cover = get('cover');
  if (cover && !/^https:\/\//i.test(cover)) throw new Error('La copertina deve avere un indirizzo HTTPS.');
  return { sourceId: get('sourceId'), source: get('source'), year, categories: get('categories').split(/[,;]/).map(s => s.trim()).filter(Boolean), readCount, title, author: get('author'), isbn, status, rating, pages, currentPage, started, finished,
    favorite: /^(y|yes|true|1|x|sì|si)$/i.test(get('favorite')), description: get('description'), cover };
}
