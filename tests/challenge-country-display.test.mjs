import test from 'node:test';
import assert from 'node:assert/strict';
import {countryFlag,countryReadingGroups} from '../src/lib/challenge-country-display.ts';
import {createEnrollment,challengeProgress} from '../src/lib/reading-challenges.ts';
import {authorCountryKey} from '../src/lib/author-country-key.ts';
const item=(id,status,finished='2020-01-01')=>({id,book_id:id,status,finished_at:finished,books:{title:id,authors:['Haruki Murakami']}});
test('completed country separates qualifying reads from pending and out-of-date books',()=>{
 const enrollment=createEnrollment('countries');
 const rows=[item('unread','to_read'),item('reading','reading'),item('read-two','read'),item('read-one','read'),item('abandoned','abandoned')];
 const groups=countryReadingGroups(rows,enrollment,'read-one');
 assert.deepEqual(groups.valid.map(i=>i.id),['read-one','read-two']);assert.deepEqual(groups.pending.map(i=>i.id),['unread','reading']);assert.deepEqual(groups.outside.map(i=>i.id),['abandoned']);
 const progress=challengeProgress(enrollment,rows,{[authorCountryKey('Haruki Murakami')]:['JP']});
 assert.equal(progress.done,1);assert.equal(progress.slots.find(s=>s.country==='JP').completed.status,'read');
 assert.equal(countryFlag('JP'),'🇯🇵');assert.equal(countryFlag('IT'),'🇮🇹');assert.equal(countryFlag('invalid'),'');
});
test('a read book outside the thematic dates does not appear among eligible readings',()=>{
 const enrollment={...createEnrollment('countries','2026-01-01'),includePast:false};const rows=[item('past','read')];
 assert.equal(countryReadingGroups(rows,enrollment).valid.length,0);assert.equal(countryReadingGroups(rows,enrollment).outside.length,1);
});
