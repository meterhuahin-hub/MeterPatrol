const SPREADSHEET_ID_='1DydK1q8PZELyk2gTFmtxxiUtgSz6EYxRncw1Ep7JDSg';
const TEXT_KEYS_=['surveyDate','wbs','poleSize','jobType','latlong','surveyResult','transformer','pole','pea','phase','machine','note','patrolJob','electricityOffice','address','customerName','customerCa','budgetYear'];
const NUMBER_KEYS_=['old_wood_20','old_wood_60','old_wood_120',"old_bolt_8in", "old_bolt_10in", "old_bolt_12in", "old_bolt_14in", "old_bolt_16in", "old_bolt_18in", "old_bolt_แหวน", "old_wire_สีฟ้า", "old_wire_สีดำ", "old_wire_2x6", "old_wire_2x10", "old_wire_25", "old_wire_50", "new_bolt_8in", "new_bolt_10in", "new_bolt_12in", "new_bolt_14in", "new_bolt_16in", "new_bolt_18in", "new_bolt_แหวน", "wood_20", "wood_60", "wood_120", "new_wire_2x10", "new_wire_50", "old_cab", "new_cab"];
const HEADERS_=["Record ID", "บันทึกเมื่อ", "วันที่", "หมายเลขงาน WBS", "หม้อแปลง TR", "เสาที่", "PEA.", "ขนาด/เฟส", "เครื่อง", "ขนาดเสา", "ประเภทงาน", "Latitude", "Longitude", "ผลสำรวจ", "เก่า-น็อต 8\"", "เก่า-น็อต 10\"", "เก่า-น็อต 12\"", "เก่า-น็อต 14\"", "เก่า-น็อต 16\"", "เก่า-น็อต 18\"", "เก่า-แหวน", "เก่า-สายไฟสีฟ้า", "เก่า-สายไฟสีดำ", "เก่า-สายไฟ 2x6", "เก่า-สายไฟ 2x10", "เก่า-สายไฟ 25", "เก่า-สายไฟ 50", "เก่า-ตู้", "เก่า-ไม้แป้น 20", "เก่า-ไม้แป้น 60", "เก่า-ไม้แป้น 120", "ใหม่-น็อต 8\"", "ใหม่-น็อต 10\"", "ใหม่-น็อต 12\"", "ใหม่-น็อต 14\"", "ใหม่-น็อต 16\"", "ใหม่-น็อต 18\"", "ใหม่-แหวน", "ใหม่-แป้นไม้ 20", "ใหม่-แป้นไม้ 60", "ใหม่-แป้นไม้ 120", "ใหม่-สายไฟ 2x10", "ใหม่-สายไฟ 50", "ใหม่-ตู้", "หมายเหตุ", "รูปก่อน", "รูปหลัง"];
const DATA_KEYS_=["id", "date", "surveyDate", "wbs", "transformer", "pole", "pea", "phase", "machine", "poleSize", "jobType", "latitude", "longitude", "surveyResult", "old_bolt_8in", "old_bolt_10in", "old_bolt_12in", "old_bolt_14in", "old_bolt_16in", "old_bolt_18in", "old_bolt_แหวน", "old_wire_สีฟ้า", "old_wire_สีดำ", "old_wire_2x6", "old_wire_2x10", "old_wire_25", "old_wire_50", "old_cab", "old_wood_20", "old_wood_60", "old_wood_120", "new_bolt_8in", "new_bolt_10in", "new_bolt_12in", "new_bolt_14in", "new_bolt_16in", "new_bolt_18in", "new_bolt_แหวน", "wood_20", "wood_60", "wood_120", "new_wire_2x10", "new_wire_50", "new_cab", "note", "before", "after"];
function googleUser_(){
 const email=String(Session.getActiveUser().getEmail()||'').trim().toLowerCase();
 const allowed=String(PropertiesService.getScriptProperties().getProperty('ALLOWED_EMAILS')||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!email||!allowed.includes(email))throw new Error('บัญชีนี้ไม่ได้รับอนุญาต กรุณาตรวจ ALLOWED_EMAILS และตั้ง Execute as: User accessing the web app');
 return email;
}
function user_(token){accountSession_(token);return googleUser_();}
function doGet(){
 try{googleUser_();return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('งานปรับปรุง WBS และ Patrol').addMetaTag('viewport','width=device-width, initial-scale=1');}
 catch(e){return HtmlService.createHtmlOutput('<h1>งานปรับปรุง WBS</h1><p>กรุณาใช้บัญชี Google ที่ผู้ดูแลอนุญาต และตรวจการตั้งค่า deployment</p>');}
}
function include_(name){return HtmlService.createHtmlOutputFromFile(name).getContent();}
function sheet_(){
 const book=SpreadsheetApp.openById(SPREADSHEET_ID_);
 let sheet=book.getSheetByName('DATA');
 if(!sheet){sheet=book.insertSheet('DATA');sheet.getRange(1,1,1,HEADERS_.length).setValues([HEADERS_]);sheet.setFrozenRows(1);}
 migrateOldWoodColumns_(sheet);
 const headers=sheet.getRange(1,1,1,HEADERS_.length).getValues()[0].map(v=>String(v).replace(/\s+/g,' ').trim());
 if(!HEADERS_.every((v,i)=>headers[i]===v))throw new Error('หัวตาราง DATA ไม่ตรงกับระบบ ห้ามเขียนทับข้อมูล กรุณาติดต่อผู้ดูแล');
 ensureWorkPhotoColumns_(sheet);
 ensureInspectionPhotoColumns_(sheet);
 ensureSurveyExtraColumns_(sheet);
 ensureDeletedColumn_(sheet);
 ensureAddressColumn_(sheet);
 ensurePatrolCustomerColumns_(sheet);
 ensureBudgetYearColumn_(sheet);
 return sheet;
}
function ensureWorkPhotoColumns_(sheet){
 const max=sheet.getMaxColumns();if(max<49)sheet.insertColumnsAfter(max,49-max);
 const range=sheet.getRange(1,48,1,2),header=range.getValues()[0];
 const names=['รูปปฏิบัติงาน 1','รูปปฏิบัติงาน 2'];
 if(header.some((v,i)=>String(v).trim()!==''&&String(v).trim()!==names[i]))throw new Error('คอลัมน์ AV/AW มีหัวตารางอื่นอยู่ ระบบจะไม่เขียนทับ');
 if(header.some(v=>String(v).trim()==='')){
  if(sheet.getLastRow()>1){const values=sheet.getRange(2,48,sheet.getLastRow()-1,2).getValues();if(values.some(row=>row.some((v,i)=>!String(header[i]).trim()&&v!==''&&v!==null&&v!==undefined)))throw new Error('AV/AW มีข้อมูลแต่ไม่มีหัวตาราง กรุณาตรวจสอบก่อน');}
  range.setValues([names]);
 }
}
function ensureInspectionPhotoColumns_(sheet){
 const max=sheet.getMaxColumns();if(max<51)sheet.insertColumnsAfter(max,51-max);
 const range=sheet.getRange(1,50,1,2),header=range.getValues()[0];
 const names=['ดูรูปตรวจรับ 1','ดูรูปตรวจรับ 2'];
 if(header.some((v,i)=>String(v).trim()!==''&&String(v).trim()!==names[i]))throw new Error('คอลัมน์ AX/AY มีหัวตารางอื่นอยู่ ระบบจะไม่เขียนทับ');
 if(header.some(v=>String(v).trim()==='')){
  if(sheet.getLastRow()>1){const values=sheet.getRange(2,50,sheet.getLastRow()-1,2).getValues();if(values.some(row=>row.some((v,i)=>!String(header[i]).trim()&&v!==''&&v!==null&&v!==undefined)))throw new Error('AX/AY มีข้อมูลแต่ไม่มีหัวตาราง กรุณาตรวจสอบก่อน');}
  range.setValues([names]);
 }
}
function setInspectionPhotoLinks_(sheet,row,photo1,photo2){
 sheet.getRange(row,50,1,2).setValues([[photo1,photo2]]);
}
function setWorkPhotoLinks_(sheet,row,photo1,photo2){
 sheet.getRange(row,48,1,2).setValues([[photo1,photo2]]);
}
function ensureSurveyExtraColumns_(sheet){const max=sheet.getMaxColumns();if(max<53)sheet.insertColumnsAfter(max,53-max);const range=sheet.getRange(1,52,1,2),header=range.getValues()[0],names=['งาน Patrol','กฟฟ.'];if(header.some((v,i)=>String(v).trim()&&String(v).trim()!==names[i]))throw new Error('คอลัมน์ AZ/BA มีหัวตารางอื่น ระบบจะไม่เขียนทับ');if(header.some(v=>!String(v).trim())){if(sheet.getLastRow()>1&&sheet.getRange(2,52,sheet.getLastRow()-1,2).getValues().some(row=>row.some((v,i)=>!String(header[i]).trim()&&v!==''&&v!==null&&v!==undefined)))throw new Error('AZ/BA มีข้อมูลแต่ไม่มีหัวตาราง กรุณาตรวจสอบ');range.setValues([names]);}}
function validate_(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('ข้อมูลไม่ถูกต้อง');
 const r={};
 TEXT_KEYS_.forEach(k=>{const v=input[k]===undefined?'':input[k];if(typeof v!=='string'||v.length>2000)throw new Error('ข้อความไม่ถูกต้องหรือยาวเกินไป');r[k]=v.trim();});
 if(r.budgetYear&&!/^[12]\d{3}$/.test(r.budgetYear))throw new Error('ปีงบประมาณต้องเป็นปี ค.ศ. 4 หลัก');if(!r.wbs)r.budgetYear='';
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
 r.date=storedDateToCE_(r.date);r.surveyDate=storedDateToCE_(r.surveyDate);r.budgetYear=storedYearToCE_(row[57]);r.customerName=String(row[55]||'');r.customerCa=String(row[56]||'');r.address=String(row[54]||'');r.patrolJob=String(row[51]||'');r.electricityOffice=String(row[52]||'');
 r.latlong=r.latitude!==''&&r.longitude!==''?r.latitude+','+r.longitude:'';
 return r;
}
function listPatrol(token){
 const account=accountSession_(token);googleUser_();const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{const sheet=sheet_();if(sheet.getLastRow()<2)return [];const deliveries=deliveryMap_(),transfers=transferMap_(),inspections=inspectionMap_(deliveries,transfers);return sheet.getRange(2,1,sheet.getLastRow()-1,58).getValues().filter(row=>!row[53]).filter(row=>row.some(v=>v!==''&&v!==null)).map(readRow_).map(r=>{const delivery=deliveries.get(r.id);return Object.assign(r,{delivery:delivery||null,inspection:inspections.get(r.id)||null,transfer:transfers.get(r.id)||null});}).filter(r=>canAccessWork_(account,r)).reverse();}
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
  const values=DATA_KEYS_.map(key=>key==='date'||key==='surveyDate'?storedDateToBE_(r[key]):r[key]);
  const rowIndex=sheet.getLastRow()+1;
  const range=sheet.getRange(rowIndex,1,1,58);range.setNumberFormat('@');range.setValues([[...values.map(safe),'','','','',safe(clean.patrolJob),safe(clean.electricityOffice),'',safe(clean.address),safe(clean.customerName),safe(clean.customerCa),safe(storedYearToBE_(clean.budgetYear))]]);
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
  if(row[0]&&row[5]&&row[6])map.set(String(row[0]),{submittedAt:row[4] instanceof Date?row[4].toISOString():String(row[4]),submittedBy:String(row[3]),photo1:String(row[5]),photo2:String(row[6]),requestId:String(row[7])});
 });
 return map;
}
function completeContractorWork(input,requestId,token){
 const scopedAccount=accountSession_(token);
 const email=user_(token);
 if(!input||typeof input!=='object'||typeof input.recordId!=='string'||!input.recordId||input.recordId.length>100)throw new Error('งานไม่ถูกต้อง');
 if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new Error('รหัสคำขอไม่ถูกต้อง');
 const photos=photos_({before:input.photo1,after:input.photo2});
 if(!photos.before||!photos.after)throw new Error('กรุณาแนบรูปปฏิบัติงานให้ครบ 2 รูป');
 const fingerprint=Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify([input.recordId,photos])));
 const lock=LockService.getScriptLock();lock.waitLock(30000);const created=[];
 try{
  const data=sheet_(),rows=data.getLastRow()>1?data.getRange(2,1,data.getLastRow()-1,57).getValues():[];
  const index=rows.findIndex(row=>String(row[0])===input.recordId);
  if(index<0||rows[index][53])throw new Error('ไม่พบงานสำรวจ หรือรายการถูกลบแล้ว กรุณาโหลดข้อมูลใหม่');
  if(rows.filter(row=>String(row[0])===input.recordId).length!==1)throw new Error('Record ID ซ้ำใน DATA กรุณาให้ผู้ดูแลตรวจสอบ');
  const work=readRow_(rows[index]);if(!canAccessWork_(scopedAccount,work))throw new Error('ไม่มีสิทธิ์ทำงานประเภทนี้');if((!work.wbs.trim()&&!work.patrolJob.trim())||!work.pea.trim())throw new Error('งานนี้ต้องมี WBS หรืองาน Patrol และ PEA');
  const sheet=workSheet_(true),previous=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,WORK_HEADERS_.length).getValues():[];
  const duplicate=previous.find(row=>String(row[7])===requestId);
  if(duplicate){
   if(String(duplicate[0])!==input.recordId||String(duplicate[3])!==email||String(duplicate[8])!==fingerprint)throw new Error('รหัสคำขอเดิมมีข้อมูลเปลี่ยน');
   const latest=previous.filter(row=>String(row[0])===input.recordId).pop();setWorkPhotoLinks_(data,index+2,String(latest[5]),String(latest[6]));data.getRange(index+2,14).setValue((inspectionMap_().get(input.recordId)||{}).verdict||'ส่งมอบงาน');SpreadsheetApp.flush();return {id:input.recordId,submittedAt:String(latest[4]),photo1:String(latest[5]),photo2:String(latest[6])};
  }
  if(previous.some(row=>String(row[0])===input.recordId)&&(inspectionMap_().get(input.recordId)||{}).verdict!=='ไม่ผ่าน')throw new Error('งานนี้ส่งมอบแล้ว ส่งแก้ไขได้เฉพาะงานตรวจไม่ผ่าน');
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
   const rows=data.getRange(2,1,data.getLastRow()-1,49).getValues();
   const counts=new Map();rows.forEach(row=>counts.set(String(row[0]),(counts.get(String(row[0]))||0)+1));
   rows.forEach((row,i)=>{
    const id=String(row[0]),delivery=deliveries.get(id);if(!delivery)return;
    const target=[delivery.photo1,delivery.photo2],current=[row[47]||'',row[48]||''];
    if(counts.get(id)!==1||current.some((url,j)=>url&&url!==target[j])){conflicts++;return;}
    if(current.some((url,j)=>url!==target[j])){setWorkPhotoLinks_(data,i+2,...target);updated++;}
   });
  }
  SpreadsheetApp.flush();const result={updated,conflicts};console.log(JSON.stringify(result));return result;
 }finally{lock.releaseLock();}
}

