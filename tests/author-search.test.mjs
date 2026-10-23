import test from "node:test";
import assert from "node:assert/strict";
import { authorSearchResults } from "../src/lib/author-search.ts";
const author = (id, name, birth, workCount) => ({ id, name, birth, workCount, topWork: null });
test("Search removes sparse duplicate author records and retains the identified author", () => {
  const results = authorSearchResults([
    author("a", "Italo Calvino", null, 1),
    author("b", "Italo Calvino", "1923", 500),
    author("c", "italo calvino", null, 2),
  ]);
  assert.deepEqual(
    results.map((a) => a.id),
    ["b"],
  );
});
test("Search keeps biographically distinct namesakes and chooses the fullest duplicate", () => {
  const results = authorSearchResults([
    author("a", "John Smith", "1950", 10),
    author("b", "John Smith", "1950", 20),
    author("c", "John Smith", "1980", 5),
    author("d", "Other Author", null, 2),
  ]);
  assert.deepEqual(
    results.map((a) => a.id),
    ["b", "c", "d"],
  );
});
test("An exact author query excludes conferences merely mentioning the author's name", () => {
  const results = authorSearchResults(
    [
      author("a", "Italo Calvino", "1923", 500),
      author("b", "Simposio in memoria di Italo Calvino", null, 1),
    ],
    3,
    "Italo Calvino",
  );
  assert.deepEqual(
    results.map((a) => a.id),
    ["a"],
  );
});

test("a book query never falls back to unrelated author names; partial personal names still match", () => {
  const candidates=[author("a","J. R. R. Tolkien","1892",500),author("b","Harry Pot",null,1)];
  assert.deepEqual(authorSearchResults(candidates,3,"La compagnia dell’anello"),[]);
  assert.deepEqual(authorSearchResults(candidates,3,"Harry pot"),[]);
  assert.deepEqual(authorSearchResults(candidates,3,"Tolk").map(a=>a.id),["a"]);
  assert.deepEqual(authorSearchResults([author("c","Simposio in memoria di Italo Calvino",null,5)],3,"Italo Calv"),[]);
});
test("birth date precision and sparse catalogue records do not create false homonyms", async () => {
  const {groupAuthors}=await import('../src/lib/author-search.ts');
  const candidates=[author("large","Fiódor Dostoievski","11 November 1821",2800),author("date","Fiodor Dostoievski","1821",10),author("empty","Fiódor Dostoiévski",null,0)];
  const result=groupAuthors(candidates);
  assert.equal(result.length,1);assert.equal(result[0].id,"large");
  assert.deepEqual(new Set(result[0].ids),new Set(["large","date","empty"]));
});
test("provider aliases unify script variants while different birth years remain distinct", async () => {
  const {groupAuthors,authorDisplayName}=await import('../src/lib/author-search.ts');
  const primary={...author("a","Фёдор Достоевский","1821",2800),alternateNames:["Fiódor Dostoievski"]};
  assert.equal(authorSearchResults([primary],3,"Fiodor Dostoievski")[0].id,"a");
  assert.equal(groupAuthors([primary,author("b","Fiódor Dostoievski","1821",10)]).length,1);
  assert.equal(groupAuthors([primary,author("c","Fiódor Dostoievski","1980",10)]).length,2);
  assert.equal(authorDisplayName([primary.name,"Fyodor Dostoevsky"],undefined,"it"),"Fyodor Dostoevsky");
  assert.equal(authorDisplayName([primary.name,"Fyodor Dostoevsky"],undefined,"ru"),primary.name);
});
