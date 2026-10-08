import {parseSuite,parseCandidate,parseLimited,exactKeys} from './contracts.js';
import {digest,canonical} from './canonical.js';
import {runValidatedCandidate,simulationCandidate,RUBRIC_VERSION,SIMULATOR_VERSION} from './runner.js';
import {simulate} from './engine.js';
import {BUILTIN_SUITE} from './fixtures.js';
export const MAX_SNAPSHOT_BYTES=2*1024*1024;
export async function createSnapshot(suite,candidate,source={type:'submitted'}) {
 canonical(suite);canonical(candidate);
 const validSuite=parseSuite(JSON.stringify(suite));const suiteDigest=await digest(validSuite);
 const validCandidate=parseCandidate(JSON.stringify(candidate),validSuite,suiteDigest);
 if(!source||!['submitted','simulation'].includes(source.type))throw new TypeError('Unknown source type.');
 const ruleEvents=[];
 if(source.type==='simulation'){
  exactKeys(source,['type','policyId']);
  if(!['baseline','guarded'].includes(source.policyId))throw new TypeError('Unknown simulation version or policy.');
  if(suiteDigest!==await digest(BUILTIN_SUITE))throw new TypeError('Simulations are restricted to the curated built-in suite.');
  const expected=simulationCandidate(validSuite,source.policyId,suiteDigest);
  if(canonical(validCandidate)!==canonical(expected))throw new TypeError('Candidate does not match the deterministic simulation.');
  for(const t of validSuite.cases)ruleEvents.push({caseId:t.id,events:simulate(t,source.policyId).events});
 }else exactKeys(source,['type']);
 const payload={schemaVersion:2,rubricVersion:RUBRIC_VERSION,simulatorVersion:source.type==='simulation'?SIMULATOR_VERSION:null,source:structuredClone(source),suite:validSuite,candidate:validCandidate,result:runValidatedCandidate(validSuite,validCandidate),ruleEvents};
 return {schemaVersion:2,kind:'ticketlens.snapshot',payload,checksum:await digest(payload)};
}
export async function replaySnapshot(text) {
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_SNAPSHOT_BYTES)throw new TypeError('Snapshot exceeds the 2 MiB limit.');
 const snapshot=parseLimited(text,MAX_SNAPSHOT_BYTES,{maxDepth:20,maxNodes:100000});exactKeys(snapshot,['schemaVersion','kind','payload','checksum']);
 if(snapshot.schemaVersion!==2||snapshot.kind!=='ticketlens.snapshot')throw new TypeError('Unsupported snapshot version.');
 const p=snapshot.payload;exactKeys(p,['schemaVersion','rubricVersion','simulatorVersion','source','suite','candidate','result','ruleEvents']);
 if(p.schemaVersion!==2||p.rubricVersion!==RUBRIC_VERSION||(p.simulatorVersion!==null&&p.simulatorVersion!==SIMULATOR_VERSION))throw new TypeError('Unsupported rubric or simulator version.');
 if(snapshot.checksum!==await digest(p))throw new TypeError('Snapshot checksum mismatch. The contents have changed.');
 const fresh=await createSnapshot(p.suite,p.candidate,p.source);
 if(canonical(fresh)!==canonical(snapshot))throw new TypeError('Replay mismatch: recomputed checks, events or metadata differ from the snapshot.');
 return {verified:true,checksum:fresh.checksum,result:fresh.payload.result,snapshot:fresh};
}
