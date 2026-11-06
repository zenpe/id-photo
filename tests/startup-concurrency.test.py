"""Concurrent role startup against a fresh SQLite directory, no user data."""
import ast
from concurrent.futures import ThreadPoolExecutor
import os
from pathlib import Path
import secrets
import sys
import tempfile
import unittest

OVERLAY=Path(__file__).parents[1]/'backend/hivision-overlay'
sys.path.insert(0,str(OVERLAY))
import miniapp_membership as membership

class StartupTests(unittest.TestCase):
    def test_concurrent_migrations_and_key_publication(self):
        with tempfile.TemporaryDirectory() as directory:
            membership.DATA_DIR=Path(directory)
            membership.DB_PATH=Path(directory)/'membership.sqlite3'
            tree=ast.parse((OVERLAY/'miniapp_identity.py').read_text(encoding='utf8'))
            function=next(node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name=='identity_key')
            namespace={'DATA_DIR':Path(directory),'database':membership.database,'os':os,'secrets':secrets}
            exec(compile(ast.Module(body=[function],type_ignores=[]),'identity_key','exec'),namespace)
            def start(_):
                membership.initialize()
                return namespace['identity_key']()
            with ThreadPoolExecutor(max_workers=6) as pool:
                keys=list(pool.map(start,range(6)))
            self.assertEqual(len(set(keys)),1)
            self.assertEqual(len(keys[0]),32)
            with membership.database() as db:
                self.assertEqual(db.execute('SELECT count(*) FROM plans').fetchone()[0],3)
                self.assertEqual(db.execute('PRAGMA quick_check').fetchone()[0],'ok')

if __name__=='__main__':unittest.main()
