import test from 'node:test';import assert from 'node:assert/strict';
import {mapManga,volumeRanges,parseMangaProgress,readVolumes,mangaCompletion,isMangaId,MANGA_FIELD} from '../src/lib/manga-model.ts';
import {encodeMangaProgress,decodeMangaProgress,saveMangaProgress} from '../src/lib/manga-account.ts';
const id='manga:md:6b1eb93e-473a-4ab3-9922-1a66d2a29a4a';
const now='2026-10-24T10:00:00Z';const state=(volumes,total=null)=>({ranges:volumeRanges(volumes),total,edition:'Italiana',updatedAt:now});
test('catalogue maps a manga to one stable series identity, not 72 library volumes',()=>{
 const book=mapManga({id:id.slice(9),attributes:{title:{en:'Naruto'},altTitles:[{it:'Naruto'}],lastVolume:'72',status:'completed',year:1999},relationships:[{id:'author',type:'author',attributes:{name:'Kishimoto Masashi'}},{id:'author',type:'artist',attributes:{name:'Kishimoto Masashi'}},{id:'cover',type:'cover_art',attributes:{fileName:'cover.jpg'}}]});
 assert.equal(book.id,id);assert.equal(book.title,'Naruto');assert.equal(book.manga.totalVolumes,72);assert.equal(book.page_count,null);assert.deepEqual(book.authors,['Kishimoto Masashi']);assert.ok(isMangaId(book.id));assert.match(book.cover_url,/\.256.jpg$/);
});
test('volume ranges retain holes, collapse duplicates, allow undo and reject invalid ranges',()=>{
 assert.deepEqual(volumeRanges([5,1,2,2,4]),[[1,2],[4,5]]);const parsed=parseMangaProgress({ranges:[[4,7],[1,5]],total:72,edition:'Italian',updatedAt:now});assert.deepEqual(readVolumes(parsed),[1,2,3,4,5,6,7]);
 for(const ranges of [[[0,1]],[[3,2]],[[1,2001]],[[1.5,2]]])assert.equal(parseMangaProgress({ranges,updatedAt:now}),null);
 assert.equal(parseMangaProgress({ranges:[],updatedAt:'bad'}),null);
});
test('a completed serialization needs every volume; an ongoing series never completes from a provisional total',()=>{
 const progress=state([1,2,4],4);const concluded={totalVolumes:4,status:'completed',source:''};assert.equal(mangaCompletion(progress,concluded).complete,false);assert.equal(mangaCompletion(progress,concluded).next,3);
 assert.equal(mangaCompletion(state([1,2,3,4],4),concluded).complete,true);
 assert.equal(mangaCompletion(state([1,2,3,4],4),{...concluded,status:'ongoing'}).complete,false);
 assert.equal(mangaCompletion(state([1,2,3,4]),{...concluded,totalVolumes:null}).complete,false);
 assert.equal(mangaCompletion(state([1,2],2),concluded).complete,true); // different omnibus edition
});
test('compact account storage round trips and rejects damaged or excessive input',()=>{
 const raw=encodeMangaProgress({[id]:state(Array.from({length:1000},(_,i)=>i+1),1000)});assert.ok(raw.length<500);assert.equal(readVolumes(decodeMangaProgress(raw)[id]).length,1000);assert.deepEqual(decodeMangaProgress('z1:corrupt'),{});assert.deepEqual(decodeMangaProgress(null),{});
});
test('saving progress preserves other series and unrelated metadata and rejects a changed account',async()=>{
 const other='manga:md:11111111-1111-4111-8111-111111111111';let metadata={[MANGA_FIELD]:encodeMangaProgress({[other]:state([1],2)}),reading_preferences_v1:{keep:true}};let updates=0;
 const client={auth:{getUser:async()=>({data:{user:{id:'reader',user_metadata:metadata}},error:null}),updateUser:async({data})=>{updates++;metadata={...metadata,...data};return {error:null}}}};
 await saveMangaProgress(client,'reader',id,state([1,3],4));const decoded=decodeMangaProgress(metadata[MANGA_FIELD]);assert.deepEqual(readVolumes(decoded[id]),[1,3]);assert.deepEqual(readVolumes(decoded[other]),[1]);assert.deepEqual(metadata.reading_preferences_v1,{keep:true});
 await assert.rejects(saveMangaProgress(client,'other',id,state([2])),/Accedi/);assert.equal(updates,1);
 client.auth.updateUser=async()=>({error:new Error('offline')});await assert.rejects(saveMangaProgress(client,'reader',id,state([2])),/offline/);
});
test('series status uses a single library row and never stores volume counts as pages',async()=>{
 const {mangaLibraryPatch}=await import('../src/lib/manga-model.ts');const prev={status:'reading',started_at:'2020-01-01',finished_at:null};const done={totalVolumes:2,status:'completed',source:''};
 const patch=mangaLibraryPatch(state([1,2],2),done,prev,now);assert.equal(patch.status,'read');assert.equal(patch.finished_at,now);assert.equal(patch.current_page,0);assert.equal(patch.total_pages,null);assert.equal(patch.progress_percent,null);
 assert.equal(mangaLibraryPatch(state([1,2],2),{...done,status:'ongoing'},prev,now).status,'reading');
 assert.equal(mangaLibraryPatch(state([1],2),done,{...prev,status:'read',finished_at:now},now).finished_at,null);
 assert.throws(()=>mangaLibraryPatch(state([1,3],2),done,prev,now),/oltre il totale/);
});

