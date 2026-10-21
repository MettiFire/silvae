import test from 'node:test';
import assert from 'node:assert/strict';
import { sameBook, descriptionText, coverUrls } from '../src/lib/book-metadata.ts';

test('Alternative editions need the same title and author, including reversed names', () => {
  const book = { title: 'Il nome della rosa', authors: ['Umberto Eco'] };
  assert.equal(sameBook(book, { title: 'Il nome della rosa: edizione illustrata', authors: ['Eco, Umberto'] }), true);
  assert.equal(sameBook(book, { title: 'Il nome della rosa', authors: ['Margherita Ganeri'] }), false);
  assert.equal(sameBook(book, { title: 'Postille a Il nome della rosa', authors: ['Umberto Eco'] }), false);
  assert.equal(sameBook({ title: '', authors: [] }, book), false);
  assert.equal(sameBook({ title: 'Dune', authors: ['Frank Herbert'] }, { title: 'Dune: Messiah', authors: ['Frank Herbert'] }), false);
  assert.equal(sameBook({ title: 'Преступление и наказание', authors: ['Достоевский'] }, { title: 'Преступление и наказание', authors: ['Достоевский'] }), true);
});
test('Provider markup becomes text and paragraph breaks, without active HTML', () => {
  assert.equal(descriptionText('<p>Una &quot;storia&quot; &amp; altro.</p><p>Secondo paragrafo.</p><script>alert(1)</script>'), 'Una "storia" & altro.\nSecondo paragrafo.');
  assert.equal(descriptionText('<img src=x onerror="alert(1)">Testo'), 'Testo');
  assert.equal(descriptionText('&#x1F4DA; &#8217;'), '📚 ’');
  assert.equal(descriptionText(null), '');
});
test('Image fallback tries distinct HTTPS candidates in order', () => {
  assert.deepEqual(coverUrls({ cover_url: 'https://a.test/cover.jpg', cover_candidates: ['https://a.test/cover.jpg', 'https://b.test/cover.jpg', 'javascript:alert(1)', 'http://c.test/x'] }), ['https://a.test/cover.jpg', 'https://b.test/cover.jpg']);
});
