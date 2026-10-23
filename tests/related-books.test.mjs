import test from "node:test";
import assert from "node:assert/strict";
import { relatedBookSources, rankRelatedBooks } from "../src/lib/related-books.ts";
const book = (id, title, authors=["A Writer"], categories=["Fiction", "Fantasy"]) => ({ id, title, authors, categories, cover_url:null, page_count:null, published_year:null, description:null });
const current = book("ol:OL1W", "First Story");
const candidate = (book, source={query:'subject:"Fantasy"',genreId:"fantasy"}) => ({book,source});
test("related search favors specific genres over generic fiction and never mixes science fiction with science", () => {
  assert.deepEqual(relatedBookSources(current).map(s=>s.query), ['inauthor:"A Writer"','subject:"Fantasy"']);
  const sources=relatedBookSources(book("b","Space",["A Writer"],["Fiction", "Science Fiction"]));
  assert.equal(sources.some(s=>s.genreId==="scifi"),true);
  assert.equal(sources.some(s=>s.genreId==="science"),false);
  assert.equal(sources.some(s=>s.genreId==="fiction"),false);
  assert.deepEqual(relatedBookSources(book("empty","Unknown",[],[])),[]);
});
test("similar books exclude the opened work and its translations, keep sequels and explain relevance", () => {
  const translation=book("translated","Una storia");
  const identities={translated:{workIds:["OL1W"],titles:["First Story"],verified:true}};
  const results=rankRelatedBooks(current,[candidate(current),candidate(translation),candidate(book("next","Next Story")),candidate(book("other","Another fantasy",["Another Author"]))],identities);
  assert.deepEqual(results.map(r=>r.book.id),["next","other"]);
  assert.equal(results[0].reason,"Dello stesso autore");
  assert.match(results[1].reason,/Fantasy/);
});
test("genres the reader avoids and unrelated popular books do not leak into the section", () => {
  assert.deepEqual(rankRelatedBooks(current,[candidate(book("popular","Business",["Other Author"],["Business"]),{query:"inauthor:A",author:"A Writer"})]),[]);
  assert.deepEqual(rankRelatedBooks(current,[candidate(book("fantasy","A fantasy",["Other Author"]))],{},["fantasy"]),[]);
});
test("edition duplicates collapse and one author does not occupy every place when alternatives exist", () => {
  const a=book("a","Next Story");
  const items=[candidate(a),candidate(book("a-edition","Next Story (new edition)")),candidate(book("b","Third Story")),candidate(book("c","Fourth Story")),candidate(book("d","Other fantasy",["Another Author"]))];
  const result=rankRelatedBooks(current,items,{},[],3);
  assert.equal(result.length,3);
  assert.equal(result.filter(r=>r.book.title.startsWith("Next Story")).length,1);
  assert.equal(result.some(r=>r.book.id==="d"),true);
});

test("generic fiction alone does not produce unrelated bestsellers and catalogue article variants are the same work", () => {
  const decameron=book("ol:OL40567956W","Decameron",["Giovanni Boccaccio"],["Fiction, general","Europe, fiction"]);
  assert.deepEqual(relatedBookSources(decameron),[{query:'inauthor:"Giovanni Boccaccio"',author:"Giovanni Boccaccio"}]);
  const edition=book("ol:OL7180368W","The Decameron",["Giovanni Boccaccio"],["Fiction"]);
  const fiammetta=book("fiammetta","The elegy of Lady Fiammetta",["Giovanni Boccaccio"],["Fiction"]);
  assert.deepEqual(rankRelatedBooks(decameron,[candidate(edition),candidate(fiammetta)]).map(item=>item.book.id),["fiammetta"]);
});
