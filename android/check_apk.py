#!/usr/bin/env python3
"""Check that the published APK matches its build report and the intended launcher source."""
import hashlib
import json
from pathlib import Path
import re
import zipfile

root = Path(__file__).resolve().parent
apk = root / 'releases/MeterPatrol-1.0.0.apk'
report = json.loads(apk.with_suffix('.verification.json').read_text())
source = (root / 'src/th/meterhuahin/meterpatrol/MainActivity.java').read_text()
url = re.search(r'WEB_URL = "([^"]+)"', source).group(1)
assert url.startswith('https://script.google.com/macros/s/') and url.endswith('/exec')
assert hashlib.sha256(apk.read_bytes()).hexdigest() == report['sha256']
assert apk.stat().st_size == report['bytes']
assert report['signature_verification'][0] == 'Verifies'
for version in [1, 2, 3]:
    assert any(line.startswith('Verified using v' + str(version) + ' scheme') and line.endswith('true')
               for line in report['signature_verification'])
metadata = '\n'.join(report['android_metadata'])
assert "package: name='th.meterhuahin.meterpatrol'" in metadata
assert "minSdkVersion:'23'" in metadata and "targetSdkVersion:'35'" in metadata
assert "launchable-activity: name='th.meterhuahin.meterpatrol.MainActivity'" in metadata
assert 'uses-permission:' not in metadata
with zipfile.ZipFile(apk) as package:
    assert package.testzip() is None
    assert {'AndroidManifest.xml', 'classes.dex', 'resources.arsc'}.issubset(package.namelist())
    dex = package.read('classes.dex')
    assert dex.startswith(b'dex\n')
    assert url.encode() in dex
    assert b'android.support.customtabs.extra.SESSION' in dex
    assert b'Landroid/webkit/WebView;' not in dex
    assert not any(name.endswith('.so') for name in package.namelist()), 'APK must work across CPU architectures'
print('PASS APK integrity, v1/v2/v3 signature report, launcher metadata, exact Apps Script URL, browser Custom Tabs and no WebView/native libraries/device permissions')
