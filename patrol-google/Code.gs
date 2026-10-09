const SPREADSHEET_ID_='1DydK1q8PZELyk2gTFmtxxiUtgSz6EYxRncw1Ep7JDSg';
const TEXT_KEYS_=['surveyDate','wbs','poleSize','jobType','latlong','surveyResult','transformer','pole','pea','phase','machine','note'];
const NUMBER_KEYS_=["old_bolt_8in", "old_bolt_10in", "old_bolt_12in", "old_bolt_14in", "old_bolt_16in", "old_bolt_18in", "old_bolt_แหวน", "old_wire_สีฟ้า", "old_wire_สีดำ", "old_wire_2x6", "old_wire_2x10", "old_wire_25", "old_wire_50", "new_bolt_8in", "new_bolt_10in", "new_bolt_12in", "new_bolt_14in", "new_bolt_16in", "new_bolt_18in", "new_bolt_แหวน", "wood_20", "wood_60", "wood_120", "new_wire_2x10", "new_wire_50", "old_cab", "new_cab"];
const HEADERS_=["Record ID", "บันทึกเมื่อ", "วันที่", "หมายเลขงาน WBS", "หม้อแปลง TR", "เสาที่", "PEA.", "ขนาด/เฟส", "เครื่อง", "ขนาดเสา", "ประเภทงาน", "Latitude", "Longitude", "ผลสำรวจ", "เก่า-น็อต 8\"", "เก่า-น็อต 10\"", "เก่า-น็อต 12\"", "เก่า-น็อต 14\"", "เก่า-น็อต 16\"", "เก่า-น็อต 18\"", "เก่า-แหวน", "เก่า-สายไฟสีฟ้า", "เก่า-สายไฟสีดำ", "เก่า-สายไฟ 2x6", "เก่า-สายไฟ 2x10", "เก่า-สายไฟ 25", "เก่า-สายไฟ 50", "เก่า-ตู้", "ใหม่-น็อต 8\"", "ใหม่-น็อต 10\"", "ใหม่-น็อต 12\"", "ใหม่-น็อต 14\"", "ใหม่-น็อต 16\"", "ใหม่-น็อต 18\"", "ใหม่-แหวน", "ใหม่-แป้นไม้ 20", "ใหม่-แป้นไม้ 60", "ใหม่-แป้นไม้ 120", "ใหม่-สายไฟ 2x10", "ใหม่-สายไฟ 50", "ใหม่-ตู้", "หมายเหตุ", "รูปก่อน", "รูปหลัง"];
const DATA_KEYS_=["id", "date", "surveyDate", "wbs", "transformer", "pole", "pea", "phase", "machine", "poleSize", "jobType", "latitude", "longitude", "surveyResult", "old_bolt_8in", "old_bolt_10in", "old_bolt_12in", "old_bolt_14in", "old_bolt_16in", "old_bolt_18in", "old_bolt_แหวน", "old_wire_สีฟ้า", "old_wire_สีดำ", "old_wire_2x6", "old_wire_2x10", "old_wire_25", "old_wire_50", "old_cab", "new_bolt_8in", "new_bolt_10in", "new_bolt_12in", "new_bolt_14in", "new_bolt_16in", "new_bolt_18in", "new_bolt_แหวน", "wood_20", "wood_60", "wood_120", "new_wire_2x10", "new_wire_50", "new_cab", "note", "before", "after"];
function googleUser_(){
 const email=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase();
 const allowed=String(PropertiesService.getScriptProperties().getProperty('ALLOWED_EMAILS')||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!email||!allowed.includes(email))throw new Error('บัญชีนี้ไม่ได้รับอนุญาต กรุณาตรวจ ALLOWED_EMAILS และตั้ง Execute as: User accessing the web app');
 return email;
}
function user_(token){accountSession_(token);return googleUser_();}
function doGet(){
 try{googleUser_();return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('งานปรับปรุง WBS').addMetaTag('viewport','width=device-width, initial-scale=1');}
 catch(e){return HtmlService.createHtmlOutput('<h1>งานปรับปรุง WBS</h1><p>กรุณาใช้บัญชี Google ที่ผู้ดูแลอนุญาต และตรวจการตั้งค่า deployment</p>');}
}
function include_(name){return HtmlService.createHtmlOutputFromFile(name).getContent();}
function sheet_(){
 const book=SpreadsheetApp.openById(SPREADSHEET_ID_);
 let sheet=book.getSheetByName('DATA');
 if(!sheet){sheet=book.insertSheet('DATA');sheet.getRange(1,1,1,HEADERS_.length).setValues([HEADERS_]);sheet.setFrozenRows(1);}
 const headers=sheet.getRange(1,1,1,HEADERS_.length).getValues()[0].map(v=>String(v).replace(/\s+/g,' ').trim());
 if(!HEADERS_.every((v,i)=>headers[i]===v))throw new Error('หัวตาราง DATA ไม่ตรงกับระบบ ห้ามเขียนทับข้อมูล กรุณาติดต่อผู้ดูแล');
 ensureWorkPhotoColumns_(sheet);
 ensureInspectionPhotoColumns_(sheet);
 return sheet;
}
function ensureWorkPhotoColumns_(sheet){
 const max=sheet.getMaxColumns();if(max<46)sheet.insertColumnsAfter(max,46-max);
 const range=sheet.getRange(1,45,1,2),header=range.getValues()[0];
 const names=['รูปปฏิบัติงาน 1','รูปปฏิบัติงาน 2'];
 if(header.some((v,i)=>String(v).trim()!==''&&String(v).trim()!==names[i]))throw new Error('คอลัมน์ AS/AT มีหัวตารางอื่นอยู่ ระบบจะไม่เขียนทับ');
 if(header.some(v=>String(v).trim()==='')){
  if(sheet.getLastRow()>1){const values=sheet.getRange(2,45,sheet.getLastRow()-1,2).getValues();if(values.some(row=>row.some((v,i)=>!String(header[i]).trim()&&v!==''&&v!==null&&v!==undefined)))throw new Error('AS/AT มีข้อมูลแต่ไม่มีหัวตาราง กรุณาตรวจสอบก่อน');}
  range.setValues([names]);
 }
}
function ensureInspectionPhotoColumns_(sheet){
 const max=sheet.getMaxColumns();if(max<48)sheet.insertColumnsAfter(max,48-max);
 const range=sheet.getRange(1,47,1,2),header=range.getValues()[0];
 const names=['ดูรูปตรวจรับ 1','ดูรูปตรวจรับ 2'];
 if(header.some((v,i)=>String(v).trim()!==''&&String(v).trim()!==names[i]))throw new Error('คอลัมน์ AU/AV มีหัวตารางอื่นอยู่ ระบบจะไม่เขียนทับ');
 if(header.some(v=>String(v).trim()==='')){
  if(sheet.getLastRow()>1){const values=sheet.getRange(2,47,sheet.getLastRow()-1,2).getValues();if(values.some(row=>row.some((v,i)=>!String(header[i]).trim()&&v!==''&&v!==null&&v!==undefined)))throw new Error('AU/AV มีข้อมูลแต่ไม่มีหัวตาราง กรุณาตรวจสอบก่อน');}
  range.setValues([names]);
 }
}
function setInspectionPhotoLinks_(sheet,row,photo1,photo2){
 sheet.getRange(row,47,1,2).setValues([[photo1,photo2]]);
}
function setWorkPhotoLinks_(sheet,row,photo1,photo2){
 sheet.getRange(row,45,1,2).setValues([[photo1,photo2]]);
}
function validate_(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('ข้อมูลไม่ถูกต้อง');
 const r={};
 TEXT_KEYS_.forEach(k=>{const v=input[k]===undefined?'':input[k];if(typeof v!=='string'||v.length>2000)throw new Error('ข้อความไม่ถูกต้องหรือยาวเกินไป');r[k]=v.trim();});
 if(!/^\d{4}-\d{2}-\d{2}$/.test(r.surveyDate)||!Number.isFinite(Date.parse(r.surveyDate))||new Date(r.surveyDate).toISOString().slice(0,10)!==r.surveyDate)throw new Error('วันที่ไม่ถูกต้อง');
 NUMBER_KEYS_.forEach(k=>{const n=input[k]===undefined?0:input[k];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1000000)throw new Error('จำนวนพัสดุต้องเป็นตัวเลขตั้งแต่ศูนย์ถึงหนึ่งล้าน');r[k]=n;});
 if(!TEXT_KEYS_.filter(k=>k!=='surveyDate').some(k=>r[k])&&!NUMBER_KEYS_.some(k=>r[k])&&!input.before&&!input.after)throw new Error('กรุณากรอกข้อมูลงานอย่างน้อยหนึ่งช่อง');
 if(r.latlong){const parts=r.latlong.split(',').map(s=>s.trim());const lat=Number(parts[0]),lng=Number(parts[1]);if(parts.length!==2||parts.some(s=>!s)||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw new Error('พิกัด Latitude/Longitude ไม่ถูกต้อง');}
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
function readRow_(row){
 const r={};DATA_KEYS_.forEach((key,i)=>{
  const v=row[i];
  if(NUMBER_KEYS_.includes(key)){const n=v===''?0:Number(v);if(!Number.isFinite(n)||n<0)throw new Error('จำนวนพัสดุใน DATA ไม่ถูกต้อง');r[key]=n;}
  else if(v instanceof Date){r[key]=key==='surveyDate'?Utilities.formatDate(v,'Asia/Bangkok','yyyy-MM-dd'):v.toISOString();}
  else r[key]=String(v===undefined?'':v);
 });
 r.latlong=r.latitude!==''&&r.longitude!==''?r.latitude+','+r.longitude:'';
 return r;
}
function listPatrol(token){
 user_(token);const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{const sheet=sheet_();if(sheet.getLastRow()<2)return [];const deliveries=deliveryMap_(),inspections=inspectionMap_();return sheet.getRange(2,1,sheet.getLastRow()-1,HEADERS_.length).getValues().filter(row=>row.some(v=>v!==''&&v!==null)).map(readRow_).map(r=>{const delivery=deliveries.get(r.id);return Object.assign(r,{delivery:delivery||null,inspection:inspections.get(r.id)||null});}).reverse();}
 finally{lock.releaseLock();}
}
function photoName_(pea,key,requestId){
 const label=String(pea||'').trim().replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,'_').slice(0,100)||'ไม่ระบุ-PEA';
 return label+'_'+(key==='before'?'ก่อน':'หลัง')+'_'+requestId+'.jpg';
}
function savePatrol(input,requestId,token){
 denyContractor_(token);input=Object.assign({},input,{surveyResult:'สำรวจ'});
 const email=user_(token),clean=validate_(input),photos=photos_(input);
 if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new Error('รหัสคำขอไม่ถูกต้อง');
 const fingerprint=Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify([clean,photos])));
 const lock=LockService.getScriptLock();lock.waitLock(30000);const created=[];
 try{
  const sheet=sheet_();
  if(sheet.getLastRow()>1){
   const rows=sheet.getRange(2,1,sheet.getLastRow()-1,HEADERS_.length).getValues();const index=rows.findIndex(row=>String(row[0])===requestId);
   if(index>=0){
    const note=sheet.getRange(index+2,1).getNote();
    let previous;try{previous=JSON.parse(note)}catch(e){throw new Error('พบรหัสบันทึกนี้ใน DATA แล้ว แต่ไม่มีข้อมูลยืนยัน กรุณาตรวจแถวเดิมก่อนส่งซ้ำ');}
    if(previous.recordedBy!==email||previous.fingerprint!==fingerprint)throw new Error('คำขอเดิมมีข้อมูลเปลี่ยน กรุณาโหลดหน้าใหม่ก่อนบันทึก');return {id:requestId};
   }
  }
  let folder=null;
  if(photos.before||photos.after){const folderId=PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID');if(!folderId)throw new Error('แนบรูปต้องตั้ง PHOTO_FOLDER_ID และแชร์โฟลเดอร์ Drive ให้เจ้าหน้าที่ก่อน หรือบันทึกโดยไม่แนบรูป');folder=DriveApp.getFolderById(folderId);}
  const r=Object.assign(clean,{id:requestId,date:new Date().toISOString(),recordedBy:email,fingerprint,before:'',after:''});
  for(const key of ['before','after'])if(photos[key]){const bytes=Utilities.base64Decode(photos[key].split(',')[1]);const file=folder.createFile(Utilities.newBlob(bytes,'image/jpeg',photoName_(clean.pea,key,requestId)));created.push(file);r[key]=file.getUrl();}
  const safe=v=>typeof v==='number'?v:(/^[=+\-@]/.test(String(v))?"'"+v:String(v));
  const coords=clean.latlong?clean.latlong.split(',').map(v=>Number(v.trim())):['',''];r.latitude=coords[0];r.longitude=coords[1];
  const values=DATA_KEYS_.map(key=>r[key]);
  const rowIndex=sheet.getLastRow()+1;
  const range=sheet.getRange(rowIndex,1,1,HEADERS_.length);range.setNumberFormat('@');range.setValues([values.map(safe)]);
  // Keep photos once a row has been written, even if adding its audit note fails.
  created.length=0;
  sheet.getRange(rowIndex,1).setNote(JSON.stringify({recordedBy:email,fingerprint}));
  // If flush fails, leave photos intact: the row may have committed despite a lost response.
  created.length=0;SpreadsheetApp.flush();return {id:requestId};
 }catch(e){created.forEach(file=>{try{file.setTrashed(true)}catch(ignore){}});throw e;}
 finally{lock.releaseLock();}
}

