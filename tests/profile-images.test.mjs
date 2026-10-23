import test from "node:test";
import assert from "node:assert/strict";
import { validateProfileImage, prepareProfileImage, uploadProfileImage, PROFILE_IMAGE_LIMIT } from "../src/lib/profile-images.ts";
const user="11111111-1111-4111-8111-111111111111";
const other="22222222-2222-4222-8222-222222222222";
function clientMock({uploadError=null,changed=false}={}) {
  const calls=[];let checks=0;
  const bucket={
    upload:async(path,blob,options)=>{calls.push({action:"upload",path,blob,options});return{error:uploadError}},
    getPublicUrl:path=>({data:{publicUrl:`https://storage.example.test/profile-images/${path}`}}),
    remove:async(paths)=>{calls.push({action:"remove",paths});return{error:null}},
  };
  return {calls,client:{auth:{getUser:async()=>({data:{user:{id:changed&&checks++?other:user}},error:null})},storage:{from:name=>{assert.equal(name,"profile-images");return bucket}}}};
}
const blob=()=>new Blob(["pixels"],{type:"image/webp"});
test("only supported nonempty images up to 8 MB enter conversion", () => {
  for(const file of [{type:"image/svg+xml",size:100},{type:"image/jpeg",size:0},{type:"image/png",size:8*1024*1024+1}])assert.throws(()=>validateProfileImage(file));
  assert.doesNotThrow(()=>validateProfileImage({type:"image/jpeg",size:8*1024*1024}));
});
test("avatar and banner upload to owner-only unique paths and are verified before returning a URL", async () => {
  for(const kind of ["avatar","banner"]){
    const {client,calls}=clientMock();let verified=false;
    const url=await uploadProfileImage(client,user,kind,blob(),async url=>{assert.match(url,new RegExp(`${user}/${kind}-`));verified=true});
    assert.equal(verified,true);assert.match(url,/\.webp$/);
    assert.equal(calls[0].path.startsWith(`${user}/${kind}-`),true);
    assert.equal(calls[0].options.upsert,false);
    assert.equal(calls[0].options.contentType,"image/webp");
    assert.equal(calls.length,1);
  }
});
test("unreachable uploads and sessions changed during upload never replace the profile URL", async () => {
  const first=clientMock();
  await assert.rejects(uploadProfileImage(first.client,user,"avatar",blob(),async()=>{throw Error("not reachable")}),/not reachable/);
  assert.equal(first.calls[1].action,"remove");
  assert.deepEqual(first.calls[1].paths,[first.calls[0].path]);
  const changed=clientMock({changed:true});
  await assert.rejects(uploadProfileImage(changed.client,user,"banner",blob(),async()=>{}),/sessione/);
  assert.equal(changed.calls[1].action,"remove");
});
test("storage errors and output size limits fail clearly without returning a broken URL", async () => {
  const missing=clientMock({uploadError:{message:"Bucket not found"}});
  await assert.rejects(uploadProfileImage(missing.client,user,"banner",blob(),async()=>{}),/non è ancora attivo/);
  const denied=clientMock({uploadError:{message:"new row violates row-level security policy"}});
  await assert.rejects(uploadProfileImage(denied.client,user,"avatar",blob(),async()=>{}),/autorizzare/);
  const big=clientMock();
  await assert.rejects(uploadProfileImage(big.client,user,"avatar",new Blob([new Uint8Array(PROFILE_IMAGE_LIMIT+1)],{type:"image/webp"}),async()=>{}),/limite/);
  assert.equal(big.calls.length,0);
});
test("conversion resizes avatars and banners, retries large outputs and always releases the decoded bitmap", async t => {
  const previousBitmap=globalThis.createImageBitmap,previousDocument=globalThis.document;
  t.after(()=>{if(previousBitmap)globalThis.createImageBitmap=previousBitmap;else delete globalThis.createImageBitmap;if(previousDocument)globalThis.document=previousDocument;else delete globalThis.document});
  let closed=0,attempt=0;const sizes=[];
  globalThis.createImageBitmap=async()=>({width:4000,height:2000,close:()=>closed++});
  globalThis.document={createElement:()=>{const canvas={width:0,height:0,getContext:()=>({drawImage:()=>{}}),toBlob:(cb,type)=>{sizes.push([canvas.width,canvas.height]);cb(new Blob([new Uint8Array(attempt++===0?PROFILE_IMAGE_LIMIT+1:100)],{type}))}};return canvas}};
  const file=new File(["image"],"photo.jpg",{type:"image/jpeg"});
  const output=await prepareProfileImage(file,"banner");
  assert.equal(output.size<=PROFILE_IMAGE_LIMIT,true);
  assert.deepEqual(sizes,[[1600,800],[1200,600]]);
  sizes.length=0;await prepareProfileImage(file,"avatar");assert.deepEqual(sizes,[[512,256]]);
  globalThis.createImageBitmap=async()=>({width:10000,height:10000,close:()=>closed++});
  await assert.rejects(prepareProfileImage(file,"avatar"),/troppo grande/);
  assert.equal(closed,3);
});
