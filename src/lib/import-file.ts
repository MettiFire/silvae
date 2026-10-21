import { unzipSync } from 'fflate';
import { parseCSV, detectMapping } from './csv-import.ts';

const MAX_FILE = 10 * 1024 * 1024;
const MAX_EXPANDED = 20 * 1024 * 1024;
function decode(bytes: Uint8Array) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return new TextDecoder('windows-1252').decode(bytes); }
}
function checkBookColumns(parsed: ReturnType<typeof parseCSV>) {
  if (parsed.headers.includes('Book IDs')) throw new Error('Questo CSV contiene collezioni. Seleziona Bookshelf-Books oppure carica lo ZIP originale.');
  if (parsed.headers.includes('Study Level')) throw new Error('Questo CSV contiene citazioni. Seleziona Bookshelf-Books oppure carica lo ZIP originale.');
  if (parsed.headers.includes('Read Number') && !parsed.headers.includes('Author')) throw new Error('Questo è lo storico di lettura. Carica lo ZIP originale con Bookshelf-Books per collegarlo ai libri.');
}
export function prepareImportFile(name: string, bytes: Uint8Array) {
  if (bytes.length > MAX_FILE) throw new Error('Il file supera 10 MB. Dividilo in file più piccoli.');
  if (!/\.zip$/i.test(name)) {
    const parsed = parseCSV(decode(bytes));
    checkBookColumns(parsed);
    return { parsed, mapping: detectMapping(parsed.headers), notices: [] as string[], selectedName: name };
  }
  let total = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: file => {
      if (!/\.csv$/i.test(file.name) || file.name.startsWith('__MACOSX/')) return false;
      total += file.originalSize;
      if (total > MAX_EXPANDED) throw new Error('ARCHIVE_LIMIT');
      return true;
    } });
  } catch (error) {
    if ((error as Error).message === 'ARCHIVE_LIMIT') throw new Error('I CSV nello ZIP superano 20 MB.');
    throw new Error('Impossibile leggere lo ZIP. Usa un archivio non protetto da password con file CSV.');
  }
  const names = Object.keys(files);
  const main = names.filter(n => /(?:^|\/)Bookshelf-Books(?:-|\.csv)/i.test(n));
  const selected = main.length === 1 ? main[0] : names.length === 1 ? names[0] : undefined;
  if (!selected) throw new Error('Nello ZIP deve esserci un solo export Bookshelf-Books oppure un solo CSV.');
  const parsed = parseCSV(decode(files[selected]!));
  checkBookColumns(parsed);
  const notices: string[] = [`Archivio letto sul tuo dispositivo. Selezionato ${selected.split('/').pop()}.`];
  const histories = names.filter(n => /Bookshelf-Reading_History(?:-|\.csv)/i.test(n));
  if (histories.length > 1) throw new Error('Lo ZIP contiene più storici di lettura: usa un solo export alla volta.');
  if (histories[0]) {
    const history = parseCSV(decode(files[histories[0]]!));
    const latest = new Map<string, Record<string, string>>();
    for (const row of history.rows) {
      const id = row['Book ID'];
      if (!id) continue;
      const previous = latest.get(id);
      if (!previous || Number(row['Read Number'] || 1) >= Number(previous['Read Number'] || 1)) latest.set(id, row);
    }
    const additions = ['Percent Complete', 'Read Count'];
    for (const field of additions) if (!parsed.headers.includes(field)) parsed.headers.push(field);
    for (const row of parsed.rows) {
      const reading = latest.get(row['ID'] ?? '');
      if (!reading) continue;
      row['Percent Complete'] = reading['Percent Complete'] ?? '';
      row['Read Count'] = reading['Read Number'] ?? '';
      if (!row['Start Date']) row['Start Date'] = reading['Start Date'] ?? '';
      if (!row['End Date']) row['End Date'] = reading['End Date'] ?? '';
    }
    notices.push(`Storico di lettura collegato: ${latest.size} libri, con progresso e numero di letture.`);
  }
  const ignored = names.filter(n => n !== selected && !histories.includes(n));
  if (ignored.length) notices.push(`Questa importazione trasferisce i libri e lo storico. I file ${ignored.map(n => n.split('/').pop()).join(', ')} contengono citazioni o collezioni e non vengono importati.`);
  return { parsed, mapping: detectMapping(parsed.headers), notices, selectedName: selected };
}
