import { test } from "node:test"; import assert from "node:assert/strict";
import { rankRelatedBooks } from "../src/lib/related-books.ts";
const b=(id,title,authors,categories)=>({id,title,authors,categories});
test("history essay does not suggest classic novels", () => {
  const sapiens=b("s","Sapiens",["Yuval Noah Harari"],["Technology and civilization","Historical Chronology","History"]);
  const r=rankRelatedBooks(sapiens,[
    {book:b("p","Orgoglio e pregiudizio",["Jane Austen"],["Fiction","Historical fiction","Classics","History"]),source:{query:"x",genreId:"historical"}},
    {book:b("g","Guns, Germs, and Steel",["Jared Diamond"],["History","Civilization"]),source:{query:"y",genreId:"history"}},
  ]);
  assert.ok(!r.some(x=>x.book.id==="p"));
});
