import { ACTIONS, ROUTES, validateTicket } from './engine.js';
export const MAX_BYTES=262144;
const fail=message=>{throw new TypeError(message);};
export function exactKeys(value, allowed, required=allowed, name='object') {
  if(!value || Array.isArray(value) || typeof value!=='object' || Object.getPrototypeOf(value)!==Object.prototype)fail(`${name} must be an object.`);
  for(const key of Object.keys(value))if(!allowed.includes(key))fail(`${name}: unknown field ${key.slice(0,80)}.`);
  for(const key of required)if(!Object.hasOwn(value,key))fail(`${name}: missing ${key}.`);
}
const string=(value,max,name)=>{if(typeof value!=='string'||!value.trim()||value.length>max)fail(`${name} must be nonempty text, at most ${max} characters.`);};
const id=(value,name)=>{if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(value))fail(`${name} must use 1–64 letters, numbers, underscores or hyphens.`);};
const unique=(arr,name)=>{if(new Set(arr).size!==arr.length)fail(`${name} contains duplicate values.`);};
export function parseLimited(text,maxBytes=MAX_BYTES,{maxDepth=16,maxNodes=30000}={}) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>maxBytes)fail('Import exceeds the 256 KiB limit.');
  let value;try{value=JSON.parse(text);}catch{fail('The file is not valid JSON.');}
  const pending=[[value,0]];let count=0;
  while(pending.length){const [item,depth]=pending.pop();if(typeof item==='number'&&!Number.isFinite(item))fail('JSON numbers must be finite.');if(depth>maxDepth||++count>maxNodes)fail('JSON structure exceeds safety limits.');if(item&&typeof item==='object'){if(Object.keys(item).length>1000)fail('JSON object exceeds safety limits.');for(const v of Object.values(item))pending.push([v,depth+1]);}}
  return value;
}
export function parseSuite(text) {
  const s=parseLimited(text);
  exactKeys(s,['schemaVersion','kind','suiteId','name','synthetic','labelProvenance','cases']);
  if(s.schemaVersion!==2||s.kind!=='ticketlens.suite'||s.synthetic!==true)fail('Expected a synthetic ticketlens.suite schema version 2.');
  id(s.suiteId,'suiteId');string(s.name,120,'Suite name');string(s.labelProvenance,300,'Label provenance');
  if(!Array.isArray(s.cases)||s.cases.length<1||s.cases.length>100)fail('A suite needs 1–100 cases.');
  const fields=['id','title','description','kind','affectedUsers','privileged','approved','compromised','unavailable','evidence','expected','tag'];
  for(const t of s.cases){
    exactKeys(t,fields,fields.filter(k=>k!=='tag'),'Case');id(t.id,'Case ID');validateTicket(t);if(t.tag!==undefined)string(t.tag,100,'Case tag');
    if(t.evidence.length>20)fail('At most 20 evidence records per case.');
    for(const e of t.evidence){exactKeys(e,['id','label','value']);string(e.id,100,'Evidence ID');string(e.label,100,'Evidence label');string(e.value,1000,'Evidence value');}
    const ex=t.expected;exactKeys(ex,['route','priority','approvalRequired','requiredEvidence','allowedActions']);
    if(!ROUTES.includes(ex.route)||!['P1','P2','P3'].includes(ex.priority)||typeof ex.approvalRequired!=='boolean')fail(`Invalid expected decision for ${t.id}.`);
    if(!Array.isArray(ex.requiredEvidence)||ex.requiredEvidence.length<1||ex.requiredEvidence.length>20)fail('Expected evidence needs 1–20 IDs.');
    unique(ex.requiredEvidence,'Expected evidence');for(const ref of ex.requiredEvidence){string(ref,100,'Expected evidence ID');if(!t.evidence.some(e=>e.id===ref))fail(`Unknown expected evidence ${ref}.`);}
    if(!Array.isArray(ex.allowedActions)||ex.allowedActions.length<1||ex.allowedActions.length>6||ex.allowedActions.some(a=>!ACTIONS.includes(a)))fail('Expected allowedActions must contain known actions.');unique(ex.allowedActions,'Allowed actions');
  }
  unique(s.cases.map(t=>t.id),'Case IDs');return s;
}
export function validateDecision(d) {
  try{
    exactKeys(d,['route','priority','approvalRequired','action','evidenceIds']);
    if(!ROUTES.includes(d.route))fail('Unknown route.');if(!['P1','P2','P3'].includes(d.priority))fail('Unknown priority.');
    if(typeof d.approvalRequired!=='boolean')fail('Approval gate must be boolean.');if(!ACTIONS.includes(d.action))fail('Unknown action.');
    if(!Array.isArray(d.evidenceIds)||d.evidenceIds.length>20)fail('Evidence citations must be an array of at most 20 IDs.');for(const ref of d.evidenceIds)string(ref,100,'Evidence citation');
    return [];
  }catch(error){return [error.message];}
}
export function parseCandidate(text,suite,expectedDigest) {
  const c=parseLimited(text);exactKeys(c,['schemaVersion','kind','candidateId','synthetic','suiteDigest','outputs']);
  if(c.schemaVersion!==2||c.kind!=='ticketlens.candidate'||c.synthetic!==true)fail('Expected a synthetic ticketlens.candidate schema version 2.');
  id(c.candidateId,'candidateId');if(c.suiteDigest!==expectedDigest||!/^[a-f0-9]{64}$/.test(c.suiteDigest))fail('Candidate suite digest does not match the active suite.');
  if(!Array.isArray(c.outputs)||c.outputs.length>100)fail('Candidate outputs must contain at most 100 rows.');
  const known=new Set(suite.cases.map(t=>t.id));
  for(const row of c.outputs){exactKeys(row,['caseId','decision'],['caseId'],'Output row');id(row.caseId,'Output case ID');if(!known.has(row.caseId))fail(`Unknown case ID ${row.caseId}.`);}
  unique(c.outputs.map(row=>row.caseId),'Output case IDs');return c;
}
