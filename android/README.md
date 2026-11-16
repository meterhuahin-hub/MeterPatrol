# แอป Android: งาน WBS และ Patrol

[ดาวน์โหลด MeterPatrol-1.3.0.apk](releases/MeterPatrol-1.3.0.apk?raw=true)

ไฟล์ APK สำหรับ Android 6.0 ขึ้นไป ใช้ได้ทั้งเครื่อง ARM และ x86 มีไอคอนแอปและเปิดระบบงานจาก URL ที่กำหนดทันทีผ่าน Chrome Custom Tabs ถ้าไม่มี Chrome จะใช้เบราว์เซอร์ที่รองรับหรือเบราว์เซอร์ปกติ มีปุ่มเลือกเบราว์เซอร์อื่นในหน้าแอปเมื่อกดย้อนกลับ

## ติดตั้งและใช้งาน

1. ดาวน์โหลด APK ในมือถือ Android แล้วเปิดไฟล์
2. หาก Android ถาม ให้อนุญาตติดตั้งจากแอปที่ใช้ดาวน์โหลดหรือเปิดไฟล์ แล้วกดติดตั้ง
3. เปิดไอคอน **WBS และ Patrol** ใช้บัญชี Google ที่ผู้ดูแลอนุญาต แล้วเข้าสู่ระบบด้วย ID/Password ตามเดิม
4. เมื่อสแกนบาร์โค้ด ให้สิทธิ์กล้องกับแอป **WBS และ Patrol** โดยตรง การแนบรูป พิกัด และการพิมพ์/PDF ยังใช้การทำงานของเว็บและเบราว์เซอร์

ต้องใช้อินเทอร์เน็ต ข้อมูลยังอยู่ใน Google Sheets/Drive ชุดเดิม แอปนี้ไม่มีฐานข้อมูลออฟไลน์ ไม่เก็บรหัสผ่านเอง และไม่เปลี่ยนสิทธิ์ของผู้ใช้ APK ใช้กับ Android เท่านั้น

การเข้าสู่ระบบ Google ใช้เบราว์เซอร์จริงเพื่อไม่ให้เกิดปัญหาการล็อกอินใน WebView จึงมีแถบของเบราว์เซอร์แสดงอยู่ด้วย ไม่ใช่ WebView ที่ซ่อน URL และไม่ใช่ Trusted Web Activity แบบเต็มหน้าจอ เนื่องจากเราไม่ได้ควบคุมโดเมน script.google.com เพื่อยืนยัน Digital Asset Links

URL ที่ใช้:

```text
https://script.google.com/macros/s/AKfycbx0xCXsuBr2B35QgKyBs-VTLJ9_6oZZqOTp8zbVximNE6y8qLtsNP_1ik_bds4W8Duz/exec
```

อัปเดตโค้ดเว็บใน Apps Script โดยใช้ deployment URL เดิมได้ตามปกติ ไม่ต้องติดตั้ง APK ใหม่ทุกครั้ง ไม่ต้องนำไฟล์ในโฟลเดอร์ Android ไปวางใน Apps Script

## สแกน Native และเติม PEA อัตโนมัติใน APK 1.2.0

ติดตั้ง APK 1.2.0 ทับตัวเดิมได้ ใช้ package และใบเซ็นเดิม ตัวอ่าน ZXing Core อยู่ใน APK และใช้กล้อง Android โดยตรง ไม่ใช้กล้อง Chrome ไม่ต้องใช้ Google Play services และไม่อัปโหลดภาพ

**อัปเดตเว็บด้วย:** แทนทั้ง `patrol-google/Index.html` และ `patrol-google/Code.gs` แล้ว Deploy เวอร์ชันใหม่ด้วย URL เดิม ไม่ต้องเปลี่ยน Execute as หรือสิทธิ์ของเว็บ และไม่ต้องเพิ่ม OAuth client

