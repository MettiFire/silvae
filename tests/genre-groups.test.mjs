import test from 'node:test';
import assert from 'node:assert/strict';
import {GENRE_GROUPS,genreGroups,genreQuery} from '../src/lib/genre-groups.ts';
import {emptyPreferences,parsePreferences,showEbookProgress} from '../src/lib/reading-preferences.ts';
test('catalogue subjects become bounded groups without mutating metadata',()=>{
 const categories=['Science Fiction / Space Opera','Fantascienza','Mystery & Detective','Thriller'];
 assert.deepEqual(genreGroups(categories),['fiction','speculative','mystery']);
 assert.equal(genreGroups(categories).includes('nonfiction'),false);
 assert.equal(categories.length,4);assert.equal(GENRE_GROUPS.length,9);
 assert.deepEqual(genreGroups(['Nonfiction / Philosophy']),['nonfiction']);
 assert.deepEqual(genreGroups([]),['other']);
 assert.deepEqual(genreGroups(['undocumented subject']),['other']);
 assert.match(genreQuery('mystery'),/subject:"Mystery" OR subject:"Thriller"/);
 assert.match(genreQuery('speculative'),/subject:"Fantasy" OR subject:"Science Fiction" OR subject:"Horror"/);
});
test('ebook ownership survives preference storage and an explicit No hides only ebook controls',()=>{
 const no={...emptyPreferences(),ebookDevices:[]};
 assert.deepEqual(parsePreferences(no).ebookDevices,[]);assert.equal(showEbookProgress(no),false);
 for(const ebookDevices of [['kindle'],['kobo'],['kindle','kobo','other']]){
  const prefs={...emptyPreferences(),ebookDevices};assert.deepEqual(parsePreferences(prefs).ebookDevices,ebookDevices);assert.equal(showEbookProgress(prefs),true);
 }
 assert.equal(showEbookProgress(emptyPreferences()),true);assert.equal(showEbookProgress(null),true);
 assert.deepEqual(parsePreferences({...no,ebookDevices:['kobo','kobo','bad',42]}).ebookDevices,['kobo']);
});
test('manga series do not become prose novels solely because the category says graphic novels',()=>{assert.deepEqual(genreGroups(['Manga','Comics & Graphic Novels']),['comics']);});
