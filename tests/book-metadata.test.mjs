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

test('the same resolved cover survives provider changes, and a personal cover always takes priority', async () => {
  const { displayCoverUrls } = await import('../src/lib/book-metadata.ts');
  const book={cover_url:'https://example.org/canonical.jpg',cover_candidates:['https://example.org/fallback.jpg']};
  assert.deepEqual(displayCoverUrls(book,'https://example.org/home-edition.jpg'),['https://example.org/home-edition.jpg','https://example.org/canonical.jpg','https://example.org/fallback.jpg']);
  assert.equal(displayCoverUrls({...book,custom_cover_url:'https://example.org/personal.jpg'},'https://example.org/home-edition.jpg')[0],'https://example.org/personal.jpg');
  assert.equal(displayCoverUrls(book)[0],book.cover_url);
});

test('cover memory survives a new tab but never stores private/signed uploads', async () => {
  const {readCatalogueCover, rememberCatalogueCover}=await import('../src/lib/book-cover-memory.ts');
  let value=null;const storage={getItem:()=>value,setItem:(_,next)=>{value=next}};
  rememberCatalogueCover(storage,'book','https://covers.openlibrary.org/b/id/123-L.jpg',1000);
  assert.equal(readCatalogueCover(storage,'book',2000),'https://covers.openlibrary.org/b/id/123-L.jpg');
  rememberCatalogueCover(storage,'private','https://project.supabase.co/storage/v1/object/sign/covers/image.jpg?token=private',2000);
  assert.equal(readCatalogueCover(storage,'private',2000),undefined);
  assert.equal(value.includes('private'),false);
  assert.equal(readCatalogueCover(storage,'book',8*86400000),undefined);
  value='{corrupt';assert.equal(readCatalogueCover(storage,'book',2000),undefined);
});