1. ในฟอร์ม WBS/Patrol กด **สแกนบาร์โค้ด** ระบบเตรียมคำขอรับผลแล้วเปิดกล้อง APK (หากเบราว์เซอร์ไม่เปิดให้ ให้กด **เปิดกล้องใน APK**)
2. เล็งบาร์โค้ดให้ครบ เมื่ออ่านตรงกันสองครั้ง แอปหยุดกล้องและส่งผลทันที **ไม่แสดงหน้าตรวจเลข/ไม่ต้องกดใช้เลขนี้**
3. APK ติดตาม Custom Tabs navigation ผ่าน session ของหน้าส่งผล เมื่อโหลดเสร็จจะปิดหน้าส่งผลและหน้าสแกน กลับฟอร์มเดิมและเติม PEA อัตโนมัติ **ไม่ต้องกดกลับหน้าบันทึกงาน** งานยังไม่ถูกบันทึกจนกดบันทึกตามปกติ

หน้าส่งผลปกติเป็นเพียงข้อความกำลังดำเนินการสั้น ๆ ระหว่างเครือข่าย ไม่ใช่หน้ารับรองหมายเลข ในกรณีเบราว์เซอร์ไม่รองรับ session/navigation callback หรือระบบขัดขวางการสลับแอป อาจต้องกดปุ่มกลับฟอร์มสำรองที่แสดงหลังรอ 8 วินาทีหรือกดย้อนกลับ ตัวรับผลยังตรวจ request/บัญชีเดิมและอายุคำขอ ไม่ใช้คลิปบอร์ด

คำขอสแกนมีอายุ 5 นาที ใช้ CacheService เก็บผลชั่วคราว ตรวจบัญชีผู้ใช้ก่อนอ่าน และตรวจบัญชี Google เจ้าของคำขอก่อนรับผล ไม่ส่ง ID/Password หรือ session token ไปในลิงก์ APK ไม่แก้ Google Sheets จนกดบันทึกงานตามปกติ การปิดหน้าสแกน/เปลี่ยนฟอร์มจะไม่รับผลเก่าไปเติมฟอร์มใหม่ ต้องเก็บแท็บฟอร์มเดิมไว้ หากแท็บถูกปิดหรือระบบทำลายฟอร์มขณะอยู่เบื้องหลัง ให้เปิดฟอร์มแล้วสแกนใหม่

ปุ่มในหน้าหลัก APK จะเปิดเว็บให้เลือกฟอร์มก่อน เพื่อให้ระบบรู้ว่าจะส่ง PEA กลับช่องใด รุ่น 1.3 ตัดหน้ากดใช้เลขของรุ่น 1.2 และเพิ่ม native Custom Tabs callback เพื่อคืนหน้าฟอร์มเอง

## สิ่งที่ตรวจแล้ว

สร้าง APK สำเร็จ ตรวจ signature ด้วย Android apksigner ผ่าน v1/v2/v3 และตรวจ zip alignment, package/activity, Android SDK และ URL ที่ฝังในไฟล์ รวมถึงการใช้ใบเซ็นเดียวกับ 1.0.0 แล้ว ผลและ SHA-256 อยู่ใน `releases/`:

```sh
python android/check_apk.py
```

ทดสอบตัวถอดรหัส Native ด้วย Java ผ่าน CODE128/ITF จริงที่สร้างเป็นภาพ luminance รวมถึงภาพหมุนและศูนย์นำหน้า และทดสอบเว็บรับผลอัตโนมัติใน Chromium รวมถึงเจ้าของคำขอ ผลล่าช้า การยกเลิก และการหมดอายุแล้ว แต่ยังไม่ได้ติดตั้ง APK บนอุปกรณ์ Android จริงหรือทดสอบกล้องจริงและเข้าสู่ระบบด้วยบัญชี Google ที่ได้รับอนุญาต การเปิด URL จากสภาพแวดล้อมที่ใช้สร้างไฟล์ถูกปฏิเสธโดยเครือข่าย จึงไม่ได้ยืนยันการเข้าเว็บแทนผู้ใช้

