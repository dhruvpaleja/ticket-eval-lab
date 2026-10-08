import { BUILTIN_SUITE } from './fixtures.js';
import { simulate, validateTicket } from './engine.js';
import { parseSuite, parseCandidate, MAX_BYTES } from './contracts.js';
import { canonical, digest } from './canonical.js';
import { runValidatedCandidate, simulationCandidate } from './runner.js';
import { createSnapshot, replaySnapshot, MAX_SNAPSHOT_BYTES } from './snapshot.js';
import { PROBES, evaluateProbe } from './probes.js';
const $=id=>document.getElementById(id);
function node(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
let suite=parseSuite(JSON.stringify(BUILTIN_SUITE)), suiteHash=await digest(suite), builtIn=true;
let selected=suite.cases[0], draft=structuredClone(selected), policy='baseline', imported=null;
let epoch=0, busy=false;
const modified=()=>canonical(draft)!==canonical(selected);
function getCandidate(){return policy==='imported'?imported:builtIn?simulationCandidate(suite,policy,suiteHash):null;}
function announce(message){$('announcement').textContent=message;}
function artifactMessage(message,error=false){$('artifact-message').textContent=message;$('artifact-message').className=error?'artifact-error':'artifact-notice';}
function download(value,filename){const blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob);const link=node('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderSummary(result){
 const metrics=[['LABELED CASES',builtIn?'Curated built-in suite':'Externally supplied labels',String(suite.cases.length).padStart(2,'0')],['OUTPUT COVERAGE',result?`${result.submittedOutputs} submitted · ${result.validOutputs} valid`:'Candidate output required',result?`${result.validOutputs}/${result.totalCases}`:'—'],['CASES PASSED','All five checks required',result?`${result.casesPassed}/${result.totalCases}`:'—'],['CHECKS PASSED','Missing/invalid outputs earn zero',result?`${result.checksPassed}/${result.checksPossible}`:'—']];
 $('suite-summary').replaceChildren(...metrics.map(([label,caption,value])=>{const el=node('div','metric');const text=node('div','metric-label',label);text.append(node('span','metric-caption',caption));el.append(text,node('span','metric-value',value));return el;}));
 $('active-suite').textContent=`${suite.name} · ${builtIn?'built-in':'imported'} · ${suite.cases.length} cases`;
 $('suite-digest').textContent=`SHA-256 ${suiteHash.slice(0,16)}…`;$('suite-digest').title=suiteHash;
}
function renderLibrary(rebuild=false){
 if(!rebuild&&$('case-list').childElementCount===suite.cases.length){for(const button of $('case-list').children){const active=button.dataset.case===selected.id;button.setAttribute('aria-pressed',String(active));button.querySelector('.case-marker').textContent=active?'↗':'·';}return;}
 $('case-count').textContent=String(suite.cases.length).padStart(2,'0');
 $('case-list').replaceChildren(...suite.cases.map(c=>{const button=node('button','case-card');button.type='button';button.dataset.case=c.id;button.setAttribute('aria-pressed',String(c.id===selected.id));const number=node('span','case-number');number.append(node('span','case-identifier',c.id),node('span','case-marker',c.id===selected.id?'↗':'·'));button.append(number,node('strong','',c.title),node('small','',c.tag||'Imported case'));button.addEventListener('click',()=>{selected=c;draft=structuredClone(c);renderLibrary();syncInputs();render();announce(`${c.id} selected.`);});return button;}));
}
function syncInputs(){
 $('request-text').value=draft.description;$('request-kind').value=draft.kind;$('affected-users').value=draft.affectedUsers;
 for(const key of ['privileged','approved','compromised','unavailable'])$(key).checked=draft[key];
 $('case-id').textContent=`${selected.id} / CASE DETAIL`;$('ticket-heading').textContent=selected.title;$('case-tag').textContent=selected.tag||'Imported synthetic case';
 $('evidence-list').replaceChildren(...selected.evidence.map(e=>{const card=node('div','evidence-card'),text=node('div');text.append(node('strong','',e.label),node('p','',e.value));card.append(node('code','',e.id),text);return card;}));
}
function readInputs(){draft.description=$('request-text').value;draft.kind=$('request-kind').value;draft.affectedUsers=$('affected-users').value===''?NaN:Number($('affected-users').value);for(const key of ['privileged','approved','compromised','unavailable'])draft[key]=$(key).checked;render();}
function renderChecks(checks){
 $('check-list').replaceChildren(...checks.map(c=>{const neutral=c.outcome==='not_evaluable';const row=node('div',`check-item ${neutral?'neutral':c.passed?'pass':'fail'}`),text=node('div','check-text');text.append(node('div','check-title',c.label));if(!c.passed)text.append(node('p','',`Expected: ${c.expected}`),node('p','',`Observed: ${c.observed}`));else if(c.id==='evidence')text.append(node('p','',c.observed));row.append(node('span','check-icon',neutral?'—':c.passed?'✓':'×'),text,node('span','check-label',neutral?'N/E':c.passed?'PASS':'FAIL'));return row;}));
}
function renderEvents(events){$('trace-list').replaceChildren(...events.map(event=>{const li=node('li');li.append(node('strong','',`${event.step}. ${event.type}`),node('pre','event-data',JSON.stringify(event,null,2)));return li;}));}
function render(){
 const candidate=getCandidate(),result=candidate?runValidatedCandidate(suite,candidate):null;renderSummary(result);
 for(const id of ['baseline','guarded','imported']){$(`policy-${id}`).setAttribute('aria-pressed',String(policy===id));$(`policy-${id}`).disabled=id==='imported'?!imported:!builtIn;}
 $('policy-imported').hidden=!imported&&!(!builtIn);
 $('policy-description').textContent=policy==='imported'?'Offline submitted decisions. Only evaluator events are available; no agent reasoning is inferred.':policy==='baseline'?'A deliberately flawed keyword policy, provided to expose evaluator failures.':'A deterministic structured-fact policy. Scoring uses separately stored fixture labels.';
 $('waiting-output').hidden=Boolean(result);$('result-panel').hidden=!result;
 $('input-error').hidden=true;$('expected-box').hidden=false;
 $('export').disabled=busy||!candidate;$('run').disabled=busy;
 try{
  validateTicket(draft);const edited=modified();
  $('modified-badge').textContent=edited?'UNSCORED EXPLORATION':'EXPLICIT LABELS';$('modified-badge').className=`tiny-badge${edited?' modified':''}`;
  $('expected-route').textContent=edited?'Independent labels required':selected.expected.route;$('expected-priority').textContent=edited?'—':selected.expected.priority;
  $('oracle-note').textContent=edited?'This draft is not scored or exported. The loaded suite and its totals stay unchanged. Reset to return to labeled evaluation.':`Declared label provenance: ${suite.labelProvenance}`;
  if(edited){
   $('export').disabled=true;$('checks-count').textContent='NOT SCORED';$('check-list').replaceChildren();
   if(builtIn&&policy!=='imported'){const d=simulate(draft,policy);$('result-panel').hidden=false;$('decision-route').textContent=d.route;$('decision-priority').textContent=d.priority;$('decision-action').textContent=`Exploratory proposal: ${d.action.replaceAll('_',' ')}`;$('decision-status').textContent='Unscored draft';$('decision-status').className='status neutral';renderEvents(d.events);}
   else{$('result-panel').hidden=true;$('waiting-output').hidden=false;$('waiting-output').textContent='Edited inputs cannot be evaluated against the original labels or submitted outputs. Reset this case.';}
   return;
  }
  $('waiting-output').textContent='Import a candidate file bound to this suite to evaluate its outputs.';
  if(!result){$('checks-count').textContent='AWAITING OUTPUT';return;}
  const row=result.rows.find(r=>r.caseId===selected.id),output=candidate.outputs.find(r=>r.caseId===selected.id)?.decision;
  const valid=row.status!=='invalid'&&row.status!=='missing';
  $('decision-route').textContent=valid?output.route:row.status==='missing'?'No output submitted':'Malformed output';$('decision-priority').textContent=valid?output.priority:'—';
  $('decision-action').textContent=valid?`Proposed: ${output.action.replaceAll('_',' ')}`:row.issues.join(' ');
  $('decision-status').textContent=row.passed?'✓ Case passed':valid?`${row.checks.filter(c=>!c.passed).length} checks failed`:`${row.status} · zero credit`;
  $('decision-status').className=`status ${row.passed?'pass':valid?'fail':'neutral'}`;
  $('checks-count').textContent=`${row.checks.filter(c=>c.passed).length}/5 PASSED`;renderChecks(row.checks);
  const events=policy==='imported'?row.events:[...simulate(selected,policy).events,...row.events.map(e=>({...e,step:e.step+simulate(selected,policy).events.length}))];renderEvents(events);
 }catch(error){$('input-error').textContent=error.message;$('input-error').hidden=false;$('result-panel').hidden=true;$('expected-box').hidden=true;$('export').disabled=true;$('run').disabled=true;$('checks-count').textContent='INVALID INPUT';}
}
function renderProbes(){
 $('probe-list').replaceChildren(...PROBES.map(probe=>{const card=node('article','probe-card');card.append(node('span','probe-id',probe.id),node('h3','',probe.name),node('p','probe-change',probe.change),node('p','probe-rule',probe.rule));for(const id of ['baseline','guarded']){const r=evaluateProbe(probe,id),row=node('div','probe-result');row.append(node('strong','',id==='baseline'?'Baseline':'Guarded'),node('span',r.passed?'probe-pass':'probe-fail',r.passed?'PASS':'FAIL'));const detail=node('div','probe-detail');detail.append(node('p','',`${r.before.decision.route} / ${r.before.decision.priority} / ${r.before.decision.action} → ${r.after.decision.route} / ${r.after.decision.priority} / ${r.after.decision.action}`),node('p','',`Absolute labels: ${r.absolutePassed}/2 · Relation: ${r.relationPassed?'pass':'fail'}`));card.append(row,detail);}const more=node('details');more.append(node('summary','','Inspect paired input and label differences'));const fields=['description','affectedUsers','approved','evidence','expected'];for(const key of fields)if(canonical(probe.before[key])!==canonical(probe.after[key]))more.append(node('strong','',key),node('pre','event-data',`BEFORE\n${JSON.stringify(probe.before[key],null,2)}\nAFTER\n${JSON.stringify(probe.after[key],null,2)}`));card.append(more);return card;}));
}
function installSuite(next,hash,isBuiltIn){suite=next;suiteHash=hash;builtIn=isBuiltIn;selected=suite.cases[0];draft=structuredClone(selected);imported=null;policy=builtIn?'baseline':'imported';renderLibrary(true);syncInputs();render();}
for(const id of ['request-text','request-kind','affected-users','privileged','approved','compromised','unavailable'])$(id).addEventListener('input',readInputs);
for(const id of ['baseline','guarded','imported'])$(`policy-${id}`).addEventListener('click',()=>{policy=id;render();announce(`${id} selected.`);});
$('reset').addEventListener('click',()=>{draft=structuredClone(selected);syncInputs();render();announce('Original labeled case restored.');});
$('run').addEventListener('click',()=>{readInputs();announce('Evaluation refreshed locally. No actions executed.');});
for(const [button,input] of [['import-suite','suite-file'],['import-candidate','candidate-file'],['replay','snapshot-file']])$(button).addEventListener('click',()=>$(input).click());
for(const kind of ['suite','candidate','snapshot'])$(`${kind}-file`).addEventListener('change',async event=>{
 const file=event.target.files[0];event.target.value='';if(!file)return;const myEpoch=++epoch;const activeHash=suiteHash;
 artifactMessage(`Reading and validating ${kind}… Previous verification status cleared.`);
 try{
  const limit=kind==='snapshot'?MAX_SNAPSHOT_BYTES:MAX_BYTES;if(file.size>limit)throw new Error(`File exceeds the ${kind==='snapshot'?'2 MiB':'256 KiB'} limit.`);
  const text=await file.text();
  if(kind==='suite'){const next=parseSuite(text),hash=await digest(next);if(myEpoch!==epoch)return;installSuite(next,hash,false);artifactMessage(`Imported ${next.cases.length} labeled synthetic cases. Import a candidate bound to this suite digest.`);}
  if(kind==='candidate'){const next=parseCandidate(text,suite,activeHash);if(myEpoch!==epoch||activeHash!==suiteHash)return;imported=next;policy='imported';render();artifactMessage(`Candidate ${next.candidateId} loaded. Missing and invalid decisions remain in the denominator.`);}
  if(kind==='snapshot'){const replay=await replaySnapshot(text);if(myEpoch!==epoch)return;artifactMessage(`Replay VERIFIED: ${replay.result.casesPassed}/${replay.result.totalCases} cases, ${replay.result.checksPassed}/${replay.result.checksPossible} checks reproduced. SHA-256 ${replay.checksum.slice(0,16)}… Checksum consistency, not authenticity. Active suite unchanged.`);}
 }catch(error){if(myEpoch===epoch)artifactMessage(`Import rejected: ${error.message} Active suite unchanged.`,true);}
});
$('restore').addEventListener('click',async()=>{const myEpoch=++epoch;artifactMessage('Restoring the built-in suite…');const next=parseSuite(JSON.stringify(BUILTIN_SUITE)),hash=await digest(next);if(myEpoch!==epoch)return;installSuite(next,hash,true);artifactMessage('Built-in cases restored. Labels and candidate outputs are separate.');});
$('download-suite').addEventListener('click',()=>download(suite,`${suite.suiteId}.json`));
$('download-template').addEventListener('click',()=>download({schemaVersion:2,kind:'ticketlens.candidate',candidateId:'my-offline-run',synthetic:true,suiteDigest:suiteHash,outputs:[{caseId:suite.cases[0].id,decision:{route:'Service desk',priority:'P3',approvalRequired:false,action:'triage_request',evidenceIds:[]}}]},`${suite.suiteId}-candidate-template.json`));
$('export').addEventListener('click',async()=>{
 const candidate=getCandidate();if(!candidate||modified()||busy)return;
 const myEpoch=++epoch, capturedSuite=structuredClone(suite);
 const source=policy==='imported'?{type:'submitted'}:{type:'simulation',policyId:policy};
 busy=true;artifactMessage('Preparing the evaluation snapshot…');render();
 try{
  const snapshot=await createSnapshot(capturedSuite,candidate,source);
  if(myEpoch!==epoch)return;
  download(snapshot,`ticketlens-${candidate.candidateId}-snapshot.json`);
  artifactMessage(`Snapshot exported for ${capturedSuite.suiteId} / ${candidate.candidateId}. Checksum ${snapshot.checksum.slice(0,16)}… Use Replay snapshot to recompute it.`);
 }catch(error){if(myEpoch===epoch)artifactMessage(`Export failed: ${error.message}`,true);}
 finally{busy=false;render();}
});
renderLibrary(true);syncInputs();render();renderProbes();artifactMessage('Built-in suite ready. Try the two simulations, or import independently supplied synthetic labels and offline outputs.');
