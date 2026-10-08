import json
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer
import app

class SurveyTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.old_db = app.DB
        app.DB = Path(self.tmp.name) / 'test.sqlite3'
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), app.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}'

    def tearDown(self):
        self.server.shutdown(); self.thread.join(); self.server.server_close()
        app.DB = self.old_db; self.tmp.cleanup()

    def post(self, data):
        return urlopen(Request(self.url + '/api/surveys', data=json.dumps(data).encode(), headers={'Content-Type':'application/json'}))

    def sample(self):
        return dict(date='2026-10-08', surveyor='สมชาย', location='หัวหิน', meter='M001', type='น้ำ', reading='123.5', notes='ตรวจแล้ว', items=[dict(name='วาล์ว', damaged=2, new=3)])

    def test_save_and_reload(self):
        with self.post(self.sample()) as r:
            self.assertEqual(r.status, 201)
        with urlopen(self.url + '/api/surveys') as r:
            rows = json.load(r)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['items'][0]['damaged'], 2)
        self.assertEqual(rows[0]['location'], 'หัวหิน')
        with app.connect() as conn:
            self.assertEqual(conn.execute('SELECT count(*) FROM surveys').fetchone()[0], 1)

    def test_reject_invalid_data(self):
        for changes in ({'meter':''}, {'date':'bad'}, {'reading':'nan'}, {'items':[dict(name='วาล์ว',damaged=-1,new=0)]}, {'items':[dict(name='วาล์ว',damaged=1.5,new=0)]}):
            with self.subTest(changes=changes):
                with self.assertRaises(HTTPError) as error:
                    self.post(self.sample() | changes)
                self.assertEqual(error.exception.code, 400)
                error.exception.close()
        with urlopen(self.url + '/api/surveys') as r:
            self.assertEqual(json.load(r), [])

    def test_pages_and_unknown_path(self):
        for path, expected in (('/', 'MeterPatrol'), ('/app.js', 'window.print'), ('/style.css', '@media print')):
            with urlopen(self.url + path) as r:
                self.assertIn(expected, r.read().decode())
        with self.assertRaises(HTTPError) as error:
            urlopen(self.url + '/missing')
        self.assertEqual(error.exception.code,404)
        error.exception.close()

if __name__ == '__main__':
    unittest.main()
