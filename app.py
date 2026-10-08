import getpass
import hashlib
import json
import os
import secrets
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, redirect, g
from werkzeug.security import generate_password_hash, check_password_hash

ROOT = Path(__file__).parent
DB = Path(os.environ.get('METERPATROL_DB', str(ROOT / 'data' / 'surveys.sqlite3')))
SECURE = os.environ.get('COOKIE_SECURE', '1') != '0'
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100000


def connect():
    DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB, timeout=20)
    conn.row_factory = sqlite3.Row
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS surveys (id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, username TEXT NOT NULL, csrf TEXT NOT NULL, expires REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts (username TEXT PRIMARY KEY, failures INTEGER NOT NULL, until REAL NOT NULL);
    """)
    return conn


def create_user(username, password):
    if not username or len(username) > 100 or len(password) < 12:
        raise ValueError('ชื่อผู้ใช้ต้องยาว 1–100 ตัวอักษร และรหัสผ่านอย่างน้อย 12 ตัวอักษร')
    with connect() as conn:
        conn.execute('INSERT INTO users VALUES (?,?) ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash',
                     (username, generate_password_hash(password)))
        conn.execute('DELETE FROM sessions WHERE username=?', (username,))


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



def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


@app.before_request
def authenticate():
    g.session = None
    with connect() as conn:
        g.session = conn.execute('SELECT * FROM sessions WHERE token_hash=? AND expires>?',
            (token_hash(request.cookies.get('meter_session', '')), time.time())).fetchone()
    if request.path in ('/health', '/login', '/login.js', '/style.css'):
        return
    if request.path == '/api/login':
        if request.method == 'POST' and request.headers.get('X-MeterPatrol') != '1':
            return jsonify(error='คำขอไม่ถูกต้อง'), 403
        return
    if not g.session:
        if request.path.startswith('/api/'):
            return jsonify(error='กรุณาเข้าสู่ระบบ'), 401
        return redirect('/login')
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        if not secrets.compare_digest(request.headers.get('X-CSRF-Token', ''), g.session['csrf']):
            return jsonify(error='คำขอไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่'), 403


@app.after_request
def security_headers(response):
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'same-origin'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    if SECURE:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000'
    return response


@app.get('/health')
def health():
    with connect() as conn:
        conn.execute('SELECT 1').fetchone()
    return jsonify(status='ok')


@app.get('/login')
def login_page():
    return send_from_directory(ROOT / 'static', 'login.html')


@app.get('/login.js')
def login_script():
    return send_from_directory(ROOT / 'static', 'login.js')


@app.post('/api/login')
def login():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error='ข้อมูลไม่ถูกต้อง'), 400
    username, password = data.get('username'), data.get('password')
    if not isinstance(username, str) or not isinstance(password, str) or len(username)>100 or len(password)>1000:
        return jsonify(error='ข้อมูลไม่ถูกต้อง'), 400
    now = time.time()
    with connect() as conn:
        # Serialize the check/update across workers so parallel guesses cannot bypass limits.
        conn.execute('BEGIN IMMEDIATE')
        attempt = conn.execute('SELECT * FROM attempts WHERE username=?', (username,)).fetchone()
        if attempt and attempt['until']>now and attempt['failures']>=5:
            return jsonify(error='ลองหลายครั้งเกินไป กรุณารอ 15 นาที'), 429
        user = conn.execute('SELECT * FROM users WHERE username=?', (username,)).fetchone()
        valid = check_password_hash(user['password_hash'] if user else DUMMY_HASH, password)
        if not user or not valid:
            failures = attempt['failures'] + 1 if attempt and attempt['until']>now else 1
            conn.execute('INSERT INTO attempts VALUES (?,?,?) ON CONFLICT(username) DO UPDATE SET failures=excluded.failures,until=excluded.until', (username, failures, now+900))
            conn.execute('DELETE FROM attempts WHERE until<?', (now,))
            return jsonify(error='ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'), 401
        conn.execute('DELETE FROM attempts WHERE username=?', (username,))
        conn.execute('DELETE FROM sessions WHERE expires<?', (now,))
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        conn.execute('INSERT INTO sessions VALUES (?,?,?,?)', (token_hash(token), username, csrf, now+28800))
    response = jsonify(username=username, csrf=csrf)
    response.set_cookie('meter_session', token, max_age=28800, secure=SECURE, httponly=True, samesite='Lax', path='/')
    return response


DUMMY_HASH = generate_password_hash(secrets.token_urlsafe(32))


@app.get('/api/me')
def me():
    return jsonify(username=g.session['username'], csrf=g.session['csrf'])


@app.post('/api/logout')
def logout():
    with connect() as conn:
        conn.execute('DELETE FROM sessions WHERE token_hash=?', (g.session['token_hash'],))
    response = jsonify(ok=True)
    response.delete_cookie('meter_session', secure=SECURE, httponly=True, samesite='Lax')
    return response


@app.get('/api/surveys')
def list_surveys():
    with connect() as conn:
        rows = conn.execute('SELECT * FROM surveys ORDER BY id DESC').fetchall()
    return jsonify([dict(id=r['id'], created_at=r['created_at'], **json.loads(r['payload'])) for r in rows])


@app.post('/api/surveys')
def save_survey():
    try:
        data = validate(request.get_json(silent=True))
    except (ValueError, TypeError):
        return jsonify(error='ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบช่องที่จำเป็น วันที่ และจำนวนอุปกรณ์'), 400
    with connect() as conn:
        cursor = conn.execute('INSERT INTO surveys(created_at,payload) VALUES (?,?)', (datetime.now().isoformat(), json.dumps(data, ensure_ascii=False)))
        record_id = cursor.lastrowid
    return jsonify(id=record_id), 201


@app.get('/')
def index():
    return send_from_directory(ROOT / 'static', 'index.html')


@app.get('/<name>')
def assets(name):
    if name not in ('app.js', 'style.css'):
        return jsonify(error='ไม่พบข้อมูล'), 404
    return send_from_directory(ROOT / 'static', name)


if __name__ == '__main__':
    if len(sys.argv)>1 and sys.argv[1]=='create-user':
        username = input('ชื่อผู้ใช้: ').strip()
        password = getpass.getpass('รหัสผ่าน (อย่างน้อย 12 ตัวอักษร): ')
        if password != getpass.getpass('ยืนยันรหัสผ่าน: '):
            raise SystemExit('รหัสผ่านไม่ตรงกัน')
        create_user(username, password)
        print('บันทึกผู้ใช้แล้ว (session เดิมของผู้ใช้นี้ถูกยกเลิก)')
    else:
        app.run(host=os.environ.get('HOST','127.0.0.1'), port=int(os.environ.get('PORT','8000')), debug=False)