const WORK_HEADERS_=['Record ID','WBS','PEA.','ผู้ส่งมอบ','ส่งมอบเมื่อ','รูปปฏิบัติ 1','รูปปฏิบัติ 2','รหัสคำขอ','Fingerprint'];
function workSheet_(create){
 const book=SpreadsheetApp.openById(SPREADSHEET_ID_);let sheet=book.getSheetByName('ContractorWork');
 if(!sheet&&create){sheet=book.insertSheet('ContractorWork');sheet.getRange(1,1,1,WORK_HEADERS_.length).setValues([WORK_HEADERS_]);sheet.setFrozenRows(1);}
 if(!sheet)return null;
 const header=sheet.getRange(1,1,1,WORK_HEADERS_.length).getValues()[0];
 if(!WORK_HEADERS_.every((h,i)=>h===String(header[i]).trim()))throw new Error('หัวตาราง ContractorWork ไม่ตรงกับระบบ');
 return sheet;
}
function deliveryMap_(){
 const sheet=workSheet_(false),map=new Map();
 if(sheet&&sheet.getLastRow()>1)sheet.getRange(2,1,sheet.getLastRow()-1,WORK_HEADERS_.length).getValues().forEach(row=>{
  if(row[0]&&row[5]&&row[6])map.set(String(row[0]),{submittedAt:row[4] instanceof Date?row[4].toISOString():String(row[4]),submittedBy:String(row[3]),photo1:String(row[5]),photo2:String(row[6])});
 });
 return map;
}
function completeContractorWork(input,requestId,token){
 const email=user_(token);
 if(!input||typeof input!=='object'||typeof input.recordId!=='string'||!input.recordId||input.recordId.length>100)throw new Error('งานไม่ถูกต้อง');
 if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new Error('รหัสคำขอไม่ถูกต้อง');
 const photos=photos_({before:input.photo1,after:input.photo2});
 if(!photos.before||!photos.after)throw new Error('กรุณาแนบรูปปฏิบัติงานให้ครบ 2 รูป');
 const fingerprint=Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify([input.recordId,photos])));
 const lock=LockService.getScriptLock();lock.waitLock(30000);const created=[];
 try{
  const data=sheet_(),rows=data.getLastRow()>1?data.getRange(2,1,data.getLastRow()-1,HEADERS_.length).getValues():[];
  const index=rows.findIndex(row=>String(row[0])===input.recordId);
  if(index<0)throw new Error('ไม่พบงานสำรวจใน DATA กรุณาโหลดข้อมูลใหม่');
  if(rows.filter(row=>String(row[0])===input.recordId).length!==1)throw new Error('Record ID ซ้ำใน DATA กรุณาให้ผู้ดูแลตรวจสอบ');
  const work=readRow_(rows[index]);if(!work.wbs.trim()||!work.pea.trim())throw new Error('งานนี้ไม่มี WBS หรือ PEA กรุณาให้ผู้สำรวจเติมข้อมูลก่อน');
  const sheet=workSheet_(true),previous=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,WORK_HEADERS_.length).getValues():[];
  const duplicate=previous.find(row=>String(row[7])===requestId);
  if(duplicate){
   if(String(duplicate[0])!==input.recordId||String(duplicate[3])!==email||String(duplicate[8])!==fingerprint)throw new Error('รหัสคำขอเดิมมีข้อมูลเปลี่ยน');
   setWorkPhotoLinks_(data,index+2,String(duplicate[5]),String(duplicate[6]));data.getRange(index+2,14).setValue((inspectionMap_().get(input.recordId)||{}).verdict||'ส่งมอบงาน');SpreadsheetApp.flush();return {id:input.recordId,submittedAt:String(duplicate[4]),photo1:String(duplicate[5]),photo2:String(duplicate[6])};
  }
  if(previous.some(row=>String(row[0])===input.recordId))throw new Error('งานนี้ส่งมอบแล้ว กรุณาโหลดข้อมูลล่าสุด');
  const folderId=PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID');if(!folderId)throw new Error('ผู้ดูแลต้องตั้ง PHOTO_FOLDER_ID และแชร์โฟลเดอร์ให้ผู้รับจ้าง');
  const folder=DriveApp.getFolderById(folderId),urls=[];
  const label=work.pea.replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,'_').slice(0,100);
  [photos.before,photos.after].forEach((image,i)=>{
   const blob=Utilities.newBlob(Utilities.base64Decode(image.split(',')[1]),'image/jpeg',label+'_ปฏิบัติ'+(i+1)+'_'+requestId+'.jpg');
   const file=folder.createFile(blob);created.push(file);urls.push(file.getUrl());
  });
  const now=new Date().toISOString(),safe=v=>/^[=+\-@]/.test(String(v))?"'"+v:String(v);
  const values=[work.id,work.wbs,work.pea,email,now,urls[0],urls[1],requestId,fingerprint];
  const range=sheet.getRange(sheet.getLastRow()+1,1,1,WORK_HEADERS_.length);range.setNumberFormat('@');range.setValues([values.map(safe)]);
  // Keep files after the durable delivery row; a retry recovers a failed DATA status update.
  created.length=0;
  setWorkPhotoLinks_(data,index+2,urls[0],urls[1]);data.getRange(index+2,14).setValue((inspectionMap_().get(input.recordId)||{}).verdict||'ส่งมอบงาน');SpreadsheetApp.flush();
  return {id:work.id,submittedAt:now,photo1:urls[0],photo2:urls[1]};
 }catch(e){created.forEach(file=>{try{file.setTrashed(true)}catch(ignore){}});throw e;}
 finally{lock.releaseLock();}
}

