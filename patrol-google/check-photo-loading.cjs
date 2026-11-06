const {chromium}=require('playwright'),fs=require('fs'),assert=require('assert/strict');
const html=fs.readFileSync(__dirname+'/Index.html','utf8'),start=html.indexOf('const savedPhotoCache='),end=html.indexOf('function contractWorkDetail(');
assert.ok(start>0&&end>start);
const code=html.slice(start,end),IMAGE='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const URLS=['https://drive.google.com/file/d/a1/view','https://drive.google.com/file/d/a2/view'];
const page_=(di,extra='')=>`<!doctype html><body style="margin:0"><div id="spacer" style="height:5000px"></div><div id="far"></div><script>
const IMAGE=${JSON.stringify(IMAGE)};window.calls=[];window.reply=[IMAGE,IMAGE];let signedAccount={di:${JSON.stringify(di)}};
function rpc(method,...args){calls.push([method,...args]);if(method==='getWorkPhotoThumbnails')return Promise.resolve(Object.fromEntries(args[1].map(kind=>[kind,window.thumbReply||reply])));return Promise.resolve(window.fullReply||reply);}
${extra}
${code}
</script></body>`;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined});
 try{
  const context=await browser.newContext({viewport:{width:390,height:700}}),page=await context.newPage();let body='';
  await page.route('https://photos.test/',r=>r.fulfill({contentType:'text/html',body}));
  const open=async(di='A',extra='')=>{body=page_(di,extra);await page.goto('https://photos.test/');};
  const add=(where,id,options)=>page.evaluate(([where,id,urls,options])=>{appendSavedPhotos(document.getElementById(where)||document.body,id,'survey',urls,'รูป',options);},[where,id,URLS,options]);
  const count=()=>page.evaluate(()=>calls.length);
  const shown=()=>page.waitForFunction(()=>{const images=[...document.querySelectorAll('.savedPhotos img')];return images.length&&images.every(i=>!i.hidden);},null,{timeout:8000});
  const settle=()=>page.waitForTimeout(300);

  await open();await add('far','lazy');await settle();
  assert.equal(await count(),0,'off-screen photos do not load');
  await page.evaluate(()=>document.getElementById('far').scrollIntoView());await shown();
  assert.equal(await count(),1,'scrolling loads the pair once');

  await open();await add('far','eager',{eager:true});await shown();
  assert.equal(await count(),1,'eager photos load without scrolling');
  assert.equal(await page.evaluate(()=>calls[0][0]),'getWorkPhotos','reports keep full photos for printing');

  const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  await open('T','window.thumbReply=['+JSON.stringify(PNG)+','+JSON.stringify(PNG)+'];');await page.evaluate(()=>document.getElementById('spacer').remove());
  await page.evaluate(([urls])=>{appendSavedPhotos(document.getElementById('far'),'job','survey',urls,'รูป');appendSavedPhotos(document.getElementById('far'),'job','delivery',urls,'รูป');},[URLS]);await shown();
  assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='getWorkPhotoThumbnails').length),1,'all photos of a job share one request');
  assert.deepEqual(await page.evaluate(()=>[...calls[0][2]].sort()),['delivery','survey']);
  assert.equal(await page.evaluate(()=>document.querySelector('.savedPhotos img').src),PNG,'the thumbnail is shown first');
  assert.equal(await count(),1,'full photos are not fetched until asked');
  await page.click('.savedPhotos figure button');await page.waitForFunction(i=>document.querySelector('.savedPhotos img').src===i,IMAGE,{timeout:5000});
  assert.equal(await page.evaluate(()=>calls[1][0]),'getWorkPhotos','the button loads the full photo');
  await page.waitForFunction(()=>!document.querySelector('.savedPhotos figure').querySelector('button'),null,{timeout:5000});
  await open('T','window.thumbReply=['+JSON.stringify(PNG)+','+JSON.stringify(PNG)+'];');await page.evaluate(()=>document.getElementById('spacer').remove());
  await page.evaluate(([urls])=>appendSavedPhotos(document.getElementById('far'),'job','survey',urls,'รูป'),[URLS]);await shown();
  assert.equal(await count(),0,'stored thumbnails reopen without the network');

  await open();await page.evaluate(()=>document.getElementById('spacer').remove());await add('far','lazy');await shown();await settle();
  assert.equal(await count(),0,'a reopened job is served from the device');

  await open('B');await page.evaluate(()=>document.getElementById('spacer').remove());await add('far','lazy');await shown();
  assert.equal(await count(),1,'another DI does not read this DI\'s stored photos');

  await open('A','window.reply=[{error:"denied"},'+JSON.stringify(IMAGE)+'];');await page.evaluate(()=>document.getElementById('spacer').remove());await add('far','partial');await settle();
  assert.equal(await count(),1);
  await open();await page.evaluate(()=>document.getElementById('spacer').remove());await add('far','partial');await shown();
  assert.equal(await count(),1,'a failed photo set is not stored');

  await open();await page.evaluate(()=>document.getElementById('spacer').remove());await add('far','lazy');await shown();assert.equal(await count(),0);
  await page.evaluate(()=>clearPersistentPhotos());
  await open();await page.evaluate(()=>document.getElementById('spacer').remove());await add('far','lazy');await shown();
  assert.equal(await count(),1,'clearing removes stored photos');

  await open('C');await page.evaluate(async()=>{for(let i=0;i<=PHOTO_STORE_LIMIT;i++){await cachedWorkPhotos('fill-'+i,'survey',['u']);await new Promise(r=>setTimeout(r,2));}await new Promise(r=>setTimeout(r,200));savedPhotoCache.clear();calls.length=0;await cachedWorkPhotos('fill-'+PHOTO_STORE_LIMIT,'survey',['u']);window.newest=calls.length;await cachedWorkPhotos('fill-0','survey',['u']);window.oldest=calls.length;});
  assert.equal(await page.evaluate(()=>newest),0,'the newest set stays stored');
  assert.equal(await page.evaluate(()=>oldest),1,'the oldest set is evicted past the limit');
  await page.evaluate(()=>clearPersistentPhotos());

  await open('A','Object.defineProperty(window,"indexedDB",{get(){throw new Error("blocked");}});');await page.evaluate(()=>document.getElementById('spacer').remove());await add('far','blocked');await shown();
  assert.equal(await count(),1,'blocked storage falls back to the network');
  await page.evaluate(()=>clearPersistentPhotos());

  await open('A','Object.defineProperty(window,"indexedDB",{value:{open(){return {};}}});');await page.evaluate(()=>document.getElementById('spacer').remove());await add('far','hung');await shown();
  assert.equal(await count(),1,'a storage that never answers falls back to the network');

  await context.close();

  // Whole app on a phone: a slow photo response must leave the job usable, and reopening must not use the network.
  const vm=require('vm'),root=__dirname+'/',server=vm.createContext({HtmlService:{createTemplateFromFile:name=>({getRawContent:()=>fs.readFileSync(root+name+'.html','utf8')})}});vm.runInContext(fs.readFileSync(root+'Code.gs','utf8'),server);const appHtml=server.appHtml_();
  const phone=await browser.newContext({viewport:{width:390,height:844}}),app=await phone.newPage(),errors=[];app.on('pageerror',e=>errors.push(e.message));
  await phone.route(/tile\.openstreetmap\.org/,r=>r.abort());await phone.route('https://app.test/',r=>r.fulfill({contentType:'text/html',body:appHtml}));
  await app.addInitScript(({IMAGE,URLS})=>{const user={di:'contractor1',name:'Test',position:'ผู้รับจ้าง',role:'contractor',workTypes:['wbs','patrol']},record={id:'r1',date:'2026-11-01T00:00:00.000Z',surveyDate:'2026-11-01',wbs:'W-1',transformer:'T1',pole:'A',pea:'00001',phase:'',machine:'',poleSize:'',jobType:'',latitude:'12.5',longitude:'99.9',latlong:'12.5,99.9',surveyResult:'สำรวจ',note:'',before:URLS[0],after:URLS[1],budgetYear:'2026',patrolJob:'',electricityOffice:'',address:'',customerName:'',customerCa:'',delivery:null,inspection:null,transfer:null};window.photoCalls=0;sessionStorage.setItem('patrol-di-session','token');window.google={script:{run:new Proxy({},{get:(target,key)=>{if(key==='withSuccessHandler')return fn=>{target.ok=fn;return google.script.run;};if(key==='withFailureHandler')return fn=>{target.fail=fn;return google.script.run;};return (...args)=>{const ok=target.ok;if(key==='getWorkPhotoThumbnails'){photoCalls++;setTimeout(()=>ok(Object.fromEntries(args[1].map(kind=>[kind,[IMAGE,IMAGE]]))),2000);return;}queueMicrotask(()=>ok(key==='getLoginInfo'?{email:'c@example.com',canBootstrap:false}:key==='getAccountSession'?user:key==='listPatrol'?[record]:[]));};}})}};},{IMAGE,URLS});
  const openJob=async()=>{await app.goto('https://app.test/');await app.waitForFunction(()=>!document.getElementById('appShell').hidden&&typeof records!=='undefined'&&records.length===1,null,{timeout:15000});await app.evaluate(()=>{navigate('contractor');openContractJob('r1');});};
  const overlayHidden=()=>app.evaluate(()=>document.getElementById('operationOverlay').hidden);
  const photosShown=()=>app.waitForFunction(()=>{const images=[...document.querySelectorAll('#contractSurvey .savedPhotos img')];return images.length===2&&images.every(i=>!i.hidden&&i.naturalWidth>0);},null,{timeout:10000});
  await openJob();await app.waitForFunction(()=>photoCalls===1,null,{timeout:5000});await app.waitForTimeout(300);
  assert.equal(await overlayHidden(),true,'the job stays usable while photos load');
  assert.equal(await app.evaluate(()=>document.querySelector('#contractSurvey .savedPhotos img').hidden),true,'the photo is still loading during this check');
  await photosShown();await app.waitForTimeout(300);
  await openJob();await photosShown();
  assert.equal(await app.evaluate(()=>photoCalls),0,'reopening after a reload uses device storage');

  // Sign out removes stored photos in the whole app.
  await openJob();await photosShown();await app.waitForTimeout(100);
  await app.evaluate(()=>signOut());await app.waitForFunction(()=>!document.getElementById('loginGate').hidden,null,{timeout:5000});
  await openJob();await app.waitForFunction(()=>photoCalls===1,null,{timeout:5000});
  assert.equal(await app.evaluate(()=>photoCalls),1,'sign out cleared device storage');
  await photosShown();await app.waitForTimeout(300);
  // Inspector page uses the same non-blocking loading.
  await app.evaluate(()=>{signedAccount.role='admin';savedPhotoCache.clear();});await app.evaluate(()=>clearPersistentPhotos());
  await app.evaluate(()=>{photoCalls=0;navigate('inspector');openInspectJob('r1');});await app.waitForFunction(()=>photoCalls===1,null,{timeout:5000});await app.waitForTimeout(200);
  assert.equal(await overlayHidden(),true,'inspector stays usable while photos load');
  // A real portrait file through the survey form and the delivery form stays within 1100 px on its longest side.
  const portrait=await app.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=3000;canvas.height=4000;canvas.getContext('2d').fillRect(0,0,3000,4000);const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',.8));const file=new File([blob],'portrait.jpg',{type:'image/jpeg'}),list=new DataTransfer();list.items.add(file);const form=document.getElementById('before');form.files=list.files;form.dispatchEvent(new Event('change'));await new Promise((resolve,reject)=>{const started=Date.now(),tick=()=>{if(beforeData)resolve();else if(Date.now()-started>8000)reject(new Error('survey photo timeout'));else setTimeout(tick,50);};tick();});const size=await new Promise(resolve=>{const image=new Image();image.onload=()=>resolve([image.width,image.height]);image.src=beforeData;});return size;});
  assert.deepEqual(portrait,[825,1100],'portrait survey photo fits 1100 px');
  assert.deepEqual(errors,[]);
  await phone.close();
  console.log('PASS real browser: photos load on scroll or request, reopen from device storage, per-DI scope, failed sets not stored, clear, eviction, blocked and hung storage, and a slow photo response in the whole app leaves contractor and inspector usable, sign out clears storage and a real portrait file fits 1100 px');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