หลังติดตั้ง ให้ตรวจการล็อกอิน เปิดฟอร์ม สแกน ส่งผลกลับ และการเติม PEA บนมือถือจริงโดยใช้ Google บัญชีเดิม หากเลือกบัญชีผิด ให้เปลี่ยนบัญชีในเบราว์เซอร์หรือใช้ปุ่มเลือกเบราว์เซอร์อื่น

## สร้าง APK จากซอร์ส

ต้องมี Linux x86-64, Python 3.11 ขึ้นไป, Java และ keytool (แนะนำ Java 21) ไม่ต้องติดตั้ง Gradle หรือ javac สคริปต์ดาวน์โหลด Android Build Tools 35, Android API 35 , ZXing Core 3.5.3 และ Eclipse Java compiler จากแหล่งต้นทางโดยตรวจ SHA-256 ที่ระบุไว้ในสคริปต์

```sh
python android/build.py
python android/check_apk.py
```

ไฟล์ติดตั้งอยู่ที่ `android/releases/MeterPatrol-1.3.0.apk` แคชเครื่องมือและผลระหว่างสร้างถูกละเว้นจาก Git

**การเซ็นสำหรับอัปเดตแอปเดิม:** กุญแจจริงและรหัสผ่านอยู่ใน `android/.signing/` ใน workspace ที่สร้างไฟล์นี้ ไม่รวมอยู่ใน Git หรือ APK ให้สำรองทั้ง `meterpatrol-release.p12` และ `password.txt` ไว้ส่วนตัวและใช้กุญแจเดิมเมื่อสร้างเวอร์ชันใหม่ ห้ามอัปโหลดโฟลเดอร์นี้ไป GitHub หากไม่มีคู่กุญแจเดิม ไฟล์ที่สร้างใหม่จะไม่สามารถติดตั้งทับแอปเดิมได้

ใช้ `--signing-dir /path/to/private-backup` เพื่อเลือกกุญแจสำรอง สคริปต์จะหยุดถ้าพบเพียงไฟล์กุญแจหรือรหัสผ่านอย่างใดอย่างหนึ่ง เพื่อไม่สร้างทับคู่กุญแจที่มีอยู่

เมื่อออกเวอร์ชันใหม่ ให้เพิ่ม `versionCode` และปรับ `versionName` ใน AndroidManifest.xml, ข้อความเวอร์ชันใน strings.xml และชื่อไฟล์ APK/ตัวตรวจตามเวอร์ชันด้วย หากเปลี่ยน deployment URL ให้แก้ `WEB_URL` ใน MainActivity.java แล้วสร้างและแจก APK ใหม่

## ทดสอบตัวอ่าน Native จากซอร์ส

หลังสร้าง APK แล้ว สามารถตรวจ logic ที่ใช้กับกล้องจริงโดยไม่ต้องมี emulator:

```sh
java -jar android/.toolchain/downloads/ecj.jar -source 1.8 -target 1.8 -proc:none -bootclasspath android/.toolchain/android-35/android.jar -classpath android/.toolchain/downloads/zxing-core.jar:android/.build/classes -d android/.build/test-classes android/tests/BarcodeDecoderTest.java
java -cp android/.build/test-classes:android/.build/classes:android/.toolchain/downloads/zxing-core.jar BarcodeDecoderTest
node patrol-google/check-native-pea-handoff.cjs
```

APK รวม Apache-2.0 license ของ ZXing ไว้ใน assets/ZXING-LICENSE.txt และมีสำเนาในโฟลเดอร์ Android พร้อม ANDROIDX-NOTICE.txt สำหรับ public Custom Tabs AIDL interfaces จาก AndroidX Browser 1.8.0 สคริปต์ตรวจ SHA-256 ของ AAR แล้วใช้เฉพาะ IPC interfaces ไม่รวม AndroidX UI stack
