import test from 'node:test';import assert from 'node:assert/strict';
import {resolveUiLanguage,uiChoice} from '../src/lib/ui-language.ts';
import {translateUi} from '../src/lib/ui-translation.ts';
import {parsePreferences,emptyPreferences} from '../src/lib/reading-preferences.ts';
test('explicit UI language beats the browser and preferences survive account serialization',()=>{
 assert.equal(resolveUiLanguage('en','it-IT'),'en');assert.equal(resolveUiLanguage('it','en-US'),'it');assert.equal(resolveUiLanguage('auto','it-IT'),'it');assert.equal(resolveUiLanguage('auto','fr-FR'),'en');assert.equal(uiChoice('invalid'),'auto');
 const prefs=parsePreferences({...emptyPreferences(),uiLanguage:'en',language:'fr',ebookDevices:['kobo']});assert.equal(prefs.uiLanguage,'en');assert.equal(prefs.language,'fr');assert.deepEqual(prefs.ebookDevices,['kobo']);
 assert.equal(parsePreferences(emptyPreferences()).uiLanguage,undefined);
});
test('interface translation preserves data and interpolated volume labels',()=>{
 assert.equal(translateUi('Il tuo voto','en'),'Your rating');assert.equal(translateUi('Il tuo voto','it'),'Il tuo voto');
 assert.equal(translateUi('Cerca una serie manga…','en'),'Search for a manga series…');
 assert.equal(translateUi('  Accedi ','en'),' Sign in ');
 assert.equal(translateUi('Volume 12, letto','en'),'Volume 12, read');
 assert.equal(translateUi('The Love Hypothesis','en'),'The Love Hypothesis');
 assert.equal(translateUi('Il mio diario segreto, di Anna','en'),'Il mio diario segreto, di Anna');
});

test('translation lookup does not expose prototype properties',()=>{
 assert.equal(translateUi('constructor','en'),'constructor');assert.equal(translateUi('__proto__','en'),'__proto__');
});

test('saving a site language retains genres and devices and checks the account identity',async()=>{
 const {saveReadingPreferences}=await import('../src/lib/reading-preferences-account.ts');
 let saved;const client={auth:{getUser:async()=>({data:{user:{id:'reader'}},error:null}),updateUser:async({data})=>{saved=data;return {error:null}}}};
 const prefs={...emptyPreferences(),status:'completed',liked:['fiction'],avoided:['horror'],ebookDevices:['kobo'],uiLanguage:'en',language:'en'};
 await saveReadingPreferences(client,'reader',prefs);assert.deepEqual(saved.reading_preferences_v1,prefs);
 await assert.rejects(saveReadingPreferences(client,'someone-else',prefs),/Accedi/);
});

test('book metadata and recommendation hints translate their interface parts',()=>{
 assert.equal(translateUi('2009 · 34 volumi (edizione originale) · Serie conclusa','en'),'2009 · 34 volumes (original edition) · Finished series');
 assert.equal(translateUi('Esplora: Narrativa contemporanea','en'),'Explore: Contemporary fiction');
});