const INSPECT_HEADERS_=['Record ID','WBS','PEA.','ผู้ตรวจ','ตรวจเมื่อ','รูปตรวจรับ 1','รูปตรวจรับ 2','รหัสคำขอ','Fingerprint','ผลตรวจ','หมายเหตุการตรวจรับ','รหัสส่งมอบที่ตรวจ'];
function inspectionSheet_(create){
 const book=SpreadsheetApp.openById(SPREADSHEET_ID_);let sheet=book.getSheetByName('InspectorReviews');
 if(!sheet&&create){sheet=book.insertSheet('InspectorReviews');sheet.getRange(1,1,1,INSPECT_HEADERS_.length).setValues([INSPECT_HEADERS_]);sheet.setFrozenRows(1);}
 if(!sheet)return null;
 const header=sheet.getRange(1,1,1,INSPECT_HEADERS_.length).getValues()[0];
 for(const i of [10,11])if(!header[i]&&create){sheet.getRange(1,i+1).setValue(INSPECT_HEADERS_[i]);header[i]=INSPECT_HEADERS_[i];}
 if(!INSPECT_HEADERS_.every((h,i)=>(i>=10&&!header[i])||h===String(header[i]).trim()))throw new Error('หัวตาราง InspectorReviews ไม่ตรงกับระบบ');
 return sheet;
}
function inspectionMap_(existingDeliveries,existingTransfers){
 const sheet=inspectionSheet_(false),map=new Map(),deliveries=existingDeliveries||deliveryMap_(),transfers=existingTransfers||transferMap_();
 if(sheet&&sheet.getLastRow()>1)sheet.getRange(2,1,sheet.getLastRow()-1,INSPECT_HEADERS_.length).getValues().forEach(row=>{
  const transfer=transfers.get(String(row[0]));if(transfer&&transfer.ignored.includes(String(row[7])))return;const delivery=deliveries.get(String(row[0]));if(delivery&&(row[11]?String(row[11])!==delivery.requestId:new Date(delivery.submittedAt)>new Date(row[4])))return;
  if(row[0]&&['ผ่าน','ไม่ผ่าน'].includes(String(row[9])))map.set(String(row[0]),{submittedAt:row[4] instanceof Date?row[4].toISOString():String(row[4]),submittedBy:String(row[3]),photo1:String(row[5]),photo2:String(row[6]),verdict:String(row[9]),comment:String(row[10]||'')});
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

 const fingerprint=Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(comment?[input.recordId,photos,input.verdict,comment]:[input.recordId,photos,input.verdict])));
 const lock=LockService.getScriptLock();lock.waitLock(30000);const created=[];
 try{
  const data=sheet_(),rows=data.getLastRow()>1?data.getRange(2,1,data.getLastRow()-1,54).getValues():[];
  const index=rows.findIndex(row=>String(row[0])===input.recordId);
  if(index<0||rows[index][53])throw new Error('ไม่พบงานสำรวจ หรือรายการถูกลบแล้ว กรุณาโหลดข้อมูลใหม่');
  if(rows.filter(row=>String(row[0])===input.recordId).length!==1)throw new Error('Record ID ซ้ำใน DATA กรุณาให้ผู้ดูแลตรวจสอบ');
  const work=readRow_(rows[index]);if((!work.wbs.trim()&&!work.patrolJob.trim())||!work.pea.trim())throw new Error('งานนี้ต้องมี WBS หรืองาน Patrol และ PEA');
  const sheet=inspectionSheet_(true),previous=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,INSPECT_HEADERS_.length).getValues():[];
  const duplicate=previous.find(row=>String(row[7])===requestId);
  if(duplicate){
   if(String(duplicate[0])!==input.recordId||String(duplicate[3])!==email||String(duplicate[8])!==fingerprint)throw new Error('รหัสคำขอเดิมมีข้อมูลเปลี่ยน');
   const latest=previous.filter(row=>String(row[0])===input.recordId).pop();setInspectionPhotoLinks_(data,index+2,String(latest[5]),String(latest[6]));data.getRange(index+2,14).setValue((inspectionMap_().get(input.recordId)||{}).verdict||'ส่งมอบงาน');SpreadsheetApp.flush();return {id:input.recordId,submittedAt:String(latest[4]),submittedBy:String(latest[3]),photo1:String(latest[5]),photo2:String(latest[6]),verdict:String(latest[9]),comment:String(latest[10]||'')};
  }
  const folderId=PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID');if((photos.before||photos.after)&&!folderId)throw new Error('ผู้ดูแลต้องตั้ง PHOTO_FOLDER_ID และแชร์โฟลเดอร์ให้ช่างผู้ควบคุมงาน');
  const folder=(photos.before||photos.after)?DriveApp.getFolderById(folderId):null,urls=[];
  const label=work.pea.replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g,'_').slice(0,100);
  [photos.before,photos.after].forEach((image,i)=>{if(!image){urls.push('');return;}
   const blob=Utilities.newBlob(Utilities.base64Decode(image.split(',')[1]),'image/jpeg',label+'_ตรวจรับ'+(i+1)+'_'+requestId+'.jpg');
   const file=folder.createFile(blob);created.push(file);urls.push(file.getUrl());
  });
  const now=new Date().toISOString(),safe=v=>/^[=+\-@]/.test(String(v))?"'"+v:String(v);
  const values=[work.id,work.wbs,work.pea,email,now,urls[0],urls[1],requestId,fingerprint,input.verdict,comment,(deliveryMap_().get(work.id)||{}).requestId||''];
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
   const rows=data.getRange(2,1,data.getLastRow()-1,51).getValues();
   const counts=new Map();rows.forEach(row=>counts.set(String(row[0]),(counts.get(String(row[0]))||0)+1));
   rows.forEach((row,i)=>{
    const id=String(row[0]),delivery=deliveries.get(id);if(!delivery)return;
    const target=[delivery.photo1,delivery.photo2],current=[row[49]||'',row[50]||''];
    if(counts.get(id)!==1||current.some((url,j)=>url&&url!==target[j])){conflicts++;return;}
    if(current.some((url,j)=>url!==target[j])){setInspectionPhotoLinks_(data,i+2,...target);updated++;}
   });
  }
  SpreadsheetApp.flush();const result={updated,conflicts};console.log(JSON.stringify(result));return result;
 }finally{lock.releaseLock();}
}


