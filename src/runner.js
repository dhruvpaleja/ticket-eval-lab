import {simulate,score} from './engine.js';
import {validateDecision,parseSuite,parseCandidate} from './contracts.js';
import {digest,canonical} from './canonical.js';
import {BUILTIN_SUITE} from './fixtures.js';
const BUILTIN_DIGEST=await digest(BUILTIN_SUITE);
export const RUBRIC_VERSION='ticketlens-rubric/2.0';
export const SIMULATOR_VERSION='ticketlens-simulators/2.0';
export const CHECKS=[['routing','Correct route'],['priority','Impact-based priority'],['approval','Approval gate'],['evidence','Evidence coverage'],['unsafe_action','Correct permitted action']];
export const decisionFields=d=>({route:d.route,priority:d.priority,approvalRequired:d.approvalRequired,action:d.action,evidenceIds:[...d.evidenceIds]});
export function simulationCandidate(suite,policyId,suiteDigest) {
  if(canonical(suite)!==canonical(BUILTIN_SUITE))throw new TypeError('Batch simulations are restricted to the curated built-in suite.');
  if(suiteDigest!==BUILTIN_DIGEST)throw new TypeError('Built-in suite digest mismatch.');
  return {schemaVersion:2,kind:'ticketlens.candidate',candidateId:policyId,synthetic:true,suiteDigest,outputs:suite.cases.map(t=>({caseId:t.id,decision:decisionFields(simulate(t,policyId))}))};
}
/** Trusted state helper: callers bind the current suite digest before this synchronous step.
 * Use evaluateArtifacts for raw/untrusted inputs. Structural contracts are still enforced. */
export function runValidatedCandidate(suite,candidate) {
  suite=parseSuite(JSON.stringify(suite));
  candidate=parseCandidate(JSON.stringify(candidate),suite,candidate.suiteDigest);
  const submitted=new Map(candidate.outputs.map(row=>[row.caseId,row]));
  const rows=suite.cases.map(t=>{
    const row=submitted.get(t.id);const issues=row?validateDecision(row.decision):['No output submitted.'];
    if(issues.length){const status=row?'invalid':'missing';return {caseId:t.id,status,passed:false,issues,checks:CHECKS.map(([id,label])=>({id,label,passed:false,outcome:'not_evaluable',expected:'Valid candidate output',observed:status})),events:[{step:1,type:'output.validation',outcome:status,detail:issues.join(' ')}]};}
    const result=score(t,{...row.decision,trace:[]},t.expected);
    const checks=result.checks.map(c=>({...c,outcome:c.passed?'pass':'fail'}));
    return {caseId:t.id,status:result.passed?'passed':'failed',passed:result.passed,issues:[],checks,events:checks.map((c,i)=>({step:i+1,type:'rubric.check',checkId:c.id,outcome:c.outcome,expected:c.expected,observed:c.observed}))};
  });
  return {rubricVersion:RUBRIC_VERSION,candidateId:candidate.candidateId,totalCases:rows.length,submittedOutputs:submitted.size,validOutputs:rows.filter(r=>r.status!=='invalid'&&r.status!=='missing').length,casesPassed:rows.filter(r=>r.passed).length,checksPassed:rows.reduce((n,r)=>n+r.checks.filter(c=>c.passed).length,0),checksPossible:rows.length*5,rows};
}
export async function evaluateArtifacts(suiteText,candidateText){
  const suite=parseSuite(suiteText);
  const suiteDigest=await digest(suite);
  const candidate=parseCandidate(candidateText,suite,suiteDigest);
  return {suiteDigest,result:runValidatedCandidate(suite,candidate)};
}
