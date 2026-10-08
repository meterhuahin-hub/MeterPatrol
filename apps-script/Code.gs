const HEADERS_ = ['รหัสงาน', 'เวลาบันทึก', 'บัญชีผู้บันทึก', 'วันที่สำรวจ', 'ผู้สำรวจ', 'สถานที่', 'เลขมิเตอร์', 'ประเภท', 'เลขอ่าน', 'ชำรุดรวม', 'ใหม่รวม', 'หมายเหตุ', 'ข้อมูล JSON'];

function requireUser_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const props = PropertiesService.getScriptProperties();
  const allowed = String(props.getProperty('ALLOWED_EMAILS') || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!email || !allowed.includes(email)) throw new Error('บัญชี Google นี้ไม่ได้รับสิทธิ์ หรือระบบตรวจสอบบัญชีไม่ได้ กรุณาติดต่อผู้ดูแล');
  return email;
}

function sheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('ผู้ดูแลยังไม่ได้ตั้งค่า SPREADSHEET_ID');
  const book = SpreadsheetApp.openById(id);
  let sheet = book.getSheetByName('MeterPatrol');
  if (!sheet) {
    sheet = book.insertSheet('MeterPatrol');
    sheet.getRange(1, 1, 1, HEADERS_.length).setValues([HEADERS_]);
    sheet.setFrozenRows(1);
  }
  const header = sheet.getRange(1, 1, 1, HEADERS_.length).getValues()[0];
  if (!HEADERS_.every((v, i) => header[i] === v)) throw new Error('หัวตาราง MeterPatrol ไม่ตรงกับระบบ กรุณาให้ผู้ดูแลตรวจสอบ ห้ามเขียนทับข้อมูล');
  return sheet;
}

function validate_(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('ข้อมูลไม่ถูกต้อง');
  const result = {};
  for (const key of ['date', 'surveyor', 'location', 'meter', 'type', 'reading', 'notes']) {
    const value = data[key] === undefined ? '' : data[key];
    if (typeof value !== 'string' || value.length > 2000) throw new Error('ข้อความไม่ถูกต้องหรือยาวเกินไป');
    result[key] = value.trim();
  }
  for (const key of ['date','surveyor','location','meter']) if (!result[key]) throw new Error('กรุณาระบุวันที่ ผู้สำรวจ สถานที่ และเลขมิเตอร์');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result.date) || !Number.isFinite(Date.parse(result.date)) || new Date(result.date).toISOString().slice(0,10) !== result.date) throw new Error('วันที่ไม่ถูกต้อง');
  if (!['น้ำ','ไฟฟ้า','อื่น ๆ'].includes(result.type)) throw new Error('ประเภทมิเตอร์ไม่ถูกต้อง');
  if (result.reading && (!Number.isFinite(Number(result.reading)) || Number(result.reading) < 0)) throw new Error('เลขอ่านมิเตอร์ไม่ถูกต้อง');
  if (!Array.isArray(data.items) || data.items.length > 100) throw new Error('รายการอุปกรณ์ไม่ถูกต้อง');
  result.items = data.items.map(item => {
    if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 200) throw new Error('กรุณาระบุชื่ออุปกรณ์');
    for (const key of ['damaged','new']) if (!Number.isInteger(item[key]) || item[key]<0 || item[key]>1000000) throw new Error('จำนวนอุปกรณ์ต้องเป็นจำนวนเต็มตั้งแต่ศูนย์');
    return {name:item.name.trim(), damaged:item.damaged, new:item.new};
  });
  // Google Sheets has a 50,000-character limit per cell.
  if (JSON.stringify(result).length > 40000) throw new Error('ข้อมูลรายการนี้ยาวเกินไป กรุณาลดจำนวนอุปกรณ์หรือข้อความ');
  return result;
}

function doGet() {
  try {
    requireUser_();
    return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('MeterPatrol').addMetaTag('viewport','width=device-width, initial-scale=1');
  } catch (error) {
    return HtmlService.createHtmlOutput('<!doctype html><html lang="th"><body><h1>MeterPatrol</h1><p>ไม่สามารถเข้าใช้งานได้ กรุณาใช้บัญชี Google ที่ผู้ดูแลอนุญาต และติดต่อผู้ดูแลเพื่อตรวจสอบการตั้งค่า</p></body></html>');
  }
}

function include_(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
function getCurrentUser() { return {username:requireUser_()}; }

function listSurveys() {
  requireUser_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = sheet_();
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2,1,sheet.getLastRow()-1,HEADERS_.length).getValues().map(row => {
      const data = validate_(JSON.parse(String(row[12])));
      return Object.assign(data, {id:String(row[0]), created_at:String(row[1]), recorded_by:String(row[2])});
    }).reverse();
  } finally { lock.releaseLock(); }
}

function saveSurvey(data, requestId) {
  const email = requireUser_();
  const clean = validate_(data);
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) throw new Error('รหัสคำขอไม่ถูกต้อง กรุณาโหลดหน้าใหม่');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = sheet_();
    // Retrying an uncertain network result must not create a duplicate record.
    if (sheet.getLastRow()>1) {
      const rows = sheet.getRange(2,1,sheet.getLastRow()-1,HEADERS_.length).getValues();
      const old = rows.find(row => String(row[0])===requestId);
      if (old) {
        if (String(old[2])!==email || String(old[12])!==JSON.stringify(clean)) throw new Error('รหัสคำขอซ้ำกับข้อมูลอื่น กรุณาโหลดหน้าใหม่');
        return {id:requestId};
      }
    }
    const safe = value => /^[=+\-@]/.test(String(value)) ? "'"+value : String(value);
    const values = [requestId,new Date().toISOString(),email,clean.date,clean.surveyor,clean.location,clean.meter,clean.type,clean.reading,
      clean.items.reduce((n,item)=>n+item.damaged,0),clean.items.reduce((n,item)=>n+item.new,0),clean.notes,JSON.stringify(clean)];
    const range = sheet.getRange(sheet.getLastRow()+1,1,1,HEADERS_.length);
    range.setNumberFormat('@');
    range.setValues([values.map(safe)]);
    SpreadsheetApp.flush();
    return {id:requestId};
  } finally { lock.releaseLock(); }
}
