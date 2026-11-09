import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import type { Workspace } from '../offline/types';
import { OfflineVault, indexedDbStorage } from '../offline/vault';
it('retains the existing physical vault and its revision without creating a replacement', async () => {
 const passphrase='legacy correct horse battery staple';
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(passphrase),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt']);
 const workspace: Workspace={profileId:'legacy-owner',churchId:'legacy-church',branchId:'legacy-branch',branchName:'Legacy branch',permissions:['offline:read'],issuedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString(),outbox:[{mutationId:'pending-before-rebrand',entityId:'legacy-person',branchId:'legacy-branch',entity:'member',action:'create',status:'pending',data:{firstName:'Pending person'}}],drafts:{},records:{member:[],visitor:[],form:[]}};
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('churchos-offline-v1')},key,new TextEncoder().encode(JSON.stringify(workspace)));
 const db = await new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open('churchos-offline-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('vault');
  request.onerror=()=>reject(request.error); request.onsuccess=()=>resolve(request.result);
 });
 await new Promise<void>((resolve,reject)=>{const tx=db.transaction('vault','readwrite');tx.objectStore('vault').put({revision:7,salt,iv,ciphertext},'workspace');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});
 db.close();
 expect((await indexedDbStorage.read())?.revision).toBe(7);
 const vault=new OfflineVault();
 expect(await vault.unlock(passphrase)).toEqual(workspace);
 expect((await vault.read()).outbox[0].mutationId).toBe('pending-before-rebrand');
 expect((await indexedDB.databases()).map(db=>db.name)).not.toContain('belivrhq-offline-v1');
});
