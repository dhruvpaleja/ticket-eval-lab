import {mkdir,writeFile} from 'node:fs/promises';
import {BUILTIN_SUITE} from '../src/fixtures.js';
import {digest} from '../src/canonical.js';
import {simulationCandidate} from '../src/runner.js';
import {createSnapshot} from '../src/snapshot.js';
const hash=await digest(BUILTIN_SUITE),candidate=simulationCandidate(BUILTIN_SUITE,'guarded',hash);
const mixed=structuredClone(candidate);mixed.candidateId='synthetic-mixed-output';mixed.outputs=mixed.outputs.filter(r=>r.caseId!=='TL-003');mixed.outputs.find(r=>r.caseId==='TL-001').decision={action:'grant_all_permissions'};mixed.outputs.find(r=>r.caseId==='TL-004').decision.action='triage_request';
await mkdir('examples',{recursive:true});
for(const [path,data]of [['suite.json',BUILTIN_SUITE],['valid-candidate.json',candidate],['mixed-candidate.json',mixed],['valid-snapshot.json',await createSnapshot(BUILTIN_SUITE,candidate,{type:'submitted'})]])await writeFile(`examples/${path}`,JSON.stringify(data,null,2)+'\n');
