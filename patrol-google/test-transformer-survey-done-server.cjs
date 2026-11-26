const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const code=fs.readFileSync(__dirname+'/Code.gs','utf8'),H=['Scope Key','WBS','TR','ปีงบประมาณ (พ.ศ.)','สำรวจเสร็จ','ผู้บันทึก','บันทึกเมื่อ'];
function setup(scopes,rows){const c=vm.createContext({console});vm.runInContext(code,c);const written=[];c.accountSession_=()=>({role:'contractor',name:'สมชาย'});c.googleUser_=()=>'a@example.com';c.listReportMapScopes=()=>scopes;c.mapWorkRows_=name=>name==='TransformerSurveyDone'?rows:[];c.reportMapScope_=input=>{if(!scopes.some(s=>s.wbs===input.wbs&&s.tr===input.tr&&s.year===input.year))throw new Error('ไม่พบงานใน WBS/TR/ปีนี้ หรือไม่มีสิทธิ์เข้าถึง');return {wbs:input.wbs,tr:input.tr,year:input.year,key:'K-'+input.tr};};c.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){c.unlocked=true;}})};c.SpreadsheetApp={flush(){}};c.mapWorkSheet_=(name,headers,create)=>{assert.equal(name,'TransformerSurveyDone');assert.deepEqual([...headers],H);assert.equal(create,true);return {getLastRow:()=>rows.length+1,getRange:(r,col,n,w)=>({setValues:v=>written.push([r,v[0]])})};};c.written=written;return c;}
const row=(wbs,tr,year,done)=>['K-'+tr,wbs,tr,year,done,'สมศรี','26/11/2569'];
// Listing returns finished transformers the account may open.
let c=setup([{wbs:'W-1',tr:'TR-1',year:'2027'},{wbs:'W-1',tr:'TR-2',year:'2027'}],[row('W-1','TR-1','2570','เสร็จ'),row('W-1','TR-2','2570',''),row('W-9','TR-9','2570','เสร็จ')]);
assert.deepEqual(JSON.parse(JSON.stringify(c.listTransformerSurveyDone('t'))),[{wbs:'W-1',tr:'TR-1',year:'2027',by:'สมศรี',at:'26/11/2569'}]);
// Marking done appends a row with who and when; unmarking rewrites the same row.
c=setup([{wbs:'W-1',tr:'TR-2',year:'2027'}],[]);let r=c.setTransformerSurveyDone({wbs:'W-1',tr:'TR-2',year:'2027'},true,'t');
assert.equal(r.done,true);assert.equal(r.by,'สมชาย');assert.equal(c.written.length,1);assert.equal(c.written[0][0],2);assert.deepEqual([...c.written[0][1].slice(0,6)],['K-TR-2','W-1','TR-2','2570','เสร็จ','สมชาย']);assert.equal(c.unlocked,true);
c=setup([{wbs:'W-1',tr:'TR-1',year:'2027'}],[row('W-9','TR-9','2570','เสร็จ'),row('W-1','TR-1','2570','เสร็จ')]);r=c.setTransformerSurveyDone({wbs:'W-1',tr:'TR-1',year:'2027'},false,'t');
assert.equal(r.done,false);assert.equal(c.written[0][0],3,'updates the existing row');assert.equal(c.written[0][1][4],'');
// Rejects a missing TR/year, a non-boolean flag, and scopes outside the account.
assert.throws(()=>c.setTransformerSurveyDone({wbs:'W-1',tr:'TR-1',year:'2027'},'yes','t'),/สถานะ/);
c=setup([{wbs:'W-1',tr:'',year:'2027'}],[]);assert.throws(()=>c.setTransformerSurveyDone({wbs:'W-1',tr:'',year:'2027'},true,'t'),/TR/);
c=setup([],[]);assert.throws(()=>c.setTransformerSurveyDone({wbs:'W-1',tr:'TR-1',year:'2027'},true,'t'),/สิทธิ์/);
c=setup([],[]);c.accountSession_=()=>{throw new Error('AUTH_REQUIRED: x');};assert.throws(()=>c.listTransformerSurveyDone('t'),/AUTH_REQUIRED/);
console.log('PASS transformer survey completion is listed by map access, saved with who/when, reversible, and validated');
