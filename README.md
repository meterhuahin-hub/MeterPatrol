# MeterPatrol
เว็บแอปภาษาไทยสำหรับสำรวจมิเตอร์ อุปกรณ์ชำรุด/ใหม่ และรายงานพิมพ์หรือบันทึก PDF

## ฟอร์ม Patrol ที่ผู้ใช้ส่งมา
ดู [ชุดเชื่อมชีตที่ระบุและวิธีอัปเดตลิงก์เดิม](patrol-google/README.md) ใน `patrol-google/` ใช้แบบฟอร์มงาน TR/PEA พัสดุเก่า-ใหม่ และรูปก่อน/หลัง

## เวอร์ชัน Google Apps Script (แบบฟอร์มมิเตอร์ทั่วไป)
ดู [ขั้นตอนเผยแพร่และสิทธิ์ Google](apps-script/README.md) โค้ดอยู่ใน `apps-script/` ใช้ Google Sheets เก็บข้อมูล และเข้าผ่านบัญชี Google ไม่ต้อง deploy เว็บ Python ด้านล่าง

## พัฒนาเว็บ Python ในเครื่อง
Python 3.12 ขึ้นไป
```sh
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python app.py create-user
COOKIE_SECURE=0 .venv/bin/python app.py
```
เปิดพอร์ต 8000 ของเครื่องที่รันแอป ใช้ COOKIE_SECURE=0 เฉพาะการพัฒนาผ่าน HTTP ในเครื่อง ค่าเริ่มต้นใช้ secure cookies สำหรับ HTTPS

## เผยแพร่บน Render
ไฟล์ `render.yaml` เตรียม Web Service พร้อม persistent disk ขนาด 1 GB (บริการและ disk มีค่าใช้จ่าย โปรดตรวจสอบราคาก่อนสร้าง)
1. เข้า Render ด้วยบัญชีของคุณ เลือก New → Blueprint และเชื่อม GitHub repository `meterhuahin-hub/MeterPatrol`
2. ตรวจสอบรายการและค่าใช้จ่าย แล้วสร้างบริการตาม `render.yaml`
3. เมื่อ deploy เสร็จ เปิด Shell ของบริการ แล้วรัน `python app.py create-user` เพื่อกำหนดชื่อผู้ใช้และรหัสผ่านส่วนตัวอย่างน้อย 12 ตัวอักษร ห้ามส่งรหัสผ่านในแชตหรือ commit ลง Git
4. เปิด HTTPS URL ที่ Render จัดให้ เข้าสู่ระบบ ทดสอบบันทึกงานและออกรายงาน จากนั้น restart บริการและตรวจว่าข้อมูลยังอยู่

ข้อมูลเดิมใน cloud workspace ไม่ย้ายขึ้น Render อัตโนมัติ หากมีข้อมูลจริงให้สำรองและย้าย SQLite ก่อนใช้งาน

## ความปลอดภัยและข้อมูล
- รหัสผ่านจัดเก็บด้วย scrypt hash ไม่มีบัญชีหรือรหัสผ่านเริ่มต้น
- Session เก็บฝั่งเซิร์ฟเวอร์ อายุ 8 ชั่วโมง cookies เป็น Secure/HttpOnly/SameSite และป้องกัน CSRF
- จำกัดการลองรหัสผ่านผิด 5 ครั้งต่อชื่อผู้ใช้ใน 15 นาที
- ผู้ใช้ที่ผู้ดูแลสร้างทุกคนเห็นและบันทึกข้อมูลร่วมกัน ไม่มีสมัครสมาชิกสาธารณะ
- รัน `python app.py create-user` ด้วยชื่อเดิมเพื่อเปลี่ยนรหัสผ่านและยกเลิก session เดิม
- ฐานข้อมูล `data/surveys.sqlite3` หรือ `METERPATROL_DB` เก็บทั้งงานสำรวจและบัญชีผู้ใช้ สำรองด้วย SQLite backup API หรือหยุดบริการก่อนคัดลอกไฟล์ และจำกัดสิทธิ์ไฟล์สำรอง
- production ใช้ Gunicorn หลัง HTTPS proxy ไม่ใช้ Flask development server หรือเปิด debug
- Persistent disk รองรับบริการ instance เดียว ไม่ scale หลาย instance โดยแชร์ SQLite
- ยังไม่มีแก้ไข/ลบงาน แนบรูป ส่งออก Word หรือรีเซ็ตรหัสผ่านทางอีเมล

## ทดสอบ
```sh
.venv/bin/python -m unittest -v
```