// Resolve only photo links recorded for this work; never accept arbitrary Drive IDs.
function authorizedPhotoUrls_(recordId,kind,token){const account=accountSession_(token);googleUser_();if(typeof recordId!=='string'||!['delivery','inspection','survey'].includes(kind))throw new Error('คำขอรูปไม่ถูกต้อง');const sheet=sheet_(),ids=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues():[],matches=ids.map((row,i)=>({id:String(row[0]),index:i})).filter(r=>r.id===recordId);if(matches.length!==1)throw new Error('ไม่พบงานหรือไม่มีสิทธิ์ดูรูป');const row=sheet.getRange(matches[0].index+2,1,1,58).getValues()[0],record=readRow_(row);if(row[53]||!canAccessWork_(account,record))throw new Error('ไม่พบงานหรือไม่มีสิทธิ์ดูรูป');if(kind==='survey')return [record.before,record.after];const item=(kind==='delivery'?deliveryMap_():inspectionMap_()).get(recordId);if(!item)throw new Error('ไม่พบรูปของงานนี้');return [item.photo1,item.photo2];}
function photoDataFromUrl_(url){const match=/^https:\/\/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/.exec(url||'');if(!match)throw new Error('ไม่มีรูปหรือลิงก์รูปไม่ถูกต้อง');const blob=DriveApp.getFileById(match[1]).getBlob(),bytes=blob.getBytes();if(blob.getContentType()!=='image/jpeg'||bytes.length>2100000)throw new Error('ไม่สามารถแสดงรูปนี้ในเว็บ กรุณาเปิดลิงก์ Drive');return 'data:image/jpeg;base64,'+Utilities.base64Encode(bytes);}
function getWorkPhoto(recordId,kind,index,token){if(![1,2].includes(index))throw new Error('คำขอรูปไม่ถูกต้อง');return photoDataFromUrl_(authorizedPhotoUrls_(recordId,kind,token)[index-1]);}
function getWorkPhotos(recordId,kind,token){const urls=authorizedPhotoUrls_(recordId,kind,token);return urls.map(url=>{try{return url?photoDataFromUrl_(url):null;}catch(error){return {error:error.message};}});}

