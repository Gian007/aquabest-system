// Browser-only proof persistence for the Staff web prototype.
// No Capacitor, cloud upload, or Supabase calls. Uninstalling/clearing browser data removes proofs.
const DB_NAME='aquabest-staff-proof-demo-v1';
const STORE='photos';
const VERSION=1;
export const MAX_PROOF_BYTES=8*1024*1024;
const openDb=()=>new Promise((resolve,reject)=>{
 if(typeof indexedDB==='undefined'){reject(new Error('This browser does not support local photo storage.'));return;}
 const request=indexedDB.open(DB_NAME,VERSION);
 request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'orderId'});};
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(request.error||new Error('Cannot open offline photo storage.'));
});
export async function saveLocalProof(orderId,file){
 if(!file||!file.type.startsWith('image/'))throw new Error('Choose a valid image first.');
 if(file.size>MAX_PROOF_BYTES)throw new Error('Photo exceeds 8 MB. Choose a smaller image.');
 const db=await openDb();
 try{
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite');
   tx.objectStore(STORE).put({orderId,file,filename:file.name||'proof.jpg',savedAt:new Date().toISOString()});
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error||new Error('Cannot save photo on this device.'));
   tx.onabort=()=>reject(tx.error||new Error('Local storage was interrupted.'));
  });
 }finally{db.close();}
}
export async function getLocalProof(orderId){
 const db=await openDb();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(orderId);
  req.onsuccess=()=>resolve(req.result||null);
  req.onerror=()=>reject(req.error||new Error('Could not read stored proof.'));
 });}finally{db.close();}
}
