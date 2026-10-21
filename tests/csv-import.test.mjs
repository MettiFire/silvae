import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, detectMapping, importRow, mapStatus, parseDate } from '../src/lib/csv-import.ts';

test('CSV quoted delimiters, BOM, escaped quotes and multiline fields', () => {
  const data = parseCSV('\uFEFFTitle,Author,Notes\r\n"Libro, uno",Autore,"Una ""citazione""\nseconda riga"\r\n');
  assert.equal(data.rows[0].Title, 'Libro, uno');
  assert.equal(data.rows[0].Notes, 'Una "citazione"\nseconda riga');
});
test('Italian semicolon CSV, decimal comma, dates and accented author', () => {
  const data = parseCSV('Titolo;Autore;Stato;Voto;Data fine;Pagine\nIl nome della rosa;Umberto Eco;letto;4,5;21/10/2026;512');
  const row = importRow(data.rows[0], detectMapping(data.headers));
  assert.equal(row.title, 'Il nome della rosa');
  assert.equal(row.rating, 4.5);
  assert.equal(row.finished, '2026-10-21T00:00:00.000Z');
  assert.equal(row.status, 'read');
});
test('TSV and Goodreads quoted ISBN formula', () => {
  const data = parseCSV('Title\tISBN13\tExclusive Shelf\tMy Rating\nDune\t="9780441172719"\tto-read\t0');
  const row = importRow(data.rows[0], detectMapping(data.headers));
  assert.equal(row.isbn, '9780441172719');
  assert.equal(row.rating, null);
  assert.equal(row.status, 'to_read');
  assert.equal(row.finished, null);
});
test('Unread and unfinished never become read or reading', () => {
  assert.equal(mapStatus('unread'), 'to_read');
  assert.equal(mapStatus('did-not-finish'), 'abandoned');
  assert.equal(mapStatus('currently-reading'), 'reading');
  assert.equal(mapStatus('non finito'), 'abandoned');
});
test('Invalid CSV and impossible dates are rejected', () => {
  assert.throws(() => parseCSV('Title,Author\n"unclosed,author'));
  assert.throws(() => parseCSV('Title,Title\na,b'));
  assert.throws(() => parseCSV('Title,Author\na,b,c'));
  assert.throws(() => parseDate('31/02/2026'));
});
test('Custom mapping supports arbitrary headers and validates ranges', () => {
  const data = parseCSV('Nome;Scrittore;Punteggio;Totale;Ora\nDune;Frank Herbert;9;100;120');
  const mapping = { ...detectMapping(data.headers), title: 'Nome', author: 'Scrittore', rating: 'Punteggio', pages: 'Totale', currentPage: 'Ora' };
  assert.throws(() => importRow(data.rows[0], mapping), /voto/);
  mapping.rating = '';
  assert.throws(() => importRow(data.rows[0], mapping), /supera/);
});

test('CSV can supply a missing synopsis with quoted multiline text', () => {
  const data = parseCSV('Titolo;Autore;Sinossi\nLibro;Autore;"Prima riga\nSeconda riga"');
  const row = importRow(data.rows[0], detectMapping(data.headers));
  assert.equal(row.description, 'Prima riga\nSeconda riga');
});
