const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),html=fs.readFileSync(__dirname+'/Index.html','utf8');
const elements={operationOverlay:{hidden:true},appShell:{setAttribute(k,v){this[k]=v;}},operationDetail:{}},calls=[];
const c=vm.createContext({loginToken:'test-token',document:{getElementById:id=>elements[id]},setTimeout,clearTimeout,showLogin:()=>{}});
c.google={script:{get run(){let ok;const runner={withSuccessHandler(fn){ok=fn;return this;},withFailureHandler(){return this;},getWorkPhotos(...args){calls.push({method:'getWorkPhotos',args,ok});},listPatrol(...args){calls.push({method:'listPatrol',args,ok});}};return runner;}}};
vm.runInContext(html.slice(html.indexOf('let pendingOperations='),html.indexOf('function syncPatrolJob(')),c);
(async()=>{
 // Photo requests must leave the screen usable on a slow connection.
 const photos=c.rpc('getWorkPhotos','record-1','survey');
 assert.equal(elements.operationOverlay.hidden,true,'photo loading must not cover the screen');
 assert.deepEqual([...calls[0].args],['record-1','survey','test-token'],'photo requests still carry the session token');
 calls[0].ok(['photo']);await photos;
 await new Promise(r=>setTimeout(r,160));
 assert.equal(elements.operationOverlay.hidden,true);
 // Other requests keep the blocking overlay and it still closes.
 const list=c.rpc('listPatrol');
 assert.equal(elements.operationOverlay.hidden,false,'data requests keep the overlay');
 calls[1].ok([]);await list;
 await new Promise(r=>setTimeout(r,160));
 assert.equal(elements.operationOverlay.hidden,true);
 // The longest side is limited on every photo page, so portrait phone photos are not oversized.
 const source=/function fitPhotoScale\([^)]*\)\{[^\n]*\}/.exec(html);
 assert.ok(source,'fitPhotoScale helper exists');
 const r=vm.createContext({});vm.runInContext(source[0],r);
 assert.equal(r.fitPhotoScale(3000,4000),1100/4000,'portrait is limited by height');
 assert.equal(r.fitPhotoScale(4000,3000),1100/4000,'landscape is limited by width');
 assert.equal(r.fitPhotoScale(800,600),1,'small photos are never enlarged');
 assert.ok(!html.includes('max/im.width'),'survey form no longer limits width only');
 assert.equal((html.match(/fitPhotoScale\(/g)||[]).length,4,'survey, delivery and inspection all use the helper');
 // Reports load on request and may be printed, so they must not wait for scrolling.
 assert.ok(html.includes('appendSavedPhotos(container,record.id,kind,urls,reportWorkPhotoLabel(kind),{eager:true})'),'report photos load immediately after the button');
 assert.ok(/async function signOut\(\)\{try\{await rpc\('logoutAccount'\);await clearPersistentPhotos\(\);/.test(html),'sign out clears photos stored on the device');
 console.log('PASS photo requests leave the screen usable, data requests keep the overlay, longest-side resize on all pages, eager report photos and device cache cleared on sign out');
})().catch(e=>{console.error(e);process.exitCode=1;});