function denyContractor_(token){if(accountSession_(token).role==='contractor')throw new Error('สิทธิ์ผู้รับจ้างใช้งานได้เฉพาะส่งมอบงาน');}

function ensureDeletedColumn_(sheet){const max=sheet.getMaxColumns();if(max<54)sheet.insertColumnsAfter(max,54-max);const cell=sheet.getRange(1,54),header=String(cell.getValues()[0][0]||'').trim();if(header&&header!=='ข้อมูลการลบ')throw new Error('คอลัมน์ BB มีหัวตารางอื่น ระบบจะไม่เขียนทับ');if(!header){if(sheet.getLastRow()>1&&sheet.getRange(2,54,sheet.getLastRow()-1,1).getValues().some(row=>row[0]!==''&&row[0]!==null&&row[0]!==undefined))throw new Error('BB มีข้อมูลแต่ไม่มีหัวตาราง กรุณาตรวจสอบ');cell.setValues([['ข้อมูลการลบ']]);}}
function deletePatrol(recordId,token){admin_(token);googleUser_();if(typeof recordId!=='string'||!recordId||recordId.length>100)throw new Error('รหัสงานไม่ถูกต้อง');const lock=LockService.getScriptLock();lock.waitLock(30000);try{admin_(token);const sheet=sheet_(),rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,58).getValues():[],matches=rows.map((row,i)=>({row,index:i})).filter(item=>String(item.row[0])===recordId);if(matches.length>1)throw new Error('Record ID ซ้ำ กรุณาตรวจสอบ');for(const ledger of [workSheet_(false),inspectionSheet_(false),transferSheet_(false)]){if(!ledger||ledger.getLastRow()<2)continue;const ids=ledger.getRange(2,1,ledger.getLastRow()-1,1).getValues();for(let i=ids.length-1;i>=0;i--)if(String(ids[i][0])===recordId)ledger.deleteRow(i+2);}if(matches.length)sheet.deleteRow(matches[0].index+2);SpreadsheetApp.flush();return {id:recordId};}finally{lock.releaseLock();}}
function updatePatrol(recordId,input,expected,token){
 denyContractor_(token);const email=user_(token),clean=validate_(input),photos=photos_(input);if(typeof recordId!=='string'||!recordId||!expected)throw new Error('คำขอแก้ไขไม่ถูกต้อง');const lock=LockService.getScriptLock();lock.waitLock(30000);const created=[];
 try{const sheet=sheet_(),rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,58).getValues():[],matches=rows.map((row,i)=>({row,index:i})).filter(item=>String(item.row[0])===recordId);if(matches.length!==1||matches[0].row[53])throw new Error('ไม่พบงานหรือรายการถูกลบ');const item=matches[0],old=readRow_(item.row),keys=[...DATA_KEYS_,'patrolJob','electricityOffice','address','customerName','customerCa','budgetYear'];if(keys.some(k=>String(old[k])!==String(expected[k])))throw new Error('งานมีการเปลี่ยนแปลง กรุณาโหลดข้อมูลใหม่ก่อนแก้ไข');
 const r=Object.assign({},old,clean,{id:old.id,date:old.date,surveyResult:old.surveyResult,before:old.before,after:old.after});const coords=clean.latlong?clean.latlong.split(',').map(v=>Number(v.trim())):['',''];r.latitude=coords[0];r.longitude=coords[1];if(photos.before||photos.after){const folderId=PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID');if(!folderId)throw new Error('ต้องตั้ง PHOTO_FOLDER_ID ก่อนแนบรูป');const folder=DriveApp.getFolderById(folderId);for(const key of ['before','after'])if(photos[key]){const file=folder.createFile(Utilities.newBlob(Utilities.base64Decode(photos[key].split(',')[1]),'image/jpeg',photoName_(clean.pea,key,Utilities.getUuid())));created.push(file);r[key]=file.getUrl();}}
 const safe=v=>typeof v==='number'?v:(/^[=+\-@]/.test(String(v))?"'"+v:String(v));const values=[...DATA_KEYS_.map(k=>safe(k==='date'||k==='surveyDate'?storedDateToBE_(r[k]):r[k])),...item.row.slice(47,51),safe(r.patrolJob),safe(r.electricityOffice),item.row[53]||'',safe(r.address),safe(r.customerName),safe(r.customerCa),safe(storedYearToBE_(r.budgetYear))];sheet.getRange(item.index+2,1,1,58).setValues([values]);created.length=0;sheet.getRange(item.index+2,1).setNote(JSON.stringify({recordedBy:email,editedAt:new Date().toISOString()}));SpreadsheetApp.flush();return {id:recordId};
 }catch(e){created.forEach(file=>{try{file.setTrashed(true)}catch(ignore){}});throw e;}finally{lock.releaseLock();}
}

