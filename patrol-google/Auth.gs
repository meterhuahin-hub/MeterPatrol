// DI login supplements the existing Google-account access gate.
const ACCOUNT_PREFIX_='account:';
function accountKey_(di){return ACCOUNT_PREFIX_+di;}
function validDi_(di){if(typeof di!=='string'||!/^[A-Za-z0-9_.-]{1,64}$/.test(di))throw new Error('DI ใช้ตัวอักษรอังกฤษ ตัวเลข _ . - ได้ไม่เกิน 64 ตัว');return di;}
function accounts_(){const props=PropertiesService.getScriptProperties().getProperties();return Object.keys(props).filter(key=>key.startsWith(ACCOUNT_PREFIX_)).map(key=>JSON.parse(props[key]));}
function publicAccount_(a){return {di:a.di,name:a.name,position:a.position,role:a.role,active:a.active};}
function bcrypt_(){if(typeof dcodeIO==='undefined'||!dcodeIO.bcrypt)throw new Error('กรุณาเพิ่มไฟล์สคริปต์ Bcrypt ก่อน');const b=dcodeIO.bcrypt;b.setRandomFallback(length=>{const bytes=[];while(bytes.length<length){const hex=Utilities.getUuid().replace(/-/g,'');for(let i=0;i<hex.length;i+=2)bytes.push(parseInt(hex.slice(i,i+2),16));}return bytes.slice(0,length);});return b;}
function passwordHash_(password){if(typeof password!=='string'||password.length===0||Utilities.newBlob(password).getBytes().length>72)throw new Error('กรุณากรอก pass ไม่เกิน 72 ไบต์');return bcrypt_().hashSync(password,10);}
function digest_(text){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text));}
function ownerEmail_(){const override=PropertiesService.getScriptProperties().getProperty('LOGIN_BOOTSTRAP_EMAIL');if(override)return override.trim().toLowerCase();const owner=DriveApp.getFileById(SPREADSHEET_ID_).getOwner();return owner?owner.getEmail().toLowerCase():'';}
function getLoginInfo(){const email=googleUser_();return {email,canBootstrap:!accounts_().some(a=>a.role==='admin'&&a.active)&&email===ownerEmail_()};}
function bootstrapAdmin(input){
 const email=googleUser_(),lock=LockService.getScriptLock();lock.waitLock(30000);
 try{if(email!==ownerEmail_()||accounts_().length)throw new Error('เฉพาะเจ้าของชีตสร้าง Admin แรกได้ และสร้างได้ครั้งเดียว');const a=validatedAccount_(input);a.role='admin';a.active=true;a.hash=passwordHash_(input.password);a.revision=Utilities.getUuid();PropertiesService.getScriptProperties().setProperty(accountKey_(a.di),JSON.stringify(a));return publicAccount_(a);}finally{lock.releaseLock();}
}
function validatedAccount_(input){if(!input||typeof input!=='object')throw new Error('ข้อมูลผู้ใช้ไม่ถูกต้อง');const di=validDi_(input.di);for(const key of ['name','position'])if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>200)throw new Error('กรุณากรอกชื่อและตำแหน่ง ไม่เกิน 200 ตัวอักษร');return {di,name:input.name.trim(),position:input.position.trim(),role:input.role===undefined||input.role==='user'?'contractor':(['admin','inspector','contractor'].includes(input.role)?input.role:(()=>{throw new Error('สิทธิ์ผู้ใช้ไม่ถูกต้อง');})()),active:input.active!==false};}
function loginAccount(di,password){
 const email=googleUser_();validDi_(di);if(typeof password!=='string'||password.length>1000)throw new Error('DI หรือ pass ไม่ถูกต้อง');
 const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  const props=PropertiesService.getScriptProperties(),key='login-rate:'+digest_(email),now=Date.now(),rate=JSON.parse(props.getProperty(key)||'null');
  if(rate&&rate.until>now&&rate.failures>=5)throw new Error('ลองหลายครั้งเกินไป กรุณารอ 15 นาที');
  const account=JSON.parse(props.getProperty(accountKey_(di))||'null');let valid=false;
  if(account)valid=bcrypt_().compareSync(password,account.hash);else bcrypt_().hashSync(password,'$2a$10$abcdefghijklmnopqrstuu');
  if(!account||!account.active||!valid){props.setProperty(key,JSON.stringify({failures:rate&&rate.until>now?rate.failures+1:1,until:now+900000}));throw new Error('DI หรือ pass ไม่ถูกต้อง');}
  props.deleteProperty(key);
  const token=Utilities.getUuid()+Utilities.getUuid();CacheService.getScriptCache().put('login-session:'+digest_(token),JSON.stringify({di,email,revision:account.revision,expires:now+14400000}),14400);
  return {token,user:publicAccount_(account)};
 }finally{lock.releaseLock();}
}
function accountSession_(token){
 const email=googleUser_();if(typeof token!=='string'||token.length>100)throw new Error('AUTH_REQUIRED: กรุณาเข้าสู่ระบบ');
 const session=JSON.parse(CacheService.getScriptCache().get('login-session:'+digest_(token))||'null');
 if(!session||session.email!==email||session.expires<Date.now())throw new Error('AUTH_REQUIRED: กรุณาเข้าสู่ระบบใหม่');
 const account=JSON.parse(PropertiesService.getScriptProperties().getProperty(accountKey_(session.di))||'null');
 if(!account||!account.active||account.revision!==session.revision)throw new Error('AUTH_REQUIRED: บัญชีถูกปิดหรือเปลี่ยนรหัสผ่าน กรุณาเข้าสู่ระบบใหม่');return account;
}
function getAccountSession(token){return publicAccount_(accountSession_(token));}
function logoutAccount(token){accountSession_(token);CacheService.getScriptCache().remove('login-session:'+digest_(token));return true;}
function admin_(token){const a=accountSession_(token);if(a.role!=='admin')throw new Error('เฉพาะ Admin จัดการผู้ใช้ได้');return a;}
function listAccounts(token){admin_(token);return accounts_().map(publicAccount_).sort((a,b)=>a.di.localeCompare(b.di));}
function saveAccount(input,token){
 admin_(token);const lock=LockService.getScriptLock();lock.waitLock(30000);
 try{
  // Recheck inside lock so a concurrent admin change cannot bypass authorization.
  admin_(token);const props=PropertiesService.getScriptProperties(),a=validatedAccount_(input),old=JSON.parse(props.getProperty(accountKey_(a.di))||'null');
  if(old&&old.role==='admin'&&old.active&&(!a.active||a.role!=='admin')&&!accounts_().some(other=>other.di!==a.di&&other.role==='admin'&&other.active))throw new Error('ต้องเหลือ Admin ที่ใช้งานได้อย่างน้อยหนึ่งคน');
  if(!old&&!input.password)throw new Error('ผู้ใช้ใหม่ต้องมี pass');
  a.hash=input.password?passwordHash_(input.password):old.hash;a.revision=old&&!input.password?old.revision:Utilities.getUuid();
  props.setProperty(accountKey_(a.di),JSON.stringify(a));return publicAccount_(a);
 }finally{lock.releaseLock();}
}
// Editor-only maintenance fallback is restricted to the Google owner/admin bootstrap identity.
function maintenanceUser_(token){if(token){admin_(token);return googleUser_();}const email=googleUser_();if(email!==ownerEmail_())throw new Error('ต้องใช้บัญชีเจ้าของชีตเพื่อ Run ฟังก์ชันนี้');return email;}