test('jumping ahead asks about holes and selecting only one volume never fills them implicitly', async()=>{
 const {missingPreviousVolumes,selectMangaVolume}=await import('../src/lib/manga-model.ts');
 assert.deepEqual(missingPreviousVolumes([1,3],5),[2,4]);
 assert.deepEqual(selectMangaVolume([1,3],5),[1,3,5]);
 assert.deepEqual(selectMangaVolume([1,3],5,true),[1,2,3,4,5]);
 assert.deepEqual(selectMangaVolume([1,2,3],2),[1,3]);
 assert.deepEqual(missingPreviousVolumes([],2001),[]);
 assert.deepEqual(selectMangaVolume([1],2001),[1]);
});
test('fallback series retain stable identifiers and deduplicate provider matches',async()=>{
 const {mapJikanManga,mergeMangaResults}=await import('../src/lib/manga-model.ts');
 const mal=mapJikanManga({mal_id:11,title:'Naruto',volumes:72,status:'Finished',authors:[{name:'Kishimoto, Masashi'}],images:{jpg:{image_url:'https://cdn.myanimelist.net/naruto.jpg'}}});
 assert.equal(mal.id,'manga:mal:11');assert.ok(isMangaId(mal.id));assert.equal(mal.manga.totalVolumes,72);assert.equal(mal.manga.status,'completed');assert.deepEqual(mal.authors,['Masashi Kishimoto']);
 const md={...mal,id,manga:{...mal.manga,mangaDexId:id.slice(9)}};
 assert.deepEqual(mergeMangaResults([md,md],[mal]).map(b=>b.id),[id]);
 const raw=encodeMangaProgress({[mal.id]:state([1,3],72)});assert.deepEqual(readVolumes(decodeMangaProgress(raw)[mal.id]),[1,3]);
});
test('volume cover selection prefers the selected language without mistaking chapters for volumes',async()=>{
 const {mangaVolumeCovers}=await import('../src/lib/manga-model.ts');
 const cover=(volume,locale,fileName)=>({attributes:{volume,locale,fileName}});
 const results=mangaVolumeCovers([cover('1','ja','original.jpg'),cover('1','en','english.jpg'),cover('1','it','italian.jpg'),cover('2','ja','second.jpg'),cover('2.5','it','extra.jpg'),cover(null,'it','unknown.jpg')],id.slice(9),'it');
 assert.deepEqual(results.map(c=>c.volume),[1,2]);assert.match(results[0].url,/italian.jpg/);assert.equal(results[0].language,'it');assert.equal(results[1].language,'ja');
});

test('localized and Japanese aliases use the primary catalogue title, including completion',async()=>{
 const {mangaSearchTitle}=await import('../src/lib/manga-model.ts');
 for(const query of ["L'attacco dei giganti",'Shingeki no Kyojin','l’attacco dei gi'])assert.equal(mangaSearchTitle(query),'Attack on Titan');
 assert.equal(mangaSearchTitle('Case Closed'),'Detective Conan');assert.equal(mangaSearchTitle('Lamù'),'Urusei Yatsura');assert.equal(mangaSearchTitle('Naruto'),'Naruto');assert.equal(mangaSearchTitle('constructor'),'constructor');
});
