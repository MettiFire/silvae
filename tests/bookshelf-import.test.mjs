import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { prepareImportFile } from '../src/lib/import-file.ts';
import { importRow, parseDate, mapStatus } from '../src/lib/csv-import.ts';

const books = 'ID,Title,Author,ISBN-10,ISBN-13,Year Published,Page Count,Category,Book Source,Reading Status,Start Date,End Date,Rating,Is Favorite\nvolume123,Libro uno,Autore,,9781234567897,2023,200,Fantasy,googleBooks,Lettura,15 ago 2023,,4/5,Yes\nvolume456,Libro due,Autore,,9781234567897,2020,100,Narrativa,googleBooks,Finito,1 gen 2022,2 feb 2022,0/5,No';
const history = 'ID,Book ID,Book Title,Status,Read Number,Start Date,End Date,Percent Complete,Rating\nh1,volume123,Libro uno,Lettura,1,15 ago 2023,,0.465,4\nh2,volume456,Libro due,Finito,1,1 gen 2022,2 feb 2022,1.0044,0';

test('Bookshelf CSV preserves source ID, localized dates, ratings, categories and statuses', () => {
  const result = prepareImportFile('Bookshelf-Books.csv', strToU8(books));
  const row = importRow(result.parsed.rows[0], result.mapping);
  assert.equal(row.sourceId, 'volume123');
  assert.equal(row.source, 'googleBooks');
  assert.equal(row.status, 'reading');
  assert.equal(row.rating, 4);
  assert.equal(row.started, '2023-08-15T00:00:00.000Z');
  assert.equal(row.year, 2023);
  assert.deepEqual(row.categories, ['Fantasy']);
  assert.equal(row.favorite, true);
  assert.equal(importRow(result.parsed.rows[1], result.mapping).rating, null);
});
test('ZIP selects Books, merges history and identifies unimported auxiliary CSVs', () => {
  const zip = zipSync({
    'Bookshelf-Books-2026.csv': strToU8(books),
    'Bookshelf-Reading_History-2026.csv': strToU8(history),
    'Bookshelf-Cards-2026.csv': strToU8('ID,Title,Study Level\nn1,Nota,1'),
    'Bookshelf-Collections-2026.csv': strToU8('ID,Title,Book IDs\nc1,Lista,volume123'),
  });
  const result = prepareImportFile('Bookshelf-export.zip', zip);
  assert.equal(result.parsed.rows.length, 2);
  const first = importRow(result.parsed.rows[0], result.mapping);
  assert.equal(first.currentPage, 93);
  assert.equal(first.readCount, 1);
  assert.equal(importRow(result.parsed.rows[1], result.mapping).currentPage, 100);
  assert.match(result.notices.join(' '), /Cards/);
  assert.match(result.notices.join(' '), /Collections/);
});
test('Italian named dates and all Bookshelf statuses are recognized', () => {
  for (const [index,month] of ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'].entries()) {
    assert.equal(new Date(parseDate(`15 ${month} 2023`)).getUTCMonth(), index);
  }
  assert.equal(mapStatus('Abbandonato'), 'abandoned');
  assert.equal(mapStatus('Lista dei desideri'), 'to_read');
  assert.equal(mapStatus('Da Leggere'), 'to_read');
  assert.equal(mapStatus('Finito'), 'read');
  assert.throws(() => parseDate('31 feb 2023'));
});
test('Auxiliary files and ambiguous archives are not silently imported as books', () => {
  assert.throws(() => prepareImportFile('Cards.csv', strToU8('ID,Title,Study Level\nn1,Nota,1')), /citazioni/);
  assert.throws(() => prepareImportFile('History.csv', strToU8(history)), /storico/);
  assert.throws(() => prepareImportFile('Ambiguous.zip', zipSync({ 'a.csv':strToU8(books), 'b.csv':strToU8(books) })), /solo/);
  assert.throws(() => prepareImportFile('Broken.zip', strToU8('not a zip')), /ZIP/);
});

test('Latest reading history owns its date pair; an ongoing reread does not inherit an old finish', () => {
  const main = 'ID,Title,Author,Reading Status,Start Date,End Date\nvolume123,Libro,Autore,Finito,1 gen 2020,2 feb 2020';
  const sessions = 'Book ID,Read Number,Status,Start Date,End Date,Percent Complete\nvolume123,1,Finito,1 gen 2020,2 feb 2020,1\nvolume123,2,Lettura,1 gen 2025,,0.5';
  const result = prepareImportFile('Export.zip', zipSync({
    'Bookshelf-Books.csv': strToU8(main), 'Bookshelf-Reading_History.csv': strToU8(sessions),
  }));
  const row = importRow(result.parsed.rows[0], result.mapping);
  assert.equal(row.status, 'reading');
  assert.equal(row.started, '2025-01-01T00:00:00.000Z');
  assert.equal(row.finished, null);
  assert.equal(row.readCount, 2);
});
