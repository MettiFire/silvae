import test from 'node:test';
import assert from 'node:assert/strict';
import { countFinishedInYear, readingDay, canUpdateReading, validateReadingDates } from '../src/lib/reading-dates.ts';
import { importRow, detectMapping, parseCSV } from '../src/lib/csv-import.ts';
import { eligibleReading, createEnrollment } from '../src/lib/reading-challenges.ts';

test('Imported completion updates annual and date-limited challenges, independently of import date', () => {
  const csv = parseCSV('Title;Status;End Date\nLibro;finished;2025-12-31');
  const row = importRow(csv.rows[0], detectMapping(csv.headers));
  const item = { status: row.status, finished_at: row.finished };
  assert.equal(countFinishedInYear([item], 2025, '2026-01-10'), 1);
  assert.equal(countFinishedInYear([item], 2026, '2026-01-10'), 0);
  const enrollment = { ...createEnrollment('strega', '2025-01-01T00:00:00Z'), includePast: false, deadline: '2025-12-31' };
  assert.equal(eligibleReading(item, enrollment), true);
  assert.equal(eligibleReading({ ...item, finished_at: null }, enrollment), false);
});
test('Year boundaries do not shift with browser time zone; invalid and future days do not count', () => {
  const rows = ['2025-12-31T00:00:00Z', '2026-01-01T00:00:00Z', null, 'invalid', '2025-02-30T00:00:00Z', '2026-12-31T00:00:00Z']
    .map(finished_at => ({ status: 'read', finished_at }));
  assert.equal(countFinishedInYear(rows, 2025, '2026-01-10'), 1);
  assert.equal(countFinishedInYear(rows, 2026, '2026-01-10'), 1);
  assert.equal(readingDay('2025-02-30T00:00:00Z'), null);
  assert.throws(() => validateReadingDates('2025-02-02', '2025-02-01'), /precede/);
});
test('Only active reading offers progress updates, including imported finished books', () => {
  for (const status of ['read', 'to_read', 'abandoned']) assert.equal(canUpdateReading({ status }), false);
  assert.equal(canUpdateReading(null), false);
  assert.equal(canUpdateReading({ status: 'reading' }), true);
});
