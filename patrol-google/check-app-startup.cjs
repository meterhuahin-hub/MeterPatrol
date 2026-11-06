const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{chromium}=require('playwright'),root=__dirname+'/';
const server=vm.createContext({HtmlService:{createTemplateFromFile:n=>({getRawContent:()=>fs.readFileSync(root+n+'.html','utf8')})}});vm.runInContext(fs.readFileSync(root+'Code.gs','utf8'),server);
const realDocument=server.appHtml_();
(async()=>{const browser=await chromium.launch({headless:true,executablePath:fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined});try{
 const context=await browser.newContext(),page=await context.newPage();let body='';await context.route('https://boot.test/',r=>r.fulfill({contentType:'text/html',body}));
 const doc=label=>`<!doctype html><title>${label}</title><body><div id="loginGate">${label}</div></body>`;
 const open=async(build,{html='v1',extra='',fail=false}={})=>{body=server.appBootstrapHtml_(build).replace('<script>',`<script>${extra}window.docCalls=0;window.google={script:{run:new Proxy({},{get:(t,k)=>{if(k==='withSuccessHandler')return f=>{t.ok=f;return google.script.run};if(k==='withFailureHandler')return f=>{t.bad=f;return google.script.run};return()=>{docCalls++;const ok=t.ok,bad=t.bad;setTimeout(()=>${fail}?bad({message:'NETWORK_DOWN'}):ok(${JSON.stringify(doc(html))}),50);}}})}};</script><script>`);await page.goto('https://boot.test/');};
 const shown=(text,timeout=5000)=>page.waitForFunction(t=>{const f=document.getElementById('bootFrame');return !f.hidden&&f.srcdoc.includes(t);},text,{timeout});
 const calls=()=>page.evaluate(()=>docCalls),settle=()=>page.waitForTimeout(250);
 await open('b1');await shown('v1');assert.equal(await calls(),1,'first open downloads the document');await settle();
 await open('b1',{html:'should-not-load'});await shown('v1');assert.equal(await calls(),0,'same build opens from the device');
 await open('b1',{html:'offline',fail:true});await shown('v1');assert.equal(await page.locator('#bootRetry').isVisible(),false,'a stored build opens without the network');
 await open('b2',{html:'v2'});await shown('v2');assert.equal(await calls(),1,'a new build downloads again');await settle();
 await open('b1',{html:'v1-again'});await shown('v1-again');assert.equal(await calls(),1,'the old build was removed');await settle();
 await open('',{html:'no-build'});await shown('no-build');assert.equal(await calls(),1,'no build id always uses the network');
 await open('b3',{html:'blocked',extra:'Object.defineProperty(window,"indexedDB",{get(){throw new Error("blocked");}});'});await shown('blocked');assert.equal(await calls(),1,'blocked storage uses the network');
 await open('b3',{html:'hung',extra:'Object.defineProperty(window,"indexedDB",{value:{open(){return {};}}});'});const started=Date.now();await shown('hung');assert.ok(Date.now()-started<4000,'hung storage falls back quickly');
 await open('b9',{html:'x',fail:true});await page.waitForFunction(()=>document.getElementById('bootStatus').textContent.includes('NETWORK_DOWN'));assert.equal(await page.locator('#bootRetry').isVisible(),true,'a failed download still offers retry');
 await context.close();
 // Whole app: a session reload shows the app before offices or login info answer.
 const app=await browser.newContext({viewport:{width:390,height:844}}),p=await app.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await app.route('https://app.test/',r=>r.fulfill({contentType:'text/html',body:realDocument}));await app.route(/tile\.openstreetmap/,r=>r.abort());
 await p.addInitScript(()=>{const user={di:'a1',name:'Test',position:'Admin',role:'admin',workTypes:['wbs','patrol']};window.log=[];sessionStorage.setItem('patrol-di-session','t');window.google={script:{run:new Proxy({},{get:(t,k)=>{if(k==='withSuccessHandler')return f=>{t.ok=f;return google.script.run};if(k==='withFailureHandler')return f=>{t.bad=f;return google.script.run};return()=>{const ok=t.ok;log.push(k);if(k==='listElectricityOffices'||k==='getLoginInfo'){window.hold=window.hold||[];hold.push(()=>ok(k==='getLoginInfo'?{email:'a@e.com',canBootstrap:false}:['กฟส.หัวหิน']));return;}queueMicrotask(()=>ok(k==='getAccountSession'?user:[]));}}})}};});
 await p.goto('https://app.test/');await p.waitForFunction(()=>!document.getElementById('appShell').hidden,null,{timeout:8000});
 const log=await p.evaluate(()=>log);assert.ok(log.includes('listPatrol'),'the job list starts without waiting for offices');assert.ok(log.includes('getAccountSession'));
 await p.evaluate(()=>hold.forEach(f=>f()));await p.waitForFunction(()=>[...document.getElementById('electricityOffice').options].some(o=>o.value==='กฟส.หัวหิน'),null,{timeout:3000});
 await p.evaluate(()=>signOut());await p.waitForFunction(()=>!document.getElementById('loginGate').hidden,null,{timeout:3000});assert.ok((await p.textContent('#googleIdentity')).includes('a@e.com'),'the login page still shows the Google account');
 assert.deepEqual(errors,[]);await app.close();
 console.log('PASS app document opens from the device for the same build, new builds download, storage failures fall back, session reload does not wait for offices or login info');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
