import tempfile
import time
import unittest
from pathlib import Path
import app

class AppTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.old_db = app.DB
        app.DB = Path(self.tmp.name) / 'test.sqlite3'
        self.client = app.app.test_client()
        app.create_user('inspector', 'test-password-only-123')
        r = self.client.post('/api/login', json={'username':'inspector','password':'test-password-only-123'}, headers={'X-MeterPatrol':'1'})
        self.csrf = r.json['csrf']

    def tearDown(self):
        app.DB = self.old_db; self.tmp.cleanup()

    def sample(self):
        return dict(date='2026-10-08',surveyor='สมชาย',location='หัวหิน',meter='M001',type='น้ำ',reading='123.5',notes='ตรวจแล้ว',items=[dict(name='วาล์ว',damaged=2,new=3)])

    def test_save_and_reload(self):
        r=self.client.post('/api/surveys',json=self.sample(),headers={'X-CSRF-Token':self.csrf})
        self.assertEqual(r.status_code,201)
        rows=self.client.get('/api/surveys').json
        self.assertEqual(rows[0]['location'],'หัวหิน'); self.assertEqual(rows[0]['items'][0]['damaged'],2)

    def test_invalid_data(self):
        for changes in ({'meter':''},{'date':'bad'},{'reading':'nan'},{'items':[dict(name='วาล์ว',damaged=-1,new=0)]}):
            self.assertEqual(self.client.post('/api/surveys',json=self.sample()|changes,headers={'X-CSRF-Token':self.csrf}).status_code,400)
        self.assertEqual(self.client.get('/api/surveys').json,[])

    def test_auth_and_csrf(self):
        anon=app.app.test_client()
        self.assertEqual(anon.get('/').status_code,302)
        self.assertEqual(anon.get('/api/surveys').status_code,401)
        self.assertEqual(anon.post('/api/surveys',json=self.sample()).status_code,401)
        self.assertEqual(self.client.post('/api/surveys',json=self.sample()).status_code,403)
        self.assertEqual(self.client.post('/api/logout',headers={'X-CSRF-Token':self.csrf}).status_code,200)
        self.assertEqual(self.client.get('/api/surveys').status_code,401)

    def test_password_reset_and_expiry(self):
        app.create_user('inspector','replacement-password-123')
        self.assertEqual(self.client.get('/api/me').status_code,401)
        r=self.client.post('/api/login',json={'username':'inspector','password':'replacement-password-123'},headers={'X-MeterPatrol':'1'})
        self.assertEqual(r.status_code,200)
        with app.connect() as conn: conn.execute('UPDATE sessions SET expires=?',(time.time()-1,))
        self.assertEqual(self.client.get('/api/me').status_code,401)

    def test_login_limits_cookie_and_hash(self):
        r=self.client.post('/api/login',json={'username':'inspector','password':'test-password-only-123'},headers={'X-MeterPatrol':'1'})
        for flag in ('Secure','HttpOnly','SameSite=Lax'): self.assertIn(flag,r.headers['Set-Cookie'])
        with app.connect() as conn:
            self.assertNotIn('test-password-only-123',conn.execute('SELECT password_hash FROM users').fetchone()[0])
        for _ in range(5):
            self.assertEqual(self.client.post('/api/login',json={'username':'inspector','password':'wrong'},headers={'X-MeterPatrol':'1'}).status_code,401)
        self.assertEqual(self.client.post('/api/login',json={'username':'inspector','password':'test-password-only-123'},headers={'X-MeterPatrol':'1'}).status_code,429)
        self.assertEqual(self.client.post('/api/login',json={}).status_code,403)

    def test_pages_and_health(self):
        for path in ('/','/app.js','/style.css','/login','/login.js','/health'):
            with self.client.get(path) as response: self.assertEqual(response.status_code,200)
        self.assertEqual(self.client.get('/missing').status_code,404)
        with self.client.get('/') as response: self.assertEqual(response.headers['Cache-Control'],'no-store')

if __name__=='__main__': unittest.main()
