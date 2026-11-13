#!/usr/bin/env python3
"""Build a signed universal APK with pinned Android tools; no Gradle or JDK compiler required."""
import argparse
import hashlib
import json
from pathlib import Path
import secrets
import shutil
import subprocess
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent
ARCHIVES = {
    'build-tools.zip': (
        'https://dl.google.com/android/repository/build-tools_r35_linux.zip',
        'bd3a4966912eb8b30ed0d00b0cda6b6543b949d5ffe00bea54c04c81e1561d88'),
    'platform.zip': (
        'https://dl.google.com/android/repository/platform-35_r02.zip',
        '0988cacad01b38a18a47bac14a0695f246bc76c1b06c0eeb8eb0dc825ab0c8e0'),
    'ecj.jar': (
        'https://repo.maven.apache.org/maven2/org/eclipse/jdt/ecj/3.39.0/ecj-3.39.0.jar',
        '01f5a92ac19bb2b3bf85e295a68f2c73c264369109158b566ce9b490af982948'),
}


def sha256(path):
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def run(*args, capture=False):
    result = subprocess.run([str(arg) for arg in args], cwd=ROOT, check=True,
                            text=True, capture_output=capture)
    return result.stdout if capture else ''


def tools(cache, downloads):
    cache.mkdir(parents=True, exist_ok=True)
    downloads.mkdir(parents=True, exist_ok=True)
    for name, (url, digest) in ARCHIVES.items():
        archive = downloads / name
        if not archive.exists():
            partial = archive.with_suffix('.part')
            print('Downloading', name, flush=True)
            with urllib.request.urlopen(url, timeout=120) as source, partial.open('wb') as target:
                shutil.copyfileobj(source, target)
            partial.replace(archive)
        if sha256(archive) != digest:
            raise RuntimeError('Checksum mismatch: ' + str(archive))
        if name.endswith('.zip'):
            marker = cache / (name + '.sha256')
            if marker.exists() and marker.read_text().strip() == digest:
                continue
            with zipfile.ZipFile(archive) as package:
                for entry in package.infolist():
                    destination = (cache / entry.filename).resolve()
                    if not destination.is_relative_to(cache.resolve()):
                        raise RuntimeError('Unsafe archive entry')
                package.extractall(cache)
                for entry in package.infolist():
                    mode = entry.external_attr >> 16
                    path = cache / entry.filename
                    if path.is_file() and mode & 0o111:
                        path.chmod(0o755)
            marker.write_text(digest + '\n')
    build_tools = cache / 'android-15'
    for name in ['aapt2', 'zipalign']:
        (build_tools / name).chmod(0o755)
    return build_tools, cache / 'android-35' / 'android.jar', downloads / 'ecj.jar'


def signing_key(directory):
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    key = directory / 'meterpatrol-release.p12'
    password = directory / 'password.txt'
    if key.exists() != password.exists():
        raise RuntimeError('Signing key and password must both exist. Restore the private signing backup.')
    if not key.exists():
        password.write_text(secrets.token_urlsafe(36) + '\n')
        password.chmod(0o600)
        run('keytool', '-genkeypair', '-keystore', key, '-storetype', 'PKCS12',
            '-storepass:file', password, '-keypass:file', password, '-alias', 'meterpatrol',
            '-keyalg', 'RSA', '-keysize', '3072', '-sigalg', 'SHA256withRSA', '-validity', '10000',
            '-dname', 'CN=MeterPatrol Android Launcher', '-noprompt')
        key.chmod(0o600)
    return key, password


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tool-cache', type=Path, default=ROOT / '.toolchain')
    parser.add_argument('--download-cache', type=Path)
    parser.add_argument('--signing-dir', type=Path, default=ROOT / '.signing')
    parser.add_argument('--output', type=Path, default=ROOT / 'releases' / 'MeterPatrol-1.0.0.apk')
    args = parser.parse_args()
    for executable in ['java', 'keytool']:
        if not shutil.which(executable):
            parser.error(executable + ' is required (Java 21 recommended)')
    cache = args.tool_cache.resolve()
    downloads = (args.download_cache or cache / 'downloads').resolve()
    build_tools, android_jar, compiler = tools(cache, downloads)
    build = ROOT / '.build'
    if build.exists():
        shutil.rmtree(build)
    for folder in ['generated', 'classes', 'dex']:
        (build / folder).mkdir(parents=True, exist_ok=True)
    resources = build / 'resources.zip'
    unsigned = build / 'unsigned.apk'
    run(build_tools / 'aapt2', 'compile', '--dir', ROOT / 'res', '-o', resources)
    run(build_tools / 'aapt2', 'link', '-o', unsigned, '--manifest', ROOT / 'AndroidManifest.xml',
        '-I', android_jar, '--java', build / 'generated', resources)
    sources = sorted((ROOT / 'src').rglob('*.java')) + sorted((build / 'generated').rglob('*.java'))
    run('java', '-jar', compiler, '-source', '1.8', '-target', '1.8', '-encoding', 'UTF-8',
        '-proc:none', '-bootclasspath', android_jar, '-d', build / 'classes', *sources)
    classes = build / 'classes.jar'
    with zipfile.ZipFile(classes, 'w', zipfile.ZIP_DEFLATED) as package:
        for path in sorted((build / 'classes').rglob('*.class')):
            package.write(path, path.relative_to(build / 'classes'))
    run('java', '-cp', build_tools / 'lib/d8.jar', 'com.android.tools.r8.D8', '--lib', android_jar,
        '--min-api', '23', '--output', build / 'dex', classes)
    with zipfile.ZipFile(unsigned, 'a', zipfile.ZIP_DEFLATED) as package:
        package.write(build / 'dex/classes.dex', 'classes.dex')
    aligned = build / 'aligned.apk'
    run(build_tools / 'zipalign', '-f', '4', unsigned, aligned)
    key, password = signing_key(args.signing_dir.resolve())
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    signer = build_tools / 'lib/apksigner.jar'
    run('java', '-jar', signer, 'sign', '--ks', key, '--ks-key-alias', 'meterpatrol',
        '--ks-pass', 'file:' + str(password),
        '--v4-signing-enabled', 'false', '--out', output, aligned)
    verification = run('java', '-jar', signer, 'verify', '--verbose', '--print-certs', output, capture=True)
    run(build_tools / 'zipalign', '-c', '4', output)
    metadata = run(build_tools / 'aapt2', 'dump', 'badging', output, capture=True)
    report = {
        'apk': output.name,
        'bytes': output.stat().st_size,
        'sha256': sha256(output),
        'signature_verification': verification.splitlines(),
        'android_metadata': metadata.splitlines(),
        'device_testing': 'Not installed on a physical Android device; Google login requires an authorized account.',
    }
    output.with_suffix('.verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    output.with_suffix('.apk.sha256').write_text(report['sha256'] + '  ' + output.name + '\n')
    print('Created:', output)
    print('Bytes:', report['bytes'])
    print('SHA-256:', report['sha256'])
    print('Private signing key (keep off GitHub):', key)


if __name__ == '__main__':
    main()