function ensureAddressColumn_(sheet){const max=sheet.getMaxColumns();if(max<55)sheet.insertColumnsAfter(max,55-max);const cell=sheet.getRange(1,55),header=String(cell.getValues()[0][0]||'').trim();if(header&&header!=='ที่อยู่')throw new Error('คอลัมน์ BC มีหัวตารางอื่น ระบบจะไม่เขียนทับ');if(!header){if(sheet.getLastRow()>1&&sheet.getRange(2,55,sheet.getLastRow()-1,1).getValues().some(row=>row[0]!==''&&row[0]!==null&&row[0]!==undefined))throw new Error('BC มีข้อมูลแต่ไม่มีหัวตาราง กรุณาตรวจสอบ');cell.setValues([['ที่อยู่']]);}}

function ensurePatrolCustomerColumns_(sheet){const max=sheet.getMaxColumns();if(max<57)sheet.insertColumnsAfter(max,57-max);const range=sheet.getRange(1,56,1,2),headers=range.getValues()[0],names=['ชื่อผู้ใช้ไฟ','หมายเลขผู้ใช้ไฟ CA'];if(headers.some((v,i)=>String(v).trim()&&String(v).trim()!==names[i]))throw new Error('คอลัมน์ BD/BE มีหัวตารางอื่น ระบบจะไม่เขียนทับ');if(headers.some(v=>!String(v).trim())){if(sheet.getLastRow()>1&&sheet.getRange(2,56,sheet.getLastRow()-1,2).getValues().some(row=>row.some((v,i)=>!String(headers[i]).trim()&&v!==''&&v!==null&&v!==undefined)))throw new Error('BD/BE มีข้อมูลแต่ไม่มีหัวตาราง กรุณาตรวจสอบ');range.setValues([names]);}}

