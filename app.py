import csv
import io
import json
import os
import sqlite3
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).parent
DB = Path(os.environ.get('METERPATROL_DB', str(ROOT / 'data' / 'surveys.sqlite3')))

def connect():
    DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute('CREATE TABLE IF NOT EXISTS surveys (id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, payload TEXT NOT NULL)')
    return conn

def validate(data):
    if not isinstance(data, dict):
        raise ValueError('ข้อมูลไม่ถูกต้อง')
    result = {}
    for key in ('date', 'surveyor', 'location', 'meter', 'type', 'reading', 'notes'):
        value = data.get(key, '')
        if not isinstance(value, str) or len(value) > 2000:
            raise ValueError('ข้อความยาวเกินไปหรือไม่ถูกต้อง')
        result[key] = value.strip()
    for key in ('date', 'surveyor', 'location', 'meter'):
        if not result[key]:
            raise ValueError('กรุณาระบุวันที่ ผู้สำรวจ สถานที่ และเลขมิเตอร์')
    datetime.strptime(result['date'], '%Y-%m-%d')
    if result['type'] not in ('น้ำ', 'ไฟฟ้า', 'อื่น ๆ'):
        raise ValueError('ประเภทมิเตอร์ไม่ถูกต้อง')
    if result['reading']:
        import math
        reading = float(result['reading'])
        if not math.isfinite(reading) or reading < 0:
            raise ValueError('เลขอ่านมิเตอร์ต้องเป็นจำนวนตั้งแต่ศูนย์')
    items = data.get('items', [])
    if not isinstance(items, list) or len(items) > 100:
        raise ValueError('รายการอุปกรณ์ไม่ถูกต้อง')
    result['items'] = []
    for item in items:
        if not isinstance(item, dict):
            raise ValueError('รายการอุปกรณ์ไม่ถูกต้อง')
        name = item.get('name', '')
        if not isinstance(name, str) or not name.strip() or len(name) > 200:
            raise ValueError('กรุณาระบุชื่ออุปกรณ์')
        clean = {'name': name.strip()}
        for key in ('damaged', 'new'):
            number = item.get(key)
            if type(number) is not int or not 0 <= number <= 1000000:
                raise ValueError('จำนวนอุปกรณ์ต้องเป็นจำนวนเต็มตั้งแต่ศูนย์')
            clean[key] = number
        result['items'].append(clean)
    return result

class Handler(BaseHTTPRequestHandler):
    def send(self, status, body, content_type='application/json; charset=utf-8'):
        if not isinstance(body, bytes):
            body = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == '/api/surveys':
            with connect() as conn:
                rows = conn.execute('SELECT * FROM surveys ORDER BY id DESC').fetchall()
            self.send(200, [dict(id=r['id'], created_at=r['created_at'], **json.loads(r['payload'])) for r in rows])
        elif self.path in ('/', '/app.js', '/style.css'):
            name = 'index.html' if self.path == '/' else self.path[1:]
            mime = {'index.html': 'text/html', 'app.js': 'text/javascript', 'style.css': 'text/css'}[name]
            self.send(200, (ROOT / 'static' / name).read_bytes(), mime + '; charset=utf-8')
        else:
            self.send(404, {'error': 'ไม่พบข้อมูล'})

    def do_POST(self):
        if self.path != '/api/surveys':
            return self.send(404, {'error': 'ไม่พบข้อมูล'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 100000:
                return self.send(413, {'error': 'ขนาดข้อมูลไม่ถูกต้อง'})
            data = validate(json.loads(self.rfile.read(length)))
        except (ValueError, TypeError, UnicodeError):
            return self.send(400, {'error': 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบช่องที่จำเป็น วันที่ และจำนวนอุปกรณ์'})
        with connect() as conn:
            cursor = conn.execute('INSERT INTO surveys(created_at,payload) VALUES (?,?)', (datetime.now().isoformat(), json.dumps(data, ensure_ascii=False)))
            record_id = cursor.lastrowid
        self.send(201, {'id': record_id})

if __name__ == '__main__':
    connect().close()
    ThreadingHTTPServer((os.environ.get('HOST', '127.0.0.1'), int(os.environ.get('PORT', '8000'))), Handler).serve_forever()
