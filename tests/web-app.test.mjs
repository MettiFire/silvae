import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
test('install manifest uses real tree icons, standalone display and Apple home-screen assets',async()=>{
 const manifest=JSON.parse(await read('public/manifest.webmanifest'));
 assert.equal(manifest.name,'Silvae');assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');
 assert.equal(manifest.icons.some(icon=>icon.purpose==='maskable'),true);
 for(const icon of manifest.icons){const data=await readFile(new URL('../public'+icon.src,import.meta.url));assert.equal(data.toString('ascii',1,4),'PNG');const[size]=icon.sizes.split('x').map(Number);assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size);}
 const apple=await readFile(new URL('../public/apple-touch-icon.png',import.meta.url));assert.equal(apple.readUInt32BE(16),180);
 const root=await read('src/routes/__root.tsx');assert.match(root,/rel: "manifest"/);assert.match(root,/apple-touch-icon/);assert.match(root,/viewport-fit=cover/);
});
test('worker caches only public offline assets and never stores accounts, APIs or private pages',async()=>{
 const handlers={};let assets=[],deleted=[],network=0;const cached=[];
 const context={URL,Promise,self:{location:{origin:'https://silvae.test'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},caches:{open:async()=>({addAll:async list=>assets=list}),keys:async()=>['silvae-shell-old','other-app'],delete:async name=>deleted.push(name),match:async name=>{cached.push(name);return'offline-screen'}},fetch:async()=>{network++;throw Error('offline')}};
 vm.runInNewContext(await read('public/sw.js'),context);
 let task;handlers.install({waitUntil:promise=>task=promise});await task;
 assert.equal(assets.includes('/offline.html'),true);assert.equal(assets.includes('/'),false);assert.equal(assets.some(path=>/library|auth|profile|rest\/v1/.test(path)),false);
 handlers.activate({waitUntil:promise=>task=promise});await task;assert.deepEqual(deleted,['silvae-shell-old']);
 let intercepted=false;
 for(const path of ['/rest/v1/library_items','/auth/v1/user','/api/private'])handlers.fetch({request:{url:'https://silvae.test'+path,method:'GET',mode:'cors'},respondWith:()=>intercepted=true});
 assert.equal(intercepted,false);assert.equal(cached.length,0);
 handlers.fetch({request:{url:'https://silvae.test/library',method:'GET',mode:'navigate'},respondWith:promise=>task=promise});
 assert.equal(await task,'offline-screen');assert.equal(network,1);assert.deepEqual(cached,['/offline.html']);
});
