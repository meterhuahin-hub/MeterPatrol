const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const sheets=new Map(),files=[];let email='contractor@example.test',failStatus=false,failWrite=false;
function makeSheet(name){const rows=[],notes={};const s={rows,getMaxColumns:()=>48,insertColumnsAfter:()=>{},getLastRow:()=>rows.length,setFrozenRows:()=>{},getRange:(r,c,n=1,w=1)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>Array.from({length:w},(_,i)=>row[c-1+i]===undefined?'':row[c-1+i])),setValues:vs=>{if(name==='ContractorWork'&&failWrite)throw Error('write failed');vs.forEach((row,i)=>{rows[r-1+i] ||= [];row.forEach((v,j)=>rows[r-1+i][c-1+j]=typeof v==='string'&&v.startsWith("'")?v.slice(1):v)});},setValue:v=>{if(failStatus)throw Error('status failed');rows[r-1][c-1]=v;},setNumberFormat:()=>{},getNote:()=>notes[r]||'',setNote:v=>notes[r]=v})};sheets.set(name,s);return s;}
const props={ALLOWED_EMAILS:email,PHOTO_FOLDER_ID:'shared-folder'};
const folder={createFile:blob=>{const f={name:blob.name,trashed:false,getUrl:()=>`https://drive.google.com/file/d/photo-${files.length}/view`,setTrashed:b=>f.trashed=b};files.push(f);return f;}};
const book={getSheetByName:name=>sheets.get(name)||null,insertSheet:makeSheet};
const c=vm.createContext({Session:{getActiveUser:()=>({getEmail:()=>email})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]})},SpreadsheetApp:{openById:()=>book,flush:()=>{}},LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},DriveApp:{getFolderById:id=>{assert.equal(id,'shared-folder');return folder;}},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(a,t)=>crypto.createHash(a).update(t).digest(),base64Encode:b=>Buffer.from(b).toString('base64'),base64Decode:s=>Buffer.from(s,'base64'),newBlob:(bytes,mime,name)=>({bytes,mime,name})}});
vm.runInContext(fs.readFileSync(__dirname+'/Code.gs','utf8'),c);
c.accountSession_=()=>({role:"user"});c.maintenanceUser_=()=>c.googleUser_();
c.savePatrol({surveyDate:'2026-10-08',pea:'00001',wbs:'WBS-A',latlong:'12.5,99.9'},'survey-request-12345');
c.savePatrol({surveyDate:'2026-10-08',pea:'00002',wbs:'WBS-A'},'survey-request-67890');
const input={recordId:'survey-request-12345',photo1:'data:image/jpeg;base64,YWJj',photo2:'data:image/jpeg;base64,ZGVm'};
assert.throws(()=>c.completeContractorWork({...input,photo2:''},'work-request-12345'));assert.equal(files.length,0);
assert.throws(()=>c.completeContractorWork({...input,recordId:'missing'},'work-request-12345'));
email='outside@example.test';assert.throws(()=>c.completeContractorWork(input,'work-request-12345'));email='contractor@example.test';
failStatus=true;assert.throws(()=>c.completeContractorWork(input,'work-request-12345'));assert.equal(files.length,2);assert.ok(files.every(f=>!f.trashed));assert.equal(sheets.get('ContractorWork').rows.length,2);
failStatus=false;const result=c.completeContractorWork(input,'work-request-12345');assert.equal(result.id,input.recordId);assert.equal(files.length,2);assert.equal(sheets.get('DATA').rows[1][13],'ส่งมอบงาน');assert.equal(sheets.get('DATA').rows[1].length,46);assert.equal(sheets.get('DATA').rows[1][42],'');assert.ok(files[0].name.startsWith('00001_ปฏิบัติ1_'));assert.ok(files[1].name.startsWith('00001_ปฏิบัติ2_'));
assert.equal(sheets.get('DATA').rows[0][44],'รูปปฏิบัติงาน 1');assert.equal(sheets.get('DATA').rows[1][44],result.photo1);assert.equal(sheets.get('DATA').rows[1][45],result.photo2);
sheets.get('DATA').rows[1][44]='';sheets.get('DATA').rows[1][45]='';assert.equal(c.syncContractorPhotos().updated,1);assert.equal(c.syncContractorPhotos().updated,0);assert.equal(sheets.get('DATA').rows[1][44],result.photo1);
const jobs=c.listPatrol();assert.equal(jobs.find(r=>r.id===input.recordId).delivery.photo1,result.photo1);assert.equal(jobs.find(r=>r.id!==input.recordId).delivery,null);
assert.throws(()=>c.completeContractorWork(input,'work-request-new123'));assert.throws(()=>c.completeContractorWork({...input,photo1:'data:image/jpeg;base64,YWJk'},'work-request-12345'));assert.equal(files.length,2);
failWrite=true;assert.throws(()=>c.completeContractorWork({...input,recordId:'survey-request-67890'},'work-request-67890'));assert.ok(files.slice(2).every(f=>f.trashed));assert.equal(sheets.get('DATA').rows[2][13],'สำรวจ');
console.log('PASS: two required photos, real job lookup, access checks, durable completion, idempotent retry/recovery, green-status data, original survey photos retained and failed-upload cleanup (Google APIs simulated)');

c.accountSession_=()=>({role:'contractor'});assert.throws(()=>c.savePatrol({wbs:'denied'},'denied-request-12345'),/สิทธิ์ผู้รับจ้าง/);assert.throws(()=>c.saveInspection({},'denied-review-12345'),/สิทธิ์ผู้รับจ้าง/);console.log('PASS: contractor cannot create survey records or submit inspections');
