"""Offline-consistent Compose data backup. Run on the NAS repository root."""
import argparse
from datetime import datetime, timezone
import os
import json
from pathlib import Path
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]

def compose(*args):
    return subprocess.check_output(['docker','compose','--profile','push','--profile','admin',*args],cwd=ROOT,text=True).strip()

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--data', type=Path, help='Optional assertion of the configured data directory')
    parser.add_argument('--output', type=Path, required=True, help='Private backup directory outside the repository/data')
    args=parser.parse_args()
    config=json.loads(compose('config','--format','json'))
    mounts=[volume for volume in config['services']['api']['volumes'] if volume['target']=='/data']
    if len(mounts)!=1 or mounts[0]['type']!='bind': raise SystemExit('Expected one bind mount at /data')
    source=Path(mounts[0]['source']).resolve(); target=args.output.resolve()
    if args.data and args.data.resolve()!=source: raise SystemExit('--data differs from the Compose /data mount')
    if not source.is_dir(): raise SystemExit('Data directory does not exist')
    if target.is_relative_to(source) or target.is_relative_to(ROOT): raise SystemExit('Choose a backup directory outside data and repository')
    target.mkdir(parents=True,exist_ok=True,mode=0o700)
    running=compose('ps','--services','--status','running').split()
    archive=target/('idphoto-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')+'.tar.gz')
    try:
        if running: compose('stop','--timeout','60',*running)
        descriptor=os.open(archive,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(descriptor,'wb') as stream, tarfile.open(fileobj=stream,mode='w:gz') as tar:
            tar.add(source,arcname='data')
            for name in ('.env','backend/.env.docker','backend/.env.push','backend/.env.admin'):
                path=ROOT/name
                if path.is_file(): tar.add(path,arcname='config/'+name)
        print('Backup created:',archive)
    finally:
        if running: compose('start',*running)

if __name__=='__main__': main()
