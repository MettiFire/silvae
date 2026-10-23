import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogueAuthorCountries} from '../src/lib/author-country-resolver.ts';
const claim=(value,rank='normal')=>({rank,mainsnak:{datavalue:{value}}});
const a=(id,name,birth=null,workCount=0,alternateNames=[])=>({id,name,birth,workCount,alternateNames,topWork:null});
test('country resolution shares aliases and duplicate author identity rather than rejecting one person twice',async()=>{
 const result=await catalogueAuthorCountries('Fiodor Dostoievski',{
  search:async()=>[a('OL22242A','Фёдор Достоевский','11 November 1821',2800,['Fiodor Dostoievski']),a('OL99999A','Fiodor Dostoievski')],
  author:async id=>{assert.equal(id,'OL22242A');return {remote_ids:{wikidata:'Q1'}};},
  entity:async id=> id==='Q1'?{claims:{P27:[claim({id:'Q2'})]}}:{claims:{P297:[claim('RU')]}}
 });assert.deepEqual(result,['RU']);
});
test('real homonyms remain unknown, never guessed from a language or a name',async()=>{
 const result=await catalogueAuthorCountries('Jane Smith',{
  search:async()=>[a('OL1A','Jane Smith','1970',10),a('OL2A','Jane Smith','1980',20)],
  author:async()=>{throw Error('Must not pick an arbitrary author');},entity:async()=>({})
 });assert.deepEqual(result,[]);
});
test('multiple documented citizenships survive; deprecated claims and unsupported historical states do not',async()=>{
 const result=await catalogueAuthorCountries('Test Author',{
  search:async()=>[a('OL1A','Test Author','1900',10)],author:async()=>({remote_ids:{wikidata:'Q1'}}),
  entity:async id=>id==='Q1'?{claims:{P27:[claim({id:'Q2'}),claim({id:'Q3'}),claim({id:'Q4'}),claim({id:'Q5'},'deprecated')]}}:{claims:{P297:[claim(({Q2:'GB',Q3:'US',Q4:'SU',Q5:'IT'})[id])]}}
 });assert.deepEqual(result,['GB','US']);
});
test('reviewed Murakami identity resolves Japan despite conflicting catalogue birthdays and reversed names',async()=>{
 for(const name of ['Haruki Murakami','Murakami, Haruki','村上春樹']){
  const codes=await catalogueAuthorCountries(name,{
   search:async()=>{throw Error('Reviewed identifier does not need ambiguous name search');},author:async()=>{throw Error('Reviewed Wikidata identifier already available');},
   entity:async id=>{assert.ok(['Q134798','Q17'].includes(id));return id==='Q134798'?{claims:{P27:[claim({id:'Q17'})]}}:{claims:{P297:[claim('JP')]}};}
  });assert.deepEqual(codes,['JP']);
 }
});