// Run once from Apps Script to copy existing delivery photo links into DATA.
function syncContractorPhotos(token){
 maintenanceUser_(token);const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  const data=sheet_(),deliveries=deliveryMap_();let updated=0,conflicts=0;
  if(data.getLastRow()>1){
   const rows=data.getRange(2,1,data.getLastRow()-1,46).getValues();
   const counts=new Map();rows.forEach(row=>counts.set(String(row[0]),(counts.get(String(row[0]))||0)+1));
   rows.forEach((row,i)=>{
    const id=String(row[0]),delivery=deliveries.get(id);if(!delivery)return;
    const target=[delivery.photo1,delivery.photo2],current=[row[44]||'',row[45]||''];
    if(counts.get(id)!==1||current.some((url,j)=>url&&url!==target[j])){conflicts++;return;}
    if(current.some((url,j)=>url!==target[j])){setWorkPhotoLinks_(data,i+2,...target);updated++;}
   });
  }
  SpreadsheetApp.flush();const result={updated,conflicts};console.log(JSON.stringify(result));return result;
 }finally{lock.releaseLock();}
}

const INSPECT_HEADERS_=['Record ID','WBS','PEA.','ผู้ตรวจ','ตรวจเมื่อ','รูปตรวจรับ 1','รูปตรวจรับ 2','รหัสคำขอ','Fingerprint','ผลตรวจ','หมายเหตุการตรวจรับ'];
function inspectionSheet_(create){
 const book=SpreadsheetApp.openById(SPREADSHEET_ID_);let sheet=book.getSheetByName('InspectorReviews');
 if(!sheet&&create){sheet=book.insertSheet('InspectorReviews');sheet.getRange(1,1,1,INSPECT_HEADERS_.length).setValues([INSPECT_HEADERS_]);sheet.setFrozenRows(1);}
 if(!sheet)return null;
 const header=sheet.getRange(1,1,1,INSPECT_HEADERS_.length).getValues()[0];
 if(!header[10]&&create){sheet.getRange(1,11).setValue(INSPECT_HEADERS_[10]);header[10]=INSPECT_HEADERS_[10];}
 if(!INSPECT_HEADERS_.every((h,i)=>(i===10&&!header[i])||h===String(header[i]).trim()))throw new Error('หัวตาราง InspectorReviews ไม่ตรงกับระบบ');
 return sheet;
}
function inspectionMap_(){
 const sheet=inspectionSheet_(false),map=new Map();
 if(sheet&&sheet.getLastRow()>1)sheet.getRange(2,1,sheet.getLastRow()-1,INSPECT_HEADERS_.length).getValues().forEach(row=>{
  if(row[0]&&row[5]&&row[6]&&['ผ่าน','ไม่ผ่าน'].includes(String(row[9])))map.set(String(row[0]),{submittedAt:row[4] instanceof Date?row[4].toISOString():String(row[4]),submittedBy:String(row[3]),photo1:String(row[5]),photo2:String(row[6]),verdict:String(row[9]),comment:String(row[10]||'')});
 });
 return map;
}
function saveInspection(input,requestId,token){
 denyContractor_(token);
 const email=user_(token);
 if(!input||!['ผ่าน','ไม่ผ่าน'].includes(input.verdict))throw new Error('ผลตรวจไม่ถูกต้อง');
 if(!input||typeof input!=='object'||typeof input.recordId!=='string'||!input.recordId||input.recordId.length>100)throw new Error('งานไม่ถูกต้อง');
 if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new Error('รหัสคำขอไม่ถูกต้อง');
 const comment=input.comment===undefined?'':input.comment;if(typeof comment!=='string'||comment.length>2000)throw new Error('หมายเหตุการตรวจรับต้องไม่เกิน 2000 ตัวอักษร');
 const photos=photos_({before:input.photo1,after:input.photo2});
 if(!photos.before||!photos.after)throw new Error('กรุณาแนบรูปตรวจรับงานให้ครบ 2 รูป');
 const fingerprint=Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(comment?[input.recordId,photos,input.verdict,comment]:[input.recordId,photos,input.verdict])));
 const lock=LockService.getScriptLock();lock.waitLock(30000);const created=[];
 try{
  const data=sheet_(),rows=data.getLastRow()>1?data.getRange(2,1,data.getLastRow()-1,HEADERS_.length).getValues():[];
  const index=rows.findIndex(row=>String(row[0])===input.recordId);
  if(index<0)throw new Error('ไม่พบงานสำรวจใน DATA กรุณาโหลดข้อมูลใหม่');
  if(rows.filter(row=>String(row[0])===input.recordId).length!==1)throw new Error('Record ID ซ้ำใน DATA กรุณาให้ผู้ดูแลตรวจสอบ');
  const work=readRow_(rows[index]);if(!work.wbs.trim()||!work.pea.trim())throw new Error('งานนี้ไม่มี WBS หรือ PEA กรุณาให้ผู้สำรวจเติมข้อมูลก่อน');
  const sheet=inspectionSheet_(true),previous=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,INSPECT_HEADERS_.length).getValues():[];
  const duplicate=previous.find(row=>String(row[7])===requestId);
  if(duplicate){
   if(String(duplicate[0])!==input.recordId||String(duplicate[3])!==email||String(duplicate[8])!==fingerprint)throw new Error('รหัสคำขอเดิมมีข้อมูลเปลี่ยน');
   const latest=previous.filter(row=>String(row[0])===input.recordId).pop();setInspectionPhotoLinks_(data,index+2,String(latest[5]),String(latest[6]));data.getRange(index+2,14).setValue(String(latest[9]));SpreadsheetApp.flush();return {id:input.recordId,submittedAt:String(latest[4]),submittedBy:String(latest[3]),photo1:String(latest[5]),photo2:String(latest[6]),verdict:String(latest[9]),comment:String(latest[10]||'')};
  }
  const folderId=PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID');if(!folderId)throw new Error('ผู้ดูแลต้องตั้ง PHOTO_FOLDER_ID และแชร์โฟลเดอร์ให้ช่างผู้ควบคุมงาน');
  const folder=DriveApp.getFolderById(folderId),urls=[];
  const label=work.pea.replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,'_').slice(0,100);
  [photos.before,photos.after].forEach((image,i)=>{
   const blob=Utilities.newBlob(Utilities.base64Decode(image.split(',')[1]),'image/jpeg',label+'_ตรวจรับ'+(i+1)+'_'+requestId+'.jpg');
   const file=folder.createFile(blob);created.push(file);urls.push(file.getUrl());
  });
  const now=new Date().toISOString(),safe=v=>/^[=+\-@]/.test(String(v))?"'"+v:String(v);
  const values=[work.id,work.wbs,work.pea,email,now,urls[0],urls[1],requestId,fingerprint,input.verdict,comment];
  const range=sheet.getRange(sheet.getLastRow()+1,1,1,INSPECT_HEADERS_.length);range.setNumberFormat('@');range.setValues([values.map(safe)]);
  // Keep files after the durable delivery row; a retry recovers a failed DATA status update.
  created.length=0;
  setInspectionPhotoLinks_(data,index+2,urls[0],urls[1]);data.getRange(index+2,14).setValue(input.verdict);SpreadsheetApp.flush();
  return {id:work.id,submittedAt:now,photo1:urls[0],photo2:urls[1],submittedBy:email,verdict:input.verdict,comment};
 }catch(e){created.forEach(file=>{try{file.setTrashed(true)}catch(ignore){}});throw e;}
 finally{lock.releaseLock();}
}

