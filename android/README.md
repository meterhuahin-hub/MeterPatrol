# แอป Android: งาน WBS และ Patrol

[ดาวน์โหลด MeterPatrol-1.1.0.apk](releases/MeterPatrol-1.1.0.apk?raw=true)

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

## สแกนบาร์โค้ดด้วยกล้อง Native ใน APK 1.1.0

ติดตั้ง APK ใหม่ทับตัวเดิมได้ โดยใช้ package และใบเซ็นเดิม มีตัวอ่าน ZXing Core 3.5.3 รวมในแอป การสแกนใช้กล้องของ Android โดยตรง ไม่เรียกกล้อง Chrome ไม่ต้องใช้ Google Play services หรือดาวน์โหลดโมดูลเพิ่ม ไม่ส่งภาพไปเซิร์ฟเวอร์

**อัปเดตช่อง PEA ในเว็บ:** แทน `patrol-google/Index.html` แล้ว Deploy เวอร์ชันใหม่ด้วย URL เดิม โค้ดเว็บจะเปิด `meterpatrol://scan` ผ่าน Android Intent โดยไม่ส่งรหัสผ่านหรือ session token ไปในลิงก์ ถ้า APK รุ่นใหม่ยังไม่ติดตั้งจะมีลิงก์ดาวน์โหลด ไม่มีการเปลี่ยนสิทธิ์ล็อกอิน Google

1. ในฟอร์ม WBS/Patrol กด **สแกนบาร์โค้ด** กล้องของ APK จะเปิด ขออนุญาตกล้องครั้งแรก
2. เล็งให้บาร์โค้ดอยู่ครบทั้งสองด้าน แตะภาพเพื่อโฟกัสได้ ระบบตรวจเลขตรงกันสองครั้งแล้วหยุดกล้อง
3. ตรวจเลขแล้วกด **ใช้เลขนี้และกลับไปวางในช่อง PEA** แอปคัดลอกตัวเลขและกลับไปหน้าก่อนหน้า
4. ในเว็บ กด **วางเลขที่สแกนลง PEA** ตรวจเลขอีกครั้งแล้วกด **ใช้หมายเลข PEA**

ถ้าเบราว์เซอร์ไม่อนุญาตอ่านคลิปบอร์ด ให้กด **วางด้วยตนเองในช่อง PEA** แล้วแตะช่องค้างและเลือก **วาง** วิธีนี้ไม่ใช้สิทธิ์กล้องของ Chrome และไม่ต้องถ่ายรูป ระบบไม่บันทึกงานอัตโนมัติ

**ข้อจำกัดการส่งผล:** APK ใช้ Chrome Custom Tabs เพื่อคง Google login เบราว์เซอร์จึงไม่มี JavaScript bridge ให้แอปเขียนช่องเว็บโดยตรง เวอร์ชันนี้ส่งผ่านคลิปบอร์ดและต้องให้ผู้ใช้กดวาง/ยืนยัน ไม่ได้กรอกข้ามแอปโดยเงียบ ๆ ไม่ใช้ WebView และไม่เปลี่ยนสิทธิ์ของ deployment

เปิดกล้องจากปุ่ม **สแกนบาร์โค้ดด้วยกล้อง APK** ในหน้าหลักของแอปได้ด้วย (กดย้อนกลับจากเว็บจะพบหน้านี้) สแกนแล้วกลับไปกรอก/วางเลขในเว็บได้ตามปกติ

## สิ่งที่ตรวจแล้ว

สร้าง APK สำเร็จ ตรวจ signature ด้วย Android apksigner ผ่าน v1/v2/v3 และตรวจ zip alignment, package/activity, Android SDK และ URL ที่ฝังในไฟล์ รวมถึงการใช้ใบเซ็นเดียวกับ 1.0.0 แล้ว ผลและ SHA-256 อยู่ใน `releases/`:

```sh
python android/check_apk.py
```

ทดสอบตัวถอดรหัส Native ด้วย Java ผ่าน CODE128/ITF จริงที่สร้างเป็นภาพ luminance รวมถึงภาพหมุนและศูนย์นำหน้า และทดสอบเว็บรับค่าจากคลิปบอร์ดใน Chromium แล้ว แต่ยังไม่ได้ติดตั้ง APK บนอุปกรณ์ Android จริงหรือทดสอบกล้องจริงและเข้าสู่ระบบด้วยบัญชี Google ที่ได้รับอนุญาต การเปิด URL จากสภาพแวดล้อมที่ใช้สร้างไฟล์ถูกปฏิเสธโดยเครือข่าย จึงไม่ได้ยืนยันการเข้าเว็บแทนผู้ใช้

หลังติดตั้ง ให้ตรวจการล็อกอิน เปิดงาน อนุญาตกล้อง/GPS และกลับเข้าแอปอีกครั้งบนมือถือจริง หากเลือกบัญชีผิด ให้เปลี่ยนบัญชีในเบราว์เซอร์หรือใช้ปุ่มเลือกเบราว์เซอร์อื่น

## สร้าง APK จากซอร์ส

ต้องมี Linux x86-64, Python 3.11 ขึ้นไป, Java และ keytool (แนะนำ Java 21) ไม่ต้องติดตั้ง Gradle หรือ javac สคริปต์ดาวน์โหลด Android Build Tools 35, Android API 35 , ZXing Core 3.5.3 และ Eclipse Java compiler จากแหล่งต้นทางโดยตรวจ SHA-256 ที่ระบุไว้ในสคริปต์

```sh
python android/build.py
python android/check_apk.py
```

ไฟล์ติดตั้งอยู่ที่ `android/releases/MeterPatrol-1.1.0.apk` แคชเครื่องมือและผลระหว่างสร้างถูกละเว้นจาก Git

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

APK รวม Apache-2.0 license ของ ZXing ไว้ใน assets/ZXING-LICENSE.txt และมีสำเนาในโฟลเดอร์ Android
