"""Read-only structural check after extracting a backup to a NEW directory."""
import argparse
from pathlib import Path
import sqlite3

def main():
    parser=argparse.ArgumentParser();parser.add_argument('data',type=Path);args=parser.parse_args()
    root=args.data.resolve()
    key=root/'identity.key'
    if not key.is_file() or key.stat().st_size!=32: raise SystemExit('identity.key missing or invalid; do not start against this backup')
    database=root/'membership.sqlite3'
    with sqlite3.connect(database.as_uri()+'?mode=ro',uri=True) as db:
        assert db.execute('PRAGMA quick_check').fetchone()[0]=='ok','Database integrity failed'
        assert not db.execute('PRAGMA foreign_key_check').fetchall(),'Foreign key mismatch'
        db.execute('SELECT count(*) FROM identity_users').fetchone()
    print('Restored data structure passed; verify actual membership and order access before switching production')

if __name__=='__main__': main()