function syncInspectionPhotos(token){
 maintenanceUser_(token);const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  const data=sheet_(),deliveries=inspectionMap_();let updated=0,conflicts=0;
  if(data.getLastRow()>1){
   const rows=data.getRange(2,1,data.getLastRow()-1,48).getValues();
   const counts=new Map();rows.forEach(row=>counts.set(String(row[0]),(counts.get(String(row[0]))||0)+1));
   rows.forEach((row,i)=>{
    const id=String(row[0]),delivery=deliveries.get(id);if(!delivery)return;
    const target=[delivery.photo1,delivery.photo2],current=[row[46]||'',row[47]||''];
    if(counts.get(id)!==1||current.some((url,j)=>url&&url!==target[j])){conflicts++;return;}
    if(current.some((url,j)=>url!==target[j])){setInspectionPhotoLinks_(data,i+2,...target);updated++;}
   });
  }
  SpreadsheetApp.flush();const result={updated,conflicts};console.log(JSON.stringify(result));return result;
 }finally{lock.releaseLock();}
}


// Resolve only photo links recorded for this work; never accept arbitrary Drive IDs.
function getWorkPhoto(recordId,kind,index,token){
 user_(token);if(typeof recordId!=='string'||!['delivery','inspection','survey'].includes(kind)||![1,2].includes(index))throw new Error('คำขอรูปไม่ถูกต้อง');
 const item=kind==='survey'?listPatrol(token).find(r=>r.id===recordId):(kind==='delivery'?deliveryMap_():inspectionMap_()).get(recordId);
 if(!item)throw new Error('ไม่พบรูปของงานนี้');
 const url=kind==='survey'?item[index===1?'before':'after']:item[index===1?'photo1':'photo2'];
 const match=/^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/.exec(url);
 if(!match)throw new Error('ลิงก์รูปไม่ถูกต้อง');
 const blob=DriveApp.getFileById(match[1]).getBlob(),bytes=blob.getBytes();
 if(blob.getContentType()!=='image/jpeg'||bytes.length>2100000)throw new Error('ไม่สามารถแสดงรูปนี้ในเว็บ กรุณาเปิดลิงก์ Drive');
 return 'data:image/jpeg;base64,'+Utilities.base64Encode(bytes);
}

function denyContractor_(token){if(accountSession_(token).role==='contractor')throw new Error('สิทธิ์ผู้รับจ้างใช้งานได้เฉพาะส่งมอบงาน');}
