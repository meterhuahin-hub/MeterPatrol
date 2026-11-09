const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),code=fs.readFileSync(__dirname+'/Code.gs','utf8');
function setup(role){
 const counts={sheet:0,mainPoints:0},rows=[['KEY','x']],url='https://drive.google.com/file/d/m1/view';
 const c=vm.createContext({Utilities:{DigestAlgorithm:{SHA_256:'sha'},computeDigest:(a,s)=>[...Buffer.from(require('crypto').createHash('sha256').update(s).digest())],base64Encode:b=>Buffer.from(b).toString('base64')},console});
 vm.runInContext(code,c);
 c.accountSession_=()=>({role});c.googleUser_=()=>'a@example.com';c.canAccessWork_=()=>true;
 const wbs=new Array(58).fill('');
 c.readRow_=()=>({wbs:'W-1',transformer:'T1',budgetYear:'2569'});
 c.sheet_=()=>{counts.sheet++;return {getLastRow:()=>2,getRange:()=>({getValues:()=>[wbs]})};};
 const scopeKey=(()=>{const s=c.reportMapScope_;return null;})();
 c.reportMapSheet_=()=>({getLastRow:()=>2,getRange:()=>({getValues:()=>c.mapRows})});
 c.mapSetPagesFromRows_=r=>r.map(x=>({pageId:x[1],url}));
 c.mapNavigation_=()=>({latlong:'',revision:''});
 c.withSavedMainPoints_=(s,p)=>{counts.mainPoints++;return p;};
 c.photoDataFromUrl_=u=>{assert.equal(u,url);return 'data:image/jpeg;base64,AA==';};
 return {c,counts};
}
const scope={wbs:'W-1',tr:'T1',year:'2569'};
for(const role of ['admin','inspector']){
 const {c,counts}=setup(role);assert.ok(c.reportMapScope_(scope,{role}).key);assert.equal(counts.sheet,0,role+' scope does not read DATA');
}
{const {c,counts}=setup('contractor');assert.ok(c.reportMapScope_(scope,{role:'contractor'}).key);assert.equal(counts.sheet,1,'contractor access is still checked against DATA');
 assert.throws(()=>c.reportMapScope_({...scope,wbs:'OTHER'},{role:'contractor'}),/สิทธิ์/);}
{const {c,counts}=setup('admin'),key=c.reportMapScope_(scope,{role:'admin'}).key;c.mapRows=[[key,'p1'],['other','p2']];
 assert.equal(c.getReportMapPageImage(scope,'p1','t'),'data:image/jpeg;base64,AA==');
 assert.equal(counts.mainPoints,0,'a page image does not read main points');assert.equal(counts.sheet,0,'a page image does not read DATA for admin');
 assert.throws(()=>c.getReportMapPageImage(scope,'p2','t'),/ไม่พบภาพ/,'a page from another scope is refused');
 assert.equal(c.getReportMapSet(scope,'t').pages.length,1);assert.equal(counts.mainPoints,1,'the page list keeps main points');}
{const {c}=setup('contractor');c.mapRows=[];assert.throws(()=>c.getReportMapPageImage({...scope,wbs:'OTHER'},'p1','t'),/สิทธิ์/,'contractor without the job cannot read an image');}
{const {c}=setup('admin');const files={Index:"<?!= include_('Leaflet'); ?>a",Leaflet:'b'};c.HtmlService={createTemplateFromFile:n=>({getRawContent:()=>files[n]})};
 const one=c.appBuildId_();assert.ok(one);assert.equal(c.appBuildId_(),one,'build id is stable');files.Index+='changed';assert.notEqual(c.appBuildId_(),one,'a new Index changes the build id');
 assert.ok(c.appBootstrapHtml_(one).includes(JSON.stringify(one)),'bootstrap carries the build id');
 c.Utilities=undefined;assert.equal(c.appBuildId_(),'','a digest failure never blocks opening the app');}
console.log('PASS map scope skips DATA for staff, page images read only their row, contractor checks stay, build id tracks the app document');
