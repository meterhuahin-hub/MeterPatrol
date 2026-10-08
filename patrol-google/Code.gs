const SPREADSHEET_ID_='1DydK1q8PZELyk2gTFmtxxiUtgSz6EYxRncw1Ep7JDSg';
const TEXT_KEYS_=['surveyDate','wbs','poleSize','jobType','latlong','surveyResult','transformer','pole','pea','phase','machine','note'];
const NUMBER_KEYS_=["old_bolt_8in", "old_bolt_10in", "old_bolt_12in", "old_bolt_14in", "old_bolt_16in", "old_bolt_18in", "old_bolt_แหวน", "old_wire_สีฟ้า", "old_wire_สีดำ", "old_wire_2x6", "old_wire_2x10", "old_wire_25", "old_wire_50", "new_bolt_8in", "new_bolt_10in", "new_bolt_12in", "new_bolt_14in", "new_bolt_16in", "new_bolt_18in", "new_bolt_แหวน", "wood_20", "wood_60", "wood_120", "new_wire_2x10", "new_wire_50", "old_cab", "new_cab"];
const HEADERS_=['รหัสบันทึก','เวลาบันทึก','บัญชี Google',...TEXT_KEYS_,...NUMBER_KEYS_,'รูปก่อน','รูปหลัง','ข้อมูล JSON'];
function user_(){
 const email=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase();
 const allowed=String(PropertiesService.getScriptProperties().getProperty('ALLOWED_EMAILS')||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!email||!allowed.includes(email))throw new Error('บัญชีนี้ไม่ได้รับอนุญาต กรุณาตรวจ ALLOWED_EMAILS และตั้ง Execute as: User accessing the web app');
 return email;
}
function doGet(){
 try{user_();return HtmlService.createHtmlOutputFromFile('Index').setTitle('Patrol Survey').addMetaTag('viewport','width=device-width, initial-scale=1');}
 catch(e){return HtmlService.createHtmlOutput('<h1>Patrol Survey</h1><p>กรุณาใช้บัญชี Google ที่ผู้ดูแลอนุญาต และตรวจการตั้งค่า deployment</p>');}
}
function sheet_(){
 const book=SpreadsheetApp.openById(SPREADSHEET_ID_);
 let sheet=book.getSheetByName('PatrolSurvey');
 if(!sheet){sheet=book.insertSheet('PatrolSurvey');sheet.getRange(1,1,1,HEADERS_.length).setValues([HEADERS_]);sheet.setFrozenRows(1);}
 const headers=sheet.getRange(1,1,1,HEADERS_.length).getValues()[0];
 if(!HEADERS_.every((v,i)=>headers[i]===v))throw new Error('หัวตาราง PatrolSurvey ไม่ตรงกับระบบ ห้ามเขียนทับข้อมูล กรุณาติดต่อผู้ดูแล');
 return sheet;
}
function validate_(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('ข้อมูลไม่ถูกต้อง');
 const r={};
 TEXT_KEYS_.forEach(k=>{const v=input[k]===undefined?'':input[k];if(typeof v!=='string'||v.length>2000)throw new Error('ข้อความไม่ถูกต้องหรือยาวเกินไป');r[k]=v.trim();});
 if(!/^\d{4}-\d{2}-\d{2}$/.test(r.surveyDate)||!Number.isFinite(Date.parse(r.surveyDate))||new Date(r.surveyDate).toISOString().slice(0,10)!==r.surveyDate)throw new Error('วันที่ไม่ถูกต้อง');
 NUMBER_KEYS_.forEach(k=>{const n=input[k]===undefined?0:input[k];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1000000)throw new Error('จำนวนพัสดุต้องเป็นตัวเลขตั้งแต่ศูนย์ถึงหนึ่งล้าน');r[k]=n;});
 if(!TEXT_KEYS_.filter(k=>k!=='surveyDate').some(k=>r[k])&&!NUMBER_KEYS_.some(k=>r[k])&&!input.before&&!input.after)throw new Error('กรุณากรอกข้อมูลงานอย่างน้อยหนึ่งช่อง');
 return r;
}
function photos_(input){
 const photos={};
 for(const key of ['before','after']){
  const data=input[key]||'';
  if(typeof data!=='string'||data.length>2800000||(data&&!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(data)))throw new Error('รูปต้องเป็น JPEG และมีขนาดไม่เกินประมาณ 2 MB ต่อรูป');
  photos[key]=data;
 }
 return photos;
}
function listPatrol(){
 user_();const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{const sheet=sheet_();if(sheet.getLastRow()<2)return [];return sheet.getRange(2,1,sheet.getLastRow()-1,HEADERS_.length).getValues().map(row=>JSON.parse(String(row[HEADERS_.length-1]))).reverse();}
 finally{lock.releaseLock();}
}
function savePatrol(input,requestId){
 const email=user_(),clean=validate_(input),photos=photos_(input);
 if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new Error('รหัสคำขอไม่ถูกต้อง');
 const fingerprint=Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify([clean,photos])));
 const lock=LockService.getScriptLock();lock.waitLock(30000);const created=[];
 try{
  const sheet=sheet_();
  if(sheet.getLastRow()>1){const rows=sheet.getRange(2,1,sheet.getLastRow()-1,HEADERS_.length).getValues();const old=rows.find(row=>String(row[0])===requestId);if(old){const previous=JSON.parse(String(old[HEADERS_.length-1]));if(previous.recordedBy!==email||previous.fingerprint!==fingerprint)throw new Error('คำขอเดิมมีข้อมูลเปลี่ยน กรุณาโหลดหน้าใหม่ก่อนบันทึก');return {id:requestId};}}
  let folder=null;
  if(photos.before||photos.after){const folderId=PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID');if(!folderId)throw new Error('แนบรูปต้องตั้ง PHOTO_FOLDER_ID และแชร์โฟลเดอร์ Drive ให้เจ้าหน้าที่ก่อน หรือบันทึกโดยไม่แนบรูป');folder=DriveApp.getFolderById(folderId);}
  const r=Object.assign(clean,{id:requestId,date:new Date().toISOString(),recordedBy:email,fingerprint,before:'',after:''});
  for(const key of ['before','after'])if(photos[key]){const bytes=Utilities.base64Decode(photos[key].split(',')[1]);const file=folder.createFile(Utilities.newBlob(bytes,'image/jpeg',requestId+'-'+key+'.jpg'));created.push(file);r[key]=file.getUrl();}
  const safe=v=>typeof v==='number'?v:(/^[=+\-@]/.test(String(v))?"'"+v:String(v));
  const values=[r.id,r.date,email,...TEXT_KEYS_.map(k=>r[k]),...NUMBER_KEYS_.map(k=>r[k]),r.before,r.after,JSON.stringify(r)];
  const range=sheet.getRange(sheet.getLastRow()+1,1,1,HEADERS_.length);range.setNumberFormat('@');range.setValues([values.map(safe)]);
  // If flush fails, leave photos intact: the row may have committed despite a lost response.
  created.length=0;SpreadsheetApp.flush();return {id:requestId};
 }catch(e){created.forEach(file=>{try{file.setTrashed(true)}catch(ignore){}});throw e;}
 finally{lock.releaseLock();}
}
