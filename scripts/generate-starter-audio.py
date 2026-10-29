#!/usr/bin/env python3
"""Generate ONLY generic catalog audio. Requires AWS CLI, no additional packages.

Polly neural Cantonese is available in Singapore, not the current HK endpoint.
No user text or user recordings enter this script. Generated MP3s are bundled in
the HK-hosted app, cached offline, and cause no runtime speech API charges.
"""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parent.parent
CATALOG = json.loads((ROOT / 'src/local/aac/catalog.json').read_text())
VOICES = {'yue': ('Hiujin', 'yue-CN'), 'en': ('Amy', 'en-GB'), 'cmn': ('Zhiyu', 'cmn-CN')}
ENTRIES = CATALOG['words'] + CATALOG['phrases']
MANIFEST = ROOT / 'public/audio/manifest.json'
previous = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}


def generate(task):
    language, entry = task
    voice, code = VOICES[language]
    text = entry[language]
    key = f"{language}/{entry['id']}.mp3"
    digest = hashlib.sha256((voice + ':' + text).encode()).hexdigest()
    destination = ROOT / 'public/audio' / key
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and previous.get(key) == digest:
        return key, digest
    for attempt in range(5):
        result = subprocess.run([
            'aws', 'polly', 'synthesize-speech', '--region', 'ap-southeast-1',
            '--engine', 'neural', '--voice-id', voice, '--language-code', code,
            '--output-format', 'mp3', '--text-type', 'text', '--text', text,
            str(destination), '--output', 'json'
        ], capture_output=True, text=True)
        if result.returncode == 0 and destination.stat().st_size > 100:
            return key, digest
        if 'Throttling' not in result.stderr:
            raise RuntimeError(f'{key}: {result.stderr[:500]}')
        time.sleep(2 ** attempt)
    raise RuntimeError(f'{key}: synthesis retry limit reached')


if __name__ == '__main__':
    tasks = [(language, entry) for language in VOICES for entry in ENTRIES]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        generated = dict(pool.map(generate, tasks))
    MANIFEST.write_text(json.dumps(generated, indent=2) + '\n')
    print(f'Generated/verified {len(generated)} generic audio clips.')
