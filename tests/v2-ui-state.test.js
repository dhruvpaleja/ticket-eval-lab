import test from 'node:test';
import assert from 'node:assert/strict';
import {mountApp} from './helpers/dom-double.js';
import {BUILTIN_SUITE} from '../src/fixtures.js';
import {simulationCandidate} from '../src/runner.js';
import {digest} from '../src/canonical.js';
import {createSnapshot} from '../src/snapshot.js';
test('starting a new replay immediately clears previous verified status',async()=>{
 const previous=globalThis.document;let release,pending;
 try{const {ids,sendFile}=await mountApp('pending-status');const hash=await digest(BUILTIN_SUITE),snapshot=await createSnapshot(BUILTIN_SUITE,simulationCandidate(BUILTIN_SUITE,'guarded',hash));await sendFile('snapshot',async()=>JSON.stringify(snapshot));assert.match(ids['artifact-message'].textContent,/VERIFIED/);pending=sendFile('snapshot',()=>new Promise(resolve=>release=resolve));assert.doesNotMatch(ids['artifact-message'].textContent,/VERIFIED/);release('{}');await pending;assert.match(ids['artifact-message'].textContent,/rejected/);}finally{release?.('{}');await pending;globalThis.document=previous;}
});
test('older asynchronous export cannot overwrite a newer import error',async()=>{
 const previous=globalThis.document,cryptoDescriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto'),originalCrypto=globalThis.crypto;let held,gate=false,exporting;
 try{Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:{digest:(...args)=>gate?new Promise(resolve=>{held=async()=>{gate=false;resolve(await originalCrypto.subtle.digest(...args));};}):originalCrypto.subtle.digest(...args)}}});const {ids,sendFile}=await mountApp('export-race');gate=true;exporting=ids.export.events.click[0]();await sendFile('suite',async()=>'{}');const latest=ids['artifact-message'].textContent;assert.match(latest,/Import rejected/);await held();held=null;await exporting;assert.equal(ids['artifact-message'].textContent,latest);}finally{if(held)await held();await exporting;Object.defineProperty(globalThis,'crypto',cryptoDescriptor);globalThis.document=previous;}
});
