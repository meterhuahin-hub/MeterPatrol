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
 if(r.jobType!=='รื้อถอน'&&!r.pea)throw new Error('กรุณาระบุ PEA. ยกเว้นงานประเภท รื้อถอน');
 if(!r.latlong)throw new Error('กรุณาระบุ LatLong ก่อนบันทึกงาน');
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
function authorizedPhotoUrls_(recordId,kind,token){const account=accountSession_(token);googleUser_();if(typeof recordId!=='string'||!['delivery','inspection','survey','transfer'].includes(kind))throw new Error('คำขอรูปไม่ถูกต้อง');const sheet=sheet_(),ids=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues():[],matches=ids.map((row,i)=>({id:String(row[0]),index:i})).filter(r=>r.id===recordId);if(matches.length!==1)throw new Error('ไม่พบงานหรือไม่มีสิทธิ์ดูรูป');const row=sheet.getRange(matches[0].index+2,1,1,58).getValues()[0],record=readRow_(row);if(row[53]||!canAccessWork_(account,record))throw new Error('ไม่พบงานหรือไม่มีสิทธิ์ดูรูป');if(kind==='survey')return [record.before,record.after];const item=(kind==='transfer'?transferMap_():kind==='delivery'?deliveryMap_():inspectionMap_()).get(recordId);if(!item)throw new Error('ไม่พบรูปของงานนี้');return [item.photo1,item.photo2];}
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
const TRANSFER_HEADERS_=['Record ID','รหัสคำขอ','จากงาน','เป็นงาน','ผู้ส่งต่อ','DI','ส่งต่อเมื่อ','เหตุผล','รหัสผลตรวจเดิม','รูปส่งต่อ 1','รูปส่งต่อ 2','Fingerprint รูป'];
function transferSheet_(create){const book=SpreadsheetApp.openById(SPREADSHEET_ID_);let sheet=book.getSheetByName('PatrolTransfers');if(!sheet&&create){sheet=book.insertSheet('PatrolTransfers');sheet.getRange(1,1,1,TRANSFER_HEADERS_.length).setValues([TRANSFER_HEADERS_]);sheet.setFrozenRows(1);}if(sheet){const header=sheet.getRange(1,1,1,TRANSFER_HEADERS_.length).getValues()[0];for(const i of [9,10,11])if(!header[i]){if(sheet.getLastRow()>1&&sheet.getRange(2,i+1,sheet.getLastRow()-1,1).getValues().some(r=>r[0]!==''&&r[0]!==null&&r[0]!==undefined))throw new Error('คอลัมน์รูปส่งต่อมีข้อมูลแต่ไม่มีหัวตาราง');sheet.getRange(1,i+1).setValue(TRANSFER_HEADERS_[i]);header[i]=TRANSFER_HEADERS_[i];}if(!TRANSFER_HEADERS_.every((v,i)=>String(header[i])===v))throw new Error('หัวตาราง PatrolTransfers ไม่ตรงกับระบบ');}return sheet;}
function transferMap_(){const sheet=transferSheet_(false),map=new Map();if(sheet&&sheet.getLastRow()>1)sheet.getRange(2,1,sheet.getLastRow()-1,TRANSFER_HEADERS_.length).getValues().forEach(row=>{let ignored=[];try{ignored=JSON.parse(row[8]||'[]');}catch(e){}map.set(String(row[0]),{requestId:String(row[1]),from:String(row[2]),to:String(row[3]),by:String(row[4]),di:String(row[5]),at:String(row[6]),reason:String(row[7]),photo1:String(row[9]||''),photo2:String(row[10]||''),ignored});});return map;}
function transferPatrol(recordId,reason,requestId,photoInput,token){if(typeof photoInput==='string'&&token===undefined){token=photoInput;photoInput=null;}const account=accountSession_(token),email=googleUser_();if(!['admin','inspector'].includes(account.role))throw new Error('เฉพาะผู้ดูแลระบบหรือช่างผู้ควบคุมงานส่งต่องานได้');if(typeof recordId!=='string'||!recordId||typeof reason!=='string'||!reason.trim()||reason.length>2000||typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new Error('กรุณาระบุเหตุผลส่งต่อ ไม่เกิน 2000 ตัวอักษร');const images=photos_({before:photoInput&&photoInput.photo1,after:photoInput&&photoInput.photo2}),photoFingerprint=Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(images))),created=[];const lock=LockService.getScriptLock();lock.waitLock(30000);try{const sheet=sheet_(),rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,58).getValues():[],matches=rows.map((row,index)=>({row,index})).filter(r=>String(r.row[0])===recordId);if(matches.length!==1||matches[0].row[53])throw new Error('ไม่พบงานหรือรายการถูกลบ');const item=matches[0],work=readRow_(item.row),audit=transferSheet_(true),previous=audit.getLastRow()>1?audit.getRange(2,1,audit.getLastRow()-1,TRANSFER_HEADERS_.length).getValues():[],duplicate=previous.find(r=>String(r[1])===requestId);if(duplicate){if((duplicate[11]&&String(duplicate[11])!==photoFingerprint)||(!duplicate[11]&&(images.before||images.after)))throw new Error('รูปในคำขอส่งต่อเดิมมีข้อมูลเปลี่ยน');if(String(duplicate[0])!==recordId||String(duplicate[4])!==email||String(duplicate[7])!==reason.trim())throw new Error('คำขอส่งต่อเดิมมีข้อมูลเปลี่ยน');if(work.patrolJob==='U_CUBE ผู้รับจ้าง'&&work.surveyResult!=='ผ่าน'&&work.surveyResult!=='ไม่ผ่าน')return {id:recordId};if(work.patrolJob==='U_CUBE ผู้รับจ้าง')return {id:recordId};}else{const name=work.patrolJob.normalize('NFKC').toLowerCase().replace(/[\s_.\-\u200b-\u200d\ufeff]/g,'');if(!name.startsWith('ucubeผมต'))throw new Error('ส่งต่อได้เฉพาะงาน U_CUBE ผมต.');if(deliveryMap_().has(recordId))throw new Error('งานนี้มีประวัติส่งมอบแล้ว กรุณาตรวจสอบก่อนส่งต่อ');const reviews=inspectionSheet_(false),ignored=reviews&&reviews.getLastRow()>1?reviews.getRange(2,1,reviews.getLastRow()-1,INSPECT_HEADERS_.length).getValues().filter(r=>String(r[0])===recordId).map(r=>String(r[7])):[];const reviewRows=reviews&&reviews.getLastRow()>1?reviews.getRange(2,1,reviews.getLastRow()-1,INSPECT_HEADERS_.length).getValues().filter(r=>String(r[0])===recordId):[],lastReview=reviewRows.length?reviewRows[reviewRows.length-1]:null,urls=[lastReview?String(lastReview[5]||''):'',lastReview?String(lastReview[6]||''):''];if(images.before||images.after){const folderId=PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID');if(!folderId)throw new Error('ต้องตั้ง PHOTO_FOLDER_ID เพื่อแนบรูปส่งต่อ');const folder=DriveApp.getFolderById(folderId);[images.before,images.after].forEach((image,i)=>{if(!image)return;const file=folder.createFile(Utilities.newBlob(Utilities.base64Decode(image.split(',')[1]),'image/jpeg',photoName_(work.pea,i?'after':'before',requestId).replace('.jpg','_ส่งต่อ.jpg')));created.push(file);urls[i]=file.getUrl();});}const safe=v=>/^[=+\-@]/.test(String(v))?"'"+v:String(v);audit.getRange(audit.getLastRow()+1,1,1,TRANSFER_HEADERS_.length).setValues([[recordId,requestId,work.patrolJob,'U_CUBE ผู้รับจ้าง',email,account.di||'',storedDateToBE_(new Date().toISOString()),reason.trim(),JSON.stringify(ignored),urls[0],urls[1],photoFingerprint].map(safe)]);created.length=0;}const raw=[...item.row];raw[13]='รอผู้รับจ้างดำเนินการ';raw[51]='U_CUBE ผู้รับจ้าง';raw[49]=raw[50]='';const safe=v=>typeof v==='string'&&/^[=+\-@]/.test(v)?"'"+v:v;sheet.getRange(item.index+2,1,1,58).setValues([raw.map(safe)]);SpreadsheetApp.flush();return {id:recordId};}catch(error){created.forEach(file=>{try{file.setTrashed(true)}catch(ignore){}});throw error;}finally{lock.releaseLock();}}
const REPORT_MAP_HEADERS_=['Key','WBS','TR','ปีงบประมาณ (พ.ศ.)','รูปแผนที่','ผู้บันทึก','บันทึกเมื่อ','รหัสคำขอ','Fingerprint','กลุ่มเสา A-Z','รหัสภาพในชุด'];
function reportMapSheet_(create){const book=SpreadsheetApp.openById(SPREADSHEET_ID_);let sheet=book.getSheetByName('ReportMaps');if(!sheet&&create){sheet=book.insertSheet('ReportMaps');sheet.getRange(1,1,1,REPORT_MAP_HEADERS_.length).setValues([REPORT_MAP_HEADERS_]);sheet.setFrozenRows(1);}if(sheet){const header=sheet.getRange(1,1,1,REPORT_MAP_HEADERS_.length).getValues()[0];if(!header[9]){if(sheet.getLastRow()>1&&sheet.getRange(2,10,sheet.getLastRow()-1,1).getValues().some(r=>r[0]!==''&&r[0]!==null&&r[0]!==undefined))throw new Error('คอลัมน์กลุ่มเสามีข้อมูลแต่ไม่มีหัวตาราง');sheet.getRange(1,10).setValues([['กลุ่มเสา A-Z']]);header[9]='กลุ่มเสา A-Z';}if(!header[10]){if(sheet.getLastRow()>1&&sheet.getRange(2,11,sheet.getLastRow()-1,1).getValues().some(r=>r[0]!==''&&r[0]!==null&&r[0]!==undefined))throw new Error('คอลัมน์รหัสภาพมีข้อมูลแต่ไม่มีหัวตาราง');sheet.getRange(1,11).setValues([['รหัสภาพในชุด']]);header[10]='รหัสภาพในชุด';}if(!REPORT_MAP_HEADERS_.every((v,i)=>String(header[i])===v))throw new Error('หัวตาราง ReportMaps ไม่ตรงกับระบบ');}return sheet;}
function reportMapScope_(input,account){if(!input||typeof input.wbs!=='string'||!input.wbs.trim()||input.wbs.length>2000||typeof input.tr!=='string'||input.tr.length>2000||typeof input.year!=='string'||(input.year!==''&&input.year!=='unassigned'&&!/^[12]\d{3}$/.test(input.year)))throw new Error('กรุณาเลือก WBS และตัวกรองปีที่ถูกต้องก่อนแนบแผนที่');const scope={wbs:input.wbs.trim(),tr:input.tr.trim(),year:input.year},data=sheet_(),rows=data.getLastRow()>1?data.getRange(2,1,data.getLastRow()-1,58).getValues():[];if(!['admin','inspector'].includes(account.role)&&!rows.some(row=>{if(row[53])return false;const r=readRow_(row);return r.wbs.trim()===scope.wbs&&(!scope.tr||r.transformer.trim()===scope.tr)&&(!scope.year||(scope.year==='unassigned'?!r.budgetYear:r.budgetYear===scope.year))&&canAccessWork_(account,r);}))throw new Error('ไม่พบงานใน WBS/TR/ปีนี้ หรือไม่มีสิทธิ์เข้าถึง');scope.key=Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify([scope.wbs,scope.tr,scope.year])));return scope;}
function getReportMap(input,token){const account=accountSession_(token);googleUser_();const scope=reportMapScope_(input,account),sheet=reportMapSheet_(false);if(!sheet||sheet.getLastRow()<2)return null;const row=sheet.getRange(2,1,sheet.getLastRow()-1,REPORT_MAP_HEADERS_.length).getValues().filter(r=>String(r[0])===scope.key).pop();return row?{url:String(row[4]),image:photoDataFromUrl_(String(row[4])),savedBy:String(row[5]),savedAt:String(row[6]),groups:row[9]?JSON.parse(String(row[9])):[]}:null;}
function saveReportMap(input,image,requestId,annotations,token){if(typeof annotations==='string'&&token===undefined){token=annotations;annotations=null;}const groups=validatedReportPoleGroups_(annotations);const account=accountSession_(token),email=googleUser_();if(!['admin','inspector'].includes(account.role))throw new Error('เฉพาะผู้ดูแลระบบและช่างผู้ควบคุมงานแนบแผนที่ได้');if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new Error('รหัสคำขอไม่ถูกต้อง');const photo=photos_({before:image}).before;if(!photo)throw new Error('กรุณาเลือกรูปและตัดบริเวณงานก่อน');const lock=LockService.getScriptLock();lock.waitLock(30000);let created=null;try{const scope=reportMapScope_(input,account),fingerprint=Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,groups.length?photo+JSON.stringify(groups):photo)),sheet=reportMapSheet_(true),rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,REPORT_MAP_HEADERS_.length).getValues():[],duplicate=rows.find(r=>String(r[7])===requestId);if(duplicate){if(String(duplicate[0])!==scope.key||String(duplicate[5])!==email||String(duplicate[8])!==fingerprint)throw new Error('คำขอเดิมมีข้อมูลเปลี่ยน กรุณาเลือกตัดภาพใหม่');return {url:String(duplicate[4]),image:photo};}const scopedRows=rows.filter(r=>String(r[0])===scope.key);if(input.mapSet===true){const revision=scopedRows.length?String(scopedRows[scopedRows.length-1][7]):'';if(String(input.baseRevision||'')!==revision)throw new Error('ชุดแผนที่มีภาพใหม่แล้ว กรุณาโหลดชุดล่าสุดก่อนกำหนดเสาและบันทึกอีกครั้ง');validateReportMapContinuation_(mapSetPagesFromRows_(scopedRows),groups);}const folderId=PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID');if(!folderId)throw new Error('ต้องตั้ง PHOTO_FOLDER_ID เพื่อบันทึกแผนที่');const name=('แผนที่_'+scope.wbs+'_'+(scope.tr||'ทุกTR')).replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,140)+'_'+requestId+'.jpg';created=DriveApp.getFolderById(folderId).createFile(Utilities.newBlob(Utilities.base64Decode(photo.split(',')[1]),'image/jpeg',name));const url=created.getUrl(),safe=v=>/^[=+\-@]/.test(String(v))?"'"+v:String(v);sheet.getRange(sheet.getLastRow()+1,1,1,REPORT_MAP_HEADERS_.length).setValues([[scope.key,scope.wbs,scope.tr,storedYearToBE_(scope.year),url,email,storedDateToBE_(new Date().toISOString()),requestId,fingerprint,JSON.stringify(groups),input.mapSet===true?requestId:''].map(safe)]);created=null;SpreadsheetApp.flush();return {url,image:photo,groups};}catch(error){if(created)try{created.setTrashed(true);}catch(ignore){}throw error;}finally{lock.releaseLock();}}

