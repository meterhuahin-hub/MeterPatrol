const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(__dirname+'/Index.html','utf8');
const source=html.slice(html.indexOf('const savedPhotoCache='),html.indexOf('function appendSavedPhotos(')).replace('16*1024*1024','2048');
const c=vm.createContext({setTimeout,clearTimeout});vm.runInContext(source,c);
const tick=()=>new Promise(r=>setTimeout(r,10));
(async()=>{
 const pending=[];let active=0,max=0;
 const requests=Array.from({length:9},(_,i)=>c.schedulePhotoRequest(()=>new Promise((resolve,reject)=>{active++;max=Math.max(max,active);pending.push({resolve:value=>{active--;resolve(value);},reject:error=>{active--;reject(error);},i});})));const settled=Promise.allSettled(requests);
 await tick();assert.equal(pending.length,3);pending.shift().reject(Error('network'));await tick();assert.equal(pending.length,3,'failure releases its slot');
 while(pending.length){pending.shift().resolve(['image']);await tick();}
 assert.equal((await settled).filter(r=>r.status==='rejected').length,1);assert.equal(max,3,'at most three photo RPCs run together');
 let invoked=0;const late=[];const old=Array.from({length:6},()=>c.schedulePhotoRequest(()=>{invoked++;return new Promise(resolve=>late.push(resolve));}));const oldResult=Promise.allSettled(old);await tick();vm.runInContext('photoCacheGeneration++;resetPhotoLoading()',c);late.forEach(resolve=>resolve([]));const statuses=await oldResult;assert.equal(invoked,3,'queued requests from a signed-out session never execute');assert.equal(statuses.filter(r=>r.status==='rejected').length,3);await c.schedulePhotoRequest(()=>Promise.resolve('new session'));
 let calls=0,writes=0,finish;c.rpc=()=>{calls++;return new Promise(resolve=>finish=resolve);};c.writeStoredPhotos=()=>{writes++;};const stale=c.cachedWorkPhotos('stale','survey',['u']);await tick();vm.runInContext('savedPhotoCache.clear();photoCacheGeneration++;resetPhotoLoading()',c);finish(['data:image/jpeg;base64,AA==']);await stale;assert.equal(writes,0,'old in-flight responses cannot repopulate device storage');
 c.rpc=async()=>['data:image/jpeg;base64,'+'A'.repeat(600)];await c.cachedWorkPhotos('large1','survey',['u']);await c.cachedWorkPhotos('large2','survey',['u']);assert.ok(vm.runInContext('[...savedPhotoSizes.values()].reduce((a,b)=>a+b,0)',c)<=2048);assert.equal(vm.runInContext('savedPhotoCache.size',c),1,'memory is bounded by bytes as well as entry count');
 const batches=[];c.rpc=async(method,id,kinds)=>{batches.push({method,id,kinds:[...kinds]});return Object.fromEntries(kinds.map(kind=>[kind,['data:image/jpeg;base64,AA==']]));};const thumbs=await Promise.all([c.queueWorkThumbnails('one','survey'),c.queueWorkThumbnails('one','delivery'),c.queueWorkThumbnails('one','survey')]);assert.equal(batches.length,1);assert.deepEqual(batches[0].kinds,['survey','delivery']);assert.equal(thumbs.length,3,'duplicate kind waiters all complete');
 console.log('PASS photo RPC concurrency, failure recovery, sign-out queue cancellation, stale response isolation, byte-bounded memory and grouped thumbnail waiters');
})().catch(e=>{console.error(e);process.exitCode=1;});
