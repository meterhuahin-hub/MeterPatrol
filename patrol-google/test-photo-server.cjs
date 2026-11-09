const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const code=fs.readFileSync(__dirname+'/Code.gs','utf8');
const b64=bytes=>Buffer.from(bytes).toString('base64');
const blob=(type,size)=>({getContentType:()=>type,getBytes:()=>new Array(size).fill(1)});
const fullUrl=id=>'https://drive.google.com/file/d/'+id+'/view';
function setup(){
 const files=new Map(),counts={sheet:0,delivery:0,transfer:0,inspection:0,thumb:0};
 const c=vm.createContext({Utilities:{base64Encode:b64,formatDate:()=>''},DriveApp:{getFileById:id=>files.get(id)},console});
 vm.runInContext(code,c);
 const row=new Array(58).fill('');row[0]='r1';row[6]='00001';row[3]='W-1';
 const keys=vm.runInContext('DATA_KEYS_',c);row[keys.indexOf('before')]=fullUrl('b');row[keys.indexOf('after')]=fullUrl('a');
 c.canAccessWork_=()=>true;c.accountSession_=()=>({role:'admin'});c.googleUser_=()=>'a@example.com';
 c.sheet_=()=>{counts.sheet++;return {getLastRow:()=>2,getRange:(r,col,rows,cols)=>({getValues:()=>cols===1?[[row[0]]]:[row]})};};
 c.deliveryMap_=()=>{counts.delivery++;return new Map([['r1',{photo1:fullUrl('d1'),photo2:fullUrl('d2'),requestId:'x',submittedAt:''}]]);};
 c.transferMap_=()=>{counts.transfer++;return new Map();};
 c.inspectionMap_=()=>{counts.inspection++;return new Map();};
 const file=(thumb,full=blob('image/jpeg',100))=>({getThumbnail(){counts.thumb++;if(thumb instanceof Error)throw thumb;return thumb;},getBlob:()=>full});
 for(const id of ['b','a','d1','d2'])files.set(id,file(blob('image/png',10)));
 return {c,files,counts,file,row};
}
(()=>{
 let t=setup();
 // One request covers several kinds and reads each sheet once.
 const result=t.c.getWorkPhotoThumbnails('r1',['survey','delivery'],'token');
 assert.equal(t.counts.sheet,1,'DATA is read once for the whole job');
 assert.equal(t.counts.delivery,1,'deliveries are read once');
 assert.equal(t.counts.inspection,0,'unrequested kinds are not read');
 assert.ok(result.survey.every(v=>v.startsWith('data:image/png;base64,')),'thumbnails are returned as images');
 assert.equal(result.delivery.length,2);
 // A kind with no record reports its own error and does not fail the others.
 t=setup();
 const mixed=t.c.getWorkPhotoThumbnails('r1',['survey','inspection'],'token');
 assert.equal(mixed.survey.length,2);assert.ok(mixed.inspection.error,'missing kind reports an error');
 // Drive may have no thumbnail yet, or return an unusable one: the full photo is used instead.
 for(const bad of [null,new Error('no thumbnail'),blob('image/gif',10),blob('image/png',0),blob('image/png',900000)]){
  t=setup();t.files.set('b',t.file(bad));
  const value=t.c.getWorkPhotoThumbnails('r1',['survey'],'token').survey[0];
  assert.ok(value.startsWith('data:image/jpeg;base64,'),'falls back to the full JPEG');
 }
 // One unreadable photo reports its own error.
 t=setup();t.files.set('a',t.file(null,blob('application/pdf',10)));
 const partial=t.c.getWorkPhotoThumbnails('r1',['survey'],'token').survey;
 assert.ok(partial[0].startsWith('data:'));assert.ok(partial[1].error);
 // Access rules are the same as for full photos.
 t=setup();t.c.canAccessWork_=()=>false;
 assert.throws(()=>t.c.getWorkPhotoThumbnails('r1',['survey'],'token'),/สิทธิ์/);
 t=setup();t.c.accountSession_=()=>{throw new Error('AUTH_REQUIRED: x');};
 assert.throws(()=>t.c.getWorkPhotoThumbnails('r1',['survey'],'token'),/AUTH_REQUIRED/);
 t=setup();
 for(const bad of [['nope'],[],'survey',['survey','delivery','inspection','transfer','survey']])assert.throws(()=>t.c.getWorkPhotoThumbnails('r1',bad,'token'),/คำขอรูป/);
 // Full photos still work and keep their response shape.
 t=setup();assert.equal(t.c.getWorkPhotos('r1','survey','token').length,2);
 // A complete DATA sheet is confirmed with one header read and no migration.
 const s=setup().c,full=vm.runInContext(`[...HEADERS_,'รูปปฏิบัติงาน 1','รูปปฏิบัติงาน 2','ดูรูปตรวจรับ 1','ดูรูปตรวจรับ 2','งาน Patrol','กฟฟ.','ข้อมูลการลบ','ที่อยู่','ชื่อผู้ใช้ไฟ','หมายเลขผู้ใช้ไฟ CA','ปีงบประมาณของงาน (พ.ศ.)']`,s);
 const fresh=vm.createContext({});vm.runInContext(code,fresh);
 const run=(headers,maxColumns=58)=>{let reads=0,writes=0;const sheet={getMaxColumns:()=>maxColumns,getLastRow:()=>1,insertColumnsAfter(){writes++;},setFrozenRows(){},getRange(r,col,rows,cols){reads++;const width=cols||1;return {getValues:()=>[headers.slice(col-1,col-1+width)],setValues(){writes++;},setNumberFormat(){}};}};fresh.SpreadsheetApp={openById:()=>({getSheetByName:()=>sheet})};assert.equal(fresh.sheet_(),sheet);return {reads,writes};};
 assert.deepEqual(run([...full]),{reads:1,writes:0},'complete sheet needs one read');
 const loose=[...full];loose[4]='  '+loose[4]+' ';assert.deepEqual(run(loose),{reads:1,writes:0},'spacing in a header is tolerated as before');
 // A sheet missing a later column still goes through the existing migration.
 const missing=[...full];missing[57]='';const migrated=run(missing);assert.ok(migrated.reads>1&&migrated.writes>=1,'missing column still migrates');
 // A changed header is still refused.
 const wrong=[...full];wrong[3]='อื่น';assert.throws(()=>run(wrong),/หัวตาราง/);
 const wrongExtra=[...full];wrongExtra[53]='อื่น';assert.throws(()=>run(wrongExtra),/BB/);
 console.log('PASS job thumbnails in one request with single sheet reads, per-kind and per-photo errors, full-photo fallback, unchanged access rules and one-read schema confirmation');
})();