function validatedReportPoleGroups_(input){if(input===undefined||input===null)return [];if(!Array.isArray(input)||input.length>26)throw new Error('จำนวนกลุ่มเสาไม่ถูกต้อง');if(input.reduce((sum,g)=>sum+(g&&Array.isArray(g.points)?g.points.length:0),0)>500)throw new Error('รองรับสูงสุด 500 เสาต่อภาพ');return input.map(g=>{if(!g||typeof g.name!=='string'||!g.name.trim()||g.name.length>80||!/^#[0-9a-f]{6}$/i.test(g.color)||!Array.isArray(g.points)||g.points.length>500)throw new Error('ข้อมูลกลุ่มเสาไม่ถูกต้อง');const used=new Set();const points=g.points.map(p=>{if(!p||!/^[A-Z]{1,3}$/.test(p.label)||used.has(p.label)||typeof p.x!=='number'||typeof p.y!=='number'||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1)throw new Error('ตำแหน่งหรือตัวอักษรเสาไม่ถูกต้อง');used.add(p.label);return Object.assign({label:p.label,x:p.x,y:p.y},p.existing===true?{existing:true}:{});});return {name:g.name.trim(),color:g.color,points};});}

function reportPoleIndex_(label){if(typeof label!=='string'||!/^[A-Z]{1,3}$/.test(label))throw new Error('รหัสเสาไม่ถูกต้อง');let n=0;for(const char of label)n=n*26+char.charCodeAt(0)-64;return n-1;}
function mapSetPagesFromRows_(rows){const pages=new Map();for(const row of rows){const id=String(row[10]||'legacy');let groups=[];try{groups=JSON.parse(String(row[9]||'[]'));}catch(e){throw new Error('ข้อมูลกลุ่มเสาเดิมอ่านไม่ได้ กรุณาตรวจสอบ ReportMaps');}pages.set(id,{pageId:id,url:String(row[4]),groups,savedBy:String(row[5]),savedAt:String(row[6])});}return [...pages.values()];}
function validateReportMapContinuation_(pages,groups){const groupNames=new Set();for(const group of groups){if(groupNames.has(group.name))throw new Error('ชื่อกลุ่มเสาซ้ำในภาพเดียวกัน กรุณาใช้กลุ่มเดิม');groupNames.add(group.name);}const used=new Map();for(const page of pages)for(const group of page.groups){if(!used.has(group.name))used.set(group.name,new Set());for(const p of group.points)used.get(group.name).add(p.label);}for(const group of groups){const labels=used.get(group.name)||new Set(),maximum=Math.max(-1,...[...labels].map(reportPoleIndex_));for(const point of group.points){if(point.existing){if(!labels.has(point.label))throw new Error('ไม่พบเสาเดิม '+point.label+' ในกลุ่ม '+group.name);}else if(labels.has(point.label)||reportPoleIndex_(point.label)<=maximum)throw new Error('รหัสเสาใหม่ '+point.label+' ซ้ำกับภาพเดิม กรุณาเลือกเสาเดิมหรือโหลดชุดล่าสุด');}}}
function getReportMapSet(input,token){const account=accountSession_(token);googleUser_();const scope=reportMapScope_(input,account),sheet=reportMapSheet_(false),rows=sheet&&sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,REPORT_MAP_HEADERS_.length).getValues().filter(r=>String(r[0])===scope.key):[];return {pages:mapSetPagesFromRows_(rows),revision:rows.length?String(rows[rows.length-1][7]):''};}
function getReportMapPageImage(input,pageId,token){const set=getReportMapSet(input,token),page=set.pages.find(p=>p.pageId===pageId);if(!page)throw new Error('ไม่พบภาพในชุดแผนที่นี้');return photoDataFromUrl_(page.url);}
function listReportMapScopes(token){const account=accountSession_(token);googleUser_();const sheet=reportMapSheet_(false);if(!sheet||sheet.getLastRow()<2)return [];const rows=sheet.getRange(2,1,sheet.getLastRow()-1,REPORT_MAP_HEADERS_.length).getValues(),scopes=new Map();let jobs=[];if(!['admin','inspector'].includes(account.role)){const data=sheet_();jobs=data.getLastRow()>1?data.getRange(2,1,data.getLastRow()-1,58).getValues().filter(r=>!r[53]).map(readRow_).filter(r=>canAccessWork_(account,r)):[];}for(const row of rows){const scope={wbs:String(row[1]),tr:String(row[2]),year:storedYearToCE_(row[3])};if(['admin','inspector'].includes(account.role)||jobs.some(r=>r.wbs.trim()===scope.wbs&&(!scope.tr||r.transformer.trim()===scope.tr)&&(!scope.year||(scope.year==='unassigned'?!r.budgetYear:r.budgetYear===scope.year))))scopes.set(JSON.stringify(scope),scope);}return [...scopes.values()];}
const MAP_BINDING_HEADERS_=['Scope Key','กลุ่มเสา','รหัสเสาบนภาพ','หม้อแปลง TR','เสาที่ในงานสำรวจ','Revision','ผู้บันทึก','บันทึกเมื่อ'];
const MAP_NUMBER_HEADERS_=['Scope Key','Record ID','ลำดับงาน','ผู้กำหนด','กำหนดเมื่อ'];
const MAP_POSITION_HEADERS_=['Scope Key','Page ID','Record ID','X','Y','Revision','ผู้บันทึก','บันทึกเมื่อ'];
function mapWorkSheet_(name,headers,create){const book=SpreadsheetApp.openById(SPREADSHEET_ID_);let sheet=book.getSheetByName(name);if(!sheet&&create){sheet=book.insertSheet(name);sheet.getRange(1,1,1,headers.length).setValues([headers]);sheet.setFrozenRows(1);}if(sheet){const current=sheet.getRange(1,1,1,headers.length).getValues()[0];if(!headers.every((v,i)=>String(current[i])===v))throw new Error('หัวตาราง '+name+' ไม่ตรงกับระบบ');}return sheet;}
function mapWorkRows_(name,headers){const sheet=mapWorkSheet_(name,headers,false);return sheet&&sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).getValues():[];}
function mapWorkSafe_(v){return typeof v==='string'&&/^[=+\-@]/.test(v)?"'"+v:v;}
function mapWorkPages_(scope){const sheet=reportMapSheet_(false),rows=sheet&&sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,REPORT_MAP_HEADERS_.length).getValues().filter(r=>String(r[0])===scope.key):[];return mapSetPagesFromRows_(rows);}
function mapWorkIdentifier_(value){return String(value||'').trim().toUpperCase();}
function mapWorkState_(scope,account,email){const pages=mapWorkPages_(scope),bindings=mapWorkRows_('MapPoleBindings',MAP_BINDING_HEADERS_).filter(r=>String(r[0])===scope.key).map(r=>({group:String(r[1]),label:String(r[2]),tr:String(r[3]),pole:String(r[4]),revision:String(r[5])})),data=sheet_(),rows=data.getLastRow()>1?data.getRange(2,1,data.getLastRow()-1,58).getValues():[],jobs=rows.filter(r=>!r[53]).map(readRow_).filter(r=>r.wbs.trim()===scope.wbs&&(!scope.tr||r.transformer.trim()===scope.tr)&&(!scope.year||(scope.year==='unassigned'?!r.budgetYear:r.budgetYear===scope.year))&&canAccessWork_(account,r)).map(r=>({id:r.id,transformer:r.transformer,pole:r.pole,pea:r.pea,jobType:r.jobType,surveyDate:r.surveyDate}));const auto=autoMapPoleBindings_(pages,jobs,[],scope);bindings.splice(0,bindings.length,...auto.bindings);const numbers=mapWorkRows_('MapWorkNumbers',MAP_NUMBER_HEADERS_).filter(r=>String(r[0])===scope.key),numberById=new Map(numbers.map(r=>[String(r[1]),Number(r[2])])),fresh=[];let next=Math.max(0,...numbers.map(r=>Number(r[2])||0));const callouts=[];for(const job of [...jobs].sort((a,b)=>a.transformer.localeCompare(b.transformer,'th',{numeric:true})||a.pole.localeCompare(b.pole,'th',{numeric:true})||a.pea.localeCompare(b.pea,'th',{numeric:true})||a.id.localeCompare(b.id))){const binding=bindings.find(b=>mapWorkIdentifier_(b.tr)===mapWorkIdentifier_(job.transformer)&&mapWorkIdentifier_(b.pole)===mapWorkIdentifier_(job.pole));if(!binding||!pages.some(page=>page.groups.some(g=>g.name===binding.group&&g.points.some(p=>p.label===binding.label))))continue;if(!numberById.has(job.id)){numberById.set(job.id,++next);fresh.push([scope.key,job.id,next,email,storedDateToBE_(new Date().toISOString())]);}callouts.push({...job,number:numberById.get(job.id),group:binding.group,label:binding.label});}if(fresh.length){const sheet=mapWorkSheet_('MapWorkNumbers',MAP_NUMBER_HEADERS_,true);sheet.getRange(sheet.getLastRow()+1,1,fresh.length,MAP_NUMBER_HEADERS_.length).setValues(fresh.map(row=>row.map(mapWorkSafe_)));}const activeIds=new Set(callouts.map(r=>r.id)),positions=mapWorkRows_('MapArrowPositions',MAP_POSITION_HEADERS_).filter(r=>String(r[0])===scope.key&&activeIds.has(String(r[2]))).map(r=>({pageId:String(r[1]),recordId:String(r[2]),x:Number(r[3]),y:Number(r[4]),revision:String(r[5])}));return {bindings,jobs,callouts:callouts.sort((a,b)=>a.number-b.number),positions,unmatched:auto.unmatched};}
function getMapWorkAnnotations(input,token){const account=accountSession_(token),email=googleUser_(),lock=LockService.getScriptLock();lock.waitLock(30000);try{const scope=reportMapScope_(input,account);return mapWorkState_(scope,account,email);}finally{lock.releaseLock();}}
function mapWorkEditor_(token){const account=accountSession_(token);if(!['admin','inspector'].includes(account.role))throw new Error('เฉพาะผู้ดูแลและช่างผู้ควบคุมงานแก้ไขการผูกเสาได้');return account;}
function saveMapPoleBinding(input,binding,requestId,token){const account=mapWorkEditor_(token),email=googleUser_();if(!binding||typeof binding.group!=='string'||!binding.group||binding.group.length>80||!/^[A-Z]{1,3}$/.test(binding.label)||typeof binding.tr!=='string'||!binding.tr.trim()||binding.tr.length>2000||typeof binding.pole!=='string'||!binding.pole.trim()||binding.pole.length>2000||typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new Error('กรุณาระบุรหัสเสา TR และเสาที่ในงานสำรวจให้ครบ');const lock=LockService.getScriptLock();lock.waitLock(30000);try{const scope=reportMapScope_(input,account),pages=mapWorkPages_(scope);if(scope.tr&&mapWorkIdentifier_(binding.tr)!==mapWorkIdentifier_(scope.tr))throw new Error('TR ไม่ตรงกับชุดแผนที่ที่เปิด');if(!pages.some(p=>p.groups.some(g=>g.name===binding.group&&g.points.some(point=>point.label===binding.label))))throw new Error('ไม่พบรหัสเสาบนภาพ กรุณาบันทึกภาพพร้อมตัวอักษรก่อน');const sheet=mapWorkSheet_('MapPoleBindings',MAP_BINDING_HEADERS_,true),rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,MAP_BINDING_HEADERS_.length).getValues():[],index=rows.findIndex(r=>String(r[0])===scope.key&&String(r[1])===binding.group&&String(r[2])===binding.label),old=index>=0?rows[index]:null,tr=binding.tr.trim(),pole=binding.pole.trim();if(old&&String(old[3])===tr&&String(old[4])===pole)return {revision:String(old[5])};if(old&&String(old[5])!==String(binding.expectedRevision||''))throw new Error('การผูกเสามีการแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุด');if(rows.some((r,i)=>i!==index&&String(r[0])===scope.key&&mapWorkIdentifier_(r[3])===mapWorkIdentifier_(tr)&&mapWorkIdentifier_(r[4])===mapWorkIdentifier_(pole)))throw new Error('TR และเสาที่นี้ถูกผูกกับรหัสเสาอื่นแล้ว ใช้รหัสเดิมในภาพที่ซ้อนกัน');sheet.getRange(index>=0?index+2:sheet.getLastRow()+1,1,1,MAP_BINDING_HEADERS_.length).setValues([[scope.key,binding.group,binding.label,tr,pole,requestId,email,storedDateToBE_(new Date().toISOString())].map(mapWorkSafe_)]);SpreadsheetApp.flush();return {revision:requestId};}finally{lock.releaseLock();}}
function saveMapArrowPosition(input,pageId,recordId,x,y,expectedRevision,requestId,token){const account=mapWorkEditor_(token),email=googleUser_();if(typeof x!=='number'||typeof y!=='number'||!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1||typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new Error('ตำแหน่งวงกลมเลขไม่ถูกต้อง');const lock=LockService.getScriptLock();lock.waitLock(30000);try{const scope=reportMapScope_(input,account),state=mapWorkState_(scope,account,email),job=state.callouts.find(c=>c.id===recordId),page=mapWorkPages_(scope).find(p=>p.pageId===pageId);if(!job||!page||!page.groups.some(g=>g.name===job.group&&g.points.some(p=>p.label===job.label)))throw new Error('ไม่พบงานที่ผูกกับเสาในภาพนี้');const sheet=mapWorkSheet_('MapArrowPositions',MAP_POSITION_HEADERS_,true),rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,MAP_POSITION_HEADERS_.length).getValues():[],index=rows.findIndex(r=>String(r[0])===scope.key&&String(r[1])===pageId&&String(r[2])===recordId),old=index>=0?rows[index]:null;if(old&&Number(old[3])===x&&Number(old[4])===y)return {revision:String(old[5])};if(old&&String(old[5])!==String(expectedRevision||''))throw new Error('ตำแหน่งนี้มีการแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุด');sheet.getRange(index>=0?index+2:sheet.getLastRow()+1,1,1,MAP_POSITION_HEADERS_.length).setValues([[scope.key,pageId,recordId,x,y,requestId,email,storedDateToBE_(new Date().toISOString())].map(mapWorkSafe_)]);SpreadsheetApp.flush();return {revision:requestId};}finally{lock.releaseLock();}}

// E = transformer, F = pole. Match a label directly, or 1=A, 26=Z, 27=AA.
function mapWorkLabel_(value){const text=String(value||'').trim().replace(/^เสา(?:ที่)?\s*/,'').toUpperCase();if(/^[A-Z]{1,3}$/.test(text))return text;if(!/^[1-9]\d{0,4}$/.test(text))return '';let n=Number(text),label='';while(n){label=String.fromCharCode(65+(n-1)%26)+label;n=Math.floor((n-1)/26);}return label.length<=3?label:'';}
function autoMapPoleBindings_(pages,jobs,manual,scope){const poles=new Map();for(const page of pages)for(const group of page.groups)for(const point of group.points)poles.set(JSON.stringify([group.name,point.label]),{group:group.name,label:point.label});const uniqueJobs=new Map();for(const job of jobs)if(job.transformer&&job.pole)uniqueJobs.set(JSON.stringify([mapWorkIdentifier_(job.transformer),mapWorkIdentifier_(job.pole)]),job);const proposals=[];let unmatched=jobs.filter(j=>!j.transformer||!j.pole).length;const trs=new Set(jobs.map(j=>mapWorkIdentifier_(j.transformer)).filter(Boolean));for(const job of uniqueJobs.values()){if(manual.some(b=>mapWorkIdentifier_(b.tr)===mapWorkIdentifier_(job.transformer)&&mapWorkIdentifier_(b.pole)===mapWorkIdentifier_(job.pole)))continue;const label=mapWorkLabel_(job.pole),candidates=[...poles.values()].filter(p=>p.label===label&&!manual.some(b=>b.group===p.group&&b.label===p.label)),byTr=candidates.filter(p=>mapWorkIdentifier_(p.group)===mapWorkIdentifier_(job.transformer));const eligible=byTr.length?byTr:((scope.tr||trs.size===1)?candidates:[]);if(eligible.length===1)proposals.push({...eligible[0],tr:job.transformer,pole:job.pole,revision:'',automatic:true});else unmatched++;}const counts=new Map();for(const p of proposals){const key=JSON.stringify([p.group,p.label]);counts.set(key,(counts.get(key)||0)+1);}return {bindings:proposals.filter(p=>{if(counts.get(JSON.stringify([p.group,p.label]))===1)return true;unmatched++;return false;}),unmatched};}
function saveMapArrowPositions(input,changes,requestId,token){const account=mapWorkEditor_(token),email=googleUser_();if(!Array.isArray(changes)||!changes.length||changes.length>2000||typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw new Error('รายการตำแหน่งลูกศรไม่ถูกต้อง');const used=new Set();for(const change of changes){if(!change||typeof change.pageId!=='string'||typeof change.recordId!=='string'||typeof change.x!=='number'||typeof change.y!=='number'||!Number.isFinite(change.x)||!Number.isFinite(change.y)||change.x<0||change.x>1||change.y<0||change.y>1)throw new Error('ตำแหน่งวงกลมเลขไม่ถูกต้อง');const key=JSON.stringify([change.pageId,change.recordId]);if(used.has(key))throw new Error('ตำแหน่งงานซ้ำในคำขอ');used.add(key);}const lock=LockService.getScriptLock();lock.waitLock(30000);try{const scope=reportMapScope_(input,account),state=mapWorkState_(scope,account,email),pages=mapWorkPages_(scope),existing=mapWorkRows_('MapArrowPositions',MAP_POSITION_HEADERS_),rows=existing.map(r=>r.slice()),positions=[];for(const change of changes){const job=state.callouts.find(j=>j.id===change.recordId),page=pages.find(p=>p.pageId===change.pageId);if(!job||!page||!page.groups.some(g=>g.name===job.group&&g.points.some(p=>p.label===job.label)))throw new Error('ไม่พบงานที่ผูกกับเสาในภาพนี้');const index=rows.findIndex(r=>String(r[0])===scope.key&&String(r[1])===change.pageId&&String(r[2])===change.recordId),old=index>=0?rows[index]:null;if(old&&Number(old[3])===change.x&&Number(old[4])===change.y){positions.push({pageId:change.pageId,recordId:change.recordId,x:change.x,y:change.y,revision:String(old[5])});continue;}if(String(old?old[5]:'')!==String(change.expectedRevision||''))throw new Error('ตำแหน่งมีการแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก');const row=[scope.key,change.pageId,change.recordId,change.x,change.y,requestId,email,storedDateToBE_(new Date().toISOString())];if(index>=0)rows[index]=row;else rows.push(row);positions.push({pageId:change.pageId,recordId:change.recordId,x:change.x,y:change.y,revision:requestId});}const sheet=mapWorkSheet_('MapArrowPositions',MAP_POSITION_HEADERS_,true);sheet.getRange(2,1,rows.length,MAP_POSITION_HEADERS_.length).setValues(rows.map(row=>row.map(mapWorkSafe_)));SpreadsheetApp.flush();return {positions};}finally{lock.releaseLock();}}
