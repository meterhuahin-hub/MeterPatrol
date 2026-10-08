const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const sheets=new Map(),files=[];let email='contractor@example.test',failStatus=false,failWrite=false;
function makeSheet(name){const rows=[],notes={};const s={rows,getMaxColumns:()=>48,insertColumnsAfter:()=>{},getLastRow:()=>rows.length,setFrozenRows:()=>{},getRange:(r,c,n=1,w=1)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>Array.from({length:w},(_,i)=>row[c-1+i]===undefined?'':row[c-1+i])),setValues:vs=>{if(name==='ContractorWork'&&failWrite)throw Error('write failed');vs.forEach((row,i)=>{rows[r-1+i] ||= [];row.forEach((v,j)=>rows[r-1+i][c-1+j]=typeof v==='string'&&v.startsWith("'")?v.slice(1):v)});},setValue:v=>{if(failStatus)throw Error('status failed');rows[r-1][c-1]=v;},setNumberFormat:()=>{},getNote:()=>notes[r]||'',setNote:v=>notes[r]=v})};sheets.set(name,s);return s;}
const props={ALLOWED_EMAILS:email,PHOTO_FOLDER_ID:'shared-folder'};
const folder={createFile:blob=>{const f={name:blob.name,trashed:false,getUrl:()=>`https://drive.google.com/file/d/photo-${files.length}/view`,setTrashed:b=>f.trashed=b};files.push(f);return f;}};
const book={getSheetByName:name=>sheets.get(name)||null,insertSheet:makeSheet};
const c=vm.createContext({Session:{getActiveUser:()=>({getEmail:()=>email})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]})},SpreadsheetApp:{openById:()=>book,flush:()=>{}},LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},DriveApp:{getFileById:id=>{assert.match(id,/^photo-/);return {getBlob:()=>({getBytes:()=>Buffer.from('jpeg-photo'),getContentType:()=> 'image/jpeg'})};},getFolderById:id=>{assert.equal(id,'shared-folder');return folder;}},Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(a,t)=>crypto.createHash(a).update(t).digest(),base64Encode:b=>Buffer.from(b).toString('base64'),base64Decode:s=>Buffer.from(s,'base64'),newBlob:(bytes,mime,name)=>({bytes,mime,name})}});
vm.runInContext(fs.readFileSync(__dirname+'/Code.gs','utf8'),c);
c.accountSession_=()=>({role:"user"});c.maintenanceUser_=()=>c.googleUser_();
c.savePatrol({surveyDate:'2026-10-08',pea:'00001',wbs:'WBS-A',latlong:'12.5,99.9'},'survey-request-12345');
const photos={recordId:'survey-request-12345',photo1:'data:image/jpeg;base64,YWJj',photo2:'data:image/jpeg;base64,ZGVm'};
c.completeContractorWork(photos,'work-request-12345');const data=sheets.get('DATA'),originalLinks=data.rows[1].slice(42,46);
assert.throws(()=>c.saveInspection({...photos,verdict:'unknown'},'inspect-request-12345'));assert.throws(()=>c.saveInspection({...photos,photo2:'',verdict:'ผ่าน'},'inspect-request-12345'));
email='outside@example.test';assert.throws(()=>c.saveInspection({...photos,verdict:'ผ่าน'},'inspect-request-12345'));email='contractor@example.test';
failStatus=true;assert.throws(()=>c.saveInspection({...photos,verdict:'ไม่ผ่าน'},'inspect-request-12345'));assert.equal(sheets.get('InspectorReviews').rows.length,2);assert.equal(files.length,4);
failStatus=false;c.saveInspection({...photos,verdict:'ไม่ผ่าน'},'inspect-request-12345');assert.equal(files.length,4);assert.equal(data.rows[1][13],'ไม่ผ่าน');assert.equal(c.listPatrol()[0].inspection.verdict,'ไม่ผ่าน');
assert.ok(files[2].name.startsWith('00001_ตรวจรับ1_'));assert.ok(files[3].name.startsWith('00001_ตรวจรับ2_'));
c.saveInspection({...photos,verdict:'ผ่าน'},'inspect-request-67890');assert.equal(data.rows[1][13],'ผ่าน');assert.equal(c.listPatrol()[0].inspection.verdict,'ผ่าน');assert.equal(sheets.get('InspectorReviews').rows.length,3);
const retry=c.saveInspection({...photos,verdict:'ไม่ผ่าน'},'inspect-request-12345');assert.equal(retry.verdict,'ผ่าน');assert.equal(data.rows[1][13],'ผ่าน');assert.equal(files.length,6);
c.completeContractorWork(photos,'work-request-12345');assert.equal(data.rows[1][13],'ผ่าน');assert.deepEqual(data.rows[1].slice(42,46),originalLinks);
assert.throws(()=>c.saveInspection({...photos,verdict:'ผ่าน'},'inspect-request-12345'));assert.equal(files.length,6);
console.log('PASS: authorized two-photo pass/fail, audit history, latest verdict survives old retries, failure recovery, separate inspection photos and delivery links preserved (Google APIs simulated)');

assert.equal(data.rows[0][46],'ดูรูปตรวจรับ 1');assert.equal(data.rows[0][47],'ดูรูปตรวจรับ 2');assert.equal(data.rows[1][46],c.listPatrol()[0].inspection.photo1);assert.equal(data.rows[1][47],c.listPatrol()[0].inspection.photo2);
data.rows[1][46]='';data.rows[1][47]='';assert.equal(c.syncInspectionPhotos().updated,1);assert.equal(c.syncInspectionPhotos().updated,0);
assert.ok(c.getWorkPhoto(photos.recordId,'inspection',1).startsWith('data:image/jpeg;base64,'));assert.ok(c.getWorkPhoto(photos.recordId,'delivery',2).startsWith('data:image/jpeg;base64,'));assert.throws(()=>c.getWorkPhoto('arbitrary-file-id','inspection',1));assert.throws(()=>c.getWorkPhoto(photos.recordId,'inspection',3));email='outsider@example.test';assert.throws(()=>c.getWorkPhoto(photos.recordId,'inspection',1));
console.log('PASS: AU/AV inspection links, safe backfill and authorized ledger-only inline image retrieval');
