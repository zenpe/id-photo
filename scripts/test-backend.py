"""Run isolated backend regressions without real WeChat/payment requests."""
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
env = dict(os.environ)
env['PYTHONPATH'] = os.pathsep.join(str(ROOT / 'backend' / name) for name in ('hivision-overlay', 'hivision-core'))
env['PYTHONDONTWRITEBYTECODE'] = '1'
tests = [
    'face-detection', 'capabilities', 'security-cache', 'startup-concurrency',
    'image-runtime', 'image-processing', 'content-security-watermark', 'membership-profile',
    'membership-refund', 'membership-refund-entitlements', 'membership-direct-refund',
    'deployment',
]
for name in tests:
    print(f'Running {name}', flush=True)
    result = subprocess.run([sys.executable, str(ROOT / 'tests' / f'{name}.test.py')], cwd=ROOT, env=env)
    if result.returncode:
        raise SystemExit(result.returncode)
print(f'{len(tests)} backend regression suites passed')
