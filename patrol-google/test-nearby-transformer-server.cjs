const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const code=fs.readFileSync(__dirname+'/Code.gs','utf8');
function setup(scopes,nav){const c=vm.createContext({console});vm.runInContext(code,c);c.accountSession_=()=>({role:'contractor'});c.googleUser_=()=>'a@example.com';c.listReportMapScopes=()=>scopes;c.mapWorkRows_=name=>name==='MapNavigation'?nav:[];return c;}
const row=(wbs,tr,year,latlong)=>['k',wbs,tr,year,latlong,'r','u','t'];
// Only transformer points inside scopes the account may open are returned.
let c=setup([{wbs:'W-1',tr:'TR-1',year:'2027'},{wbs:'W-1',tr:'TR-2',year:'2027'}],[row('W-1','TR-1','2570','12.61, 99.93'),row('W-1','TR-2','2570','12.62,99.94'),row('W-9','TR-9','2570','12.63,99.95'),row('W-1','TR-3','2570','')]);
let out=JSON.parse(JSON.stringify(c.listTransformerLocations('t')));
assert.deepEqual(out,[{wbs:'W-1',tr:'TR-1',year:'2027',latlong:'12.61,99.93'},{wbs:'W-1',tr:'TR-2',year:'2027',latlong:'12.62,99.94'}],'only allowed scopes with coordinates');
// Invalid coordinates are skipped rather than failing the whole list.
c=setup([{wbs:'W-1',tr:'TR-1',year:'2027'},{wbs:'W-1',tr:'TR-2',year:'2027'}],[row('W-1','TR-1','2570','not a place'),row('W-1','TR-2','2570','12.62,99.94')]);
assert.equal(c.listTransformerLocations('t').length,1);
// Identifier spacing differences still match the permitted scope.
c=setup([{wbs:'W-1',tr:'TR 66-1',year:'2027'}],[row('W-1','TR66-1','2570','12.6,99.9')]);
assert.equal(c.listTransformerLocations('t').length,c.mapWorkIdentifier_('TR 66-1')===c.mapWorkIdentifier_('TR66-1')?1:0);
// Sign-in failure is not hidden.
c=setup([],[]);c.accountSession_=()=>{throw new Error('AUTH_REQUIRED: x');};assert.throws(()=>c.listTransformerLocations('t'),/AUTH_REQUIRED/);
console.log('PASS transformer locations follow map access, skip bad coordinates and keep sign-in checks');
