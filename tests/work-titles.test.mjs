import test from 'node:test';
import assert from 'node:assert/strict';
import { localizedWorkTitles, needsLocalizedTitle } from '../src/lib/work-titles.ts';
test('localized titles use exact work identifiers, cache metadata and reject invalid ids',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);let calls=0;
 globalThis.fetch=async url=>{calls++;const query=new URL(url).searchParams.get('query');assert.match(query,/"OL166894W"/);assert.doesNotMatch(query,/injected/);return {ok:true,json:async()=>({results:{bindings:[{id:{value:'OL166894W'},label:{value:'Delitto e castigo'}}]}})}};
 assert.equal(needsLocalizedTitle('Преступление и наказание','it'),true);
 assert.equal(needsLocalizedTitle('Преступление и наказание','ru'),false);
 assert.equal((await localizedWorkTitles(['OL166894W','injected'],'it')).get('OL166894W'),'Delitto e castigo');
 await localizedWorkTitles(['OL166894W'],'it');assert.equal(calls,1);
});
test('secondary title catalogue failures leave edition fallback available',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);globalThis.fetch=async()=>{throw Error('offline')};
 assert.equal((await localizedWorkTitles(['OL9999999W'],'fr')).size,0);
});