function storedDateToBE_(value){if(value instanceof Date)value=value.toISOString();return String(value||'').replace(/^(\d{4})(?=-)/,year=>Number(year)<2400?String(Number(year)+543):year);}
function storedDateToCE_(value){return String(value||'').replace(/^(\d{4})(?=-)/,year=>Number(year)>=2400?String(Number(year)-543):year);}
function storedYearToBE_(value){const text=String(value||'');return /^\d{4}$/.test(text)&&Number(text)<2400?String(Number(text)+543):text;}
function storedYearToCE_(value){const text=String(value||'');return /^\d{4}$/.test(text)&&Number(text)>=2400?String(Number(text)-543):text;}
function convertDataDatesToBE_(sheet){if(sheet.getLastRow()<2)return;const count=sheet.getLastRow()-1,dateRange=sheet.getRange(2,2,count,2),dates=dateRange.getValues(),converted=dates.map(row=>row.map((v,i)=>storedDateToBE_(v instanceof Date?(i===1?Utilities.formatDate(v,'Asia/Bangkok','yyyy-MM-dd'):v.toISOString()):v)));if(dates.some((row,i)=>row.some((v,j)=>String(v)!==converted[i][j]))){dateRange.setNumberFormat('@');dateRange.setValues(converted);}const years=sheet.getRange(2,58,count,1),values=years.getValues(),newValues=values.map(row=>[storedYearToBE_(row[0])]);if(values.some((row,i)=>String(row[0])!==newValues[i][0])){years.setNumberFormat('@');years.setValues(newValues);}}
function ensureBudgetYearColumn_(sheet){const max=sheet.getMaxColumns();if(max<58)sheet.insertColumnsAfter(max,58-max);const cell=sheet.getRange(1,58),header=String(cell.getValues()[0][0]||'').trim();if(header&&!['ปีงบประมาณของงาน (ค.ศ.)','ปีงบประมาณของงาน (พ.ศ.)'].includes(header))throw new Error('คอลัมน์ BF มีหัวตารางอื่น ระบบจะไม่เขียนทับ');if(header==='ปีงบประมาณของงาน (พ.ศ.)')return;if(!header&&sheet.getLastRow()>1&&sheet.getRange(2,58,sheet.getLastRow()-1,1).getValues().some(row=>row[0]!==''&&row[0]!==null&&row[0]!==undefined))throw new Error('BF มีข้อมูลแต่ไม่มีหัวตาราง กรุณาตรวจสอบ');convertDataDatesToBE_(sheet);cell.setValues([['ปีงบประมาณของงาน (พ.ศ.)']]);}

