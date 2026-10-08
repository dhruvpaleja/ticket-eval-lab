const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
 const baseUrl=process.env.BASE_URL||'http://127.0.0.1:4173';
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function downloadSnapshot(){const [file]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export snapshot'}).click()]);return JSON.parse(await fs.readFile(await file.path(),'utf8'));}
 async function importJson(selector,data,name='sample.json'){await page.locator(selector).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});}
 try{
  await page.goto(baseUrl);await page.locator('#active-suite').filter({hasText:'8 cases'}).waitFor();
  assert.equal(await page.locator('[data-case]').count(),8);
  assert.equal(await page.locator('.probe-card').count(),3);
  await page.getByRole('button',{name:'Guarded',exact:true}).click();
  assert.equal(await page.locator('#decision-route').innerText(),'Approval review');
  await page.getByLabel('Approval recorded').check();
  assert.match(await page.locator('#modified-badge').innerText(),/UNSCORED/);
  assert.equal(await page.getByRole('button',{name:'Export snapshot'}).isDisabled(),true);
  assert.equal(await page.locator('#check-list').innerText(),'');
  await page.getByRole('button',{name:'Reset case'}).click();
  await page.locator('[data-case="TL-003"]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.case),'TL-003');
  assert.equal(await page.locator('#decision-route').innerText(),'Security');
  const snap=await downloadSnapshot();assert.equal(snap.payload.result.casesPassed,8);
  await importJson('#snapshot-file',snap);await page.locator('#artifact-message').filter({hasText:'Replay VERIFIED'}).waitFor();
  const bad=structuredClone(snap);bad.payload.result.casesPassed=999;
  await importJson('#snapshot-file',bad);await page.locator('#artifact-message').filter({hasText:'checksum mismatch'}).waitFor();
  const originalTitle=await page.locator('#active-suite').innerText();
  await importJson('#suite-file',{invalid:true});await page.locator('#artifact-message').filter({hasText:'Import rejected'}).waitFor();
  assert.equal(await page.locator('#active-suite').innerText(),originalTitle);
  const suite=JSON.parse(await fs.readFile('examples/suite.json','utf8'));
  const mixed=JSON.parse(await fs.readFile('examples/mixed-candidate.json','utf8'));
  await importJson('#suite-file',suite);await page.locator('#active-suite').filter({hasText:'imported'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Guarded',exact:true}).isDisabled(),true);
  await importJson('#candidate-file',mixed);await page.locator('#artifact-message').filter({hasText:'Candidate synthetic-mixed-output loaded'}).waitFor();
  assert.match(await page.locator('#decision-route').innerText(),/Malformed output/);
  await page.locator('[data-case="TL-003"]').click();assert.equal(await page.locator('#decision-route').innerText(),'No output submitted');
  const importedSnap=await downloadSnapshot();assert.equal(importedSnap.payload.ruleEvents.length,0);assert.equal(importedSnap.payload.result.totalCases,8);
  const stale=structuredClone(mixed);stale.suiteDigest='0'.repeat(64);
  await importJson('#candidate-file',stale);await page.locator('#artifact-message').filter({hasText:'digest does not match'}).waitFor();
  assert.equal(await page.locator('#decision-route').innerText(),'No output submitted');
  await page.getByRole('button',{name:'Restore built-ins'}).click();await page.locator('#active-suite').filter({hasText:'built-in'}).waitFor();
  await page.getByLabel('Request text').fill('<img src=x onerror="alert(1)"> URGENT admin access');
  assert.equal(await page.locator('#ticket-panel img').count(),0);
  await page.getByLabel('Affected users').fill('0');assert.equal(await page.locator('#result-panel').isHidden(),true);
  await page.getByRole('button',{name:'Reset case'}).click();
  await fs.mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/v2-desktop.png',fullPage:true});
  await page.setViewportSize({width:400,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:'artifacts/v2-mobile-400.png',fullPage:true});
  const longSuite=structuredClone(suite);longSuite.cases[0].id='X'.repeat(64);longSuite.cases[0].title='W'.repeat(180);longSuite.cases[0].tag='T'.repeat(100);longSuite.cases[0].evidence[0].label='L'.repeat(100);longSuite.cases[0].evidence[0].value='V'.repeat(1000);
  await importJson('#suite-file',longSuite);await page.locator('#active-suite').filter({hasText:'imported'}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  for(const selector of ['#case-id','#modified-badge','.case-identifier','#ticket-heading','#case-tag','.evidence-card strong','.evidence-card p']){
    const boxes=await page.locator(selector).evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {left:r.left,right:r.right};}));
    assert.ok(boxes.every(box=>box.left>=0&&box.right<=400),`${selector} must fit in the 400px viewport, even when overflow clipping hides it`);
  }
  await page.screenshot({path:'artifacts/v2-mobile-long-input.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS v2 browser: imports, atomic rejection, unscored drafts, focused case navigation, missing/invalid outputs, snapshot replay/tampering, safe text, reset and 400px layout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