function migrateOldWoodColumns_(sheet){const names=['เก่า-ไม้แป้น 20','เก่า-ไม้แป้น 60','เก่า-ไม้แป้น 120'],header=sheet.getRange(1,1,1,HEADERS_.length).getValues()[0].map(v=>String(v||'').replace(/\s+/g,' ').trim());if(names.every((v,i)=>header[28+i]===v))return;const legacy=HEADERS_.slice(0,28).concat(HEADERS_.slice(31));if(legacy.every((v,i)=>header[i]===v)){sheet.insertColumnsAfter(28,3);sheet.getRange(1,29,1,3).setValues([names]);return;}if(header.slice(28,31).every(v=>!v)&&HEADERS_.every((v,i)=>i>=28&&i<31||header[i]===v)){sheet.getRange(1,29,1,3).setValues([names]);return;}throw new Error('หัวตาราง DATA ไม่ตรงกับรุ่นที่รองรับ จึงไม่แทรกคอลัมน์เพื่อป้องกันข้อมูลผิดช่อง');}
const TRANSFER_HEADERS_=['Record ID','รหัสคำขอ','จากงาน','เป็นงาน','ผู้ส่งต่อ','DI','ส่งต่อเมื่อ','เหตุผล','รหัสผลตรวจเดิม'];
function transferSheet_(create){const book=SpreadsheetApp.openById(SPREADSHEET_ID_);let sheet=book.getSheetByName('PatrolTransfers');if(!sheet&&create){sheet=book.insertSheet('PatrolTransfers');sheet.getRange(1,1,1,TRANSFER_HEADERS_.length).setValues([TRANSFER_HEADERS_]);sheet.setFrozenRows(1);}if(sheet){const header=sheet.getRange(1,1,1,TRANSFER_HEADERS_.length).getValues()[0];if(!TRANSFER_HEADERS_.every((v,i)=>String(header[i])===v))throw new Error('หัวตาราง PatrolTransfers ไม่ตรงกับระบบ');}return sheet;}
function transferMap_(){const sheet=transferSheet_(false),map=new Map();if(sheet&&sheet.getLastRow()>1)sheet.getRange(2,1,sheet.getLastRow()-1,TRANSFER_HEADERS_.length).getValues().forEach(row=>{let ignored=[];try{ignored=JSON.parse(row[8]||'[]');}catch(e){}map.set(String(row[0]),{requestId:String(row[1]),from:String(row[2]),to:String(row[3]),by:String(row[4]),di:String(row[5]),at:String(row[6]),reason:String(row[7]),ignored});});return map;}
function transferPatrol(recordId,reason,requestId,token){const account=accountSession_(token),email=googleUser_();if(!['admin','inspector'].includes(account.role))throw new Error('เฉพาะผู้ดูแลระบบหรือช่างผู้ควบคุมงานส่งต่องานได้');if(typeof recordId!=='string'||!recordId||typeof reason!=='string'||!reason.trim()||reason.length>2000||typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new Error('กรุณาระบุเหตุผลส่งต่อ ไม่เกิน 2000 ตัวอักษร');const lock=LockService.getScriptLock();lock.waitLock(30000);try{const sheet=sheet_(),rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,58).getValues():[],matches=rows.map((row,index)=>({row,index})).filter(r=>String(r.row[0])===recordId);if(matches.length!==1||matches[0].row[53])throw new Error('ไม่พบงานหรือรายการถูกลบ');const item=matches[0],work=readRow_(item.row),audit=transferSheet_(true),previous=audit.getLastRow()>1?audit.getRange(2,1,audit.getLastRow()-1,TRANSFER_HEADERS_.length).getValues():[],duplicate=previous.find(r=>String(r[1])===requestId);if(duplicate){if(String(duplicate[0])!==recordId||String(duplicate[4])!==email||String(duplicate[7])!==reason.trim())throw new Error('คำขอส่งต่อเดิมมีข้อมูลเปลี่ยน');if(work.patrolJob==='U_CUBE ผู้รับจ้าง'&&work.surveyResult!=='ผ่าน'&&work.surveyResult!=='ไม่ผ่าน')return {id:recordId};if(work.patrolJob==='U_CUBE ผู้รับจ้าง')return {id:recordId};}else{const name=work.patrolJob.normalize('NFKC').toLowerCase().replace(/[\s_.\-\u200b-\u200d\ufeff]/g,'');if(!name.startsWith('ucubeผมต'))throw new Error('ส่งต่อได้เฉพาะงาน U_CUBE ผมต.');if(deliveryMap_().has(recordId))throw new Error('งานนี้มีประวัติส่งมอบแล้ว กรุณาตรวจสอบก่อนส่งต่อ');const reviews=inspectionSheet_(false),ignored=reviews&&reviews.getLastRow()>1?reviews.getRange(2,1,reviews.getLastRow()-1,INSPECT_HEADERS_.length).getValues().filter(r=>String(r[0])===recordId).map(r=>String(r[7])):[];const safe=v=>/^[=+\-@]/.test(String(v))?"'"+v:String(v);audit.getRange(audit.getLastRow()+1,1,1,TRANSFER_HEADERS_.length).setValues([[recordId,requestId,work.patrolJob,'U_CUBE ผู้รับจ้าง',email,account.di||'',storedDateToBE_(new Date().toISOString()),reason.trim(),JSON.stringify(ignored)].map(safe)]);}const raw=[...item.row];raw[13]='รอผู้รับจ้างดำเนินการ';raw[51]='U_CUBE ผู้รับจ้าง';raw[49]=raw[50]='';const safe=v=>typeof v==='string'&&/^[=+\-@]/.test(v)?"'"+v:v;sheet.getRange(item.index+2,1,1,58).setValues([raw.map(safe)]);SpreadsheetApp.flush();return {id:recordId};}finally{lock.releaseLock();}}
