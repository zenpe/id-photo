"""Full runtime test for the built Docker image; no outbound WeChat calls."""
import base64
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

data=tempfile.TemporaryDirectory()
os.environ.update(IDPHOTO_DATA_DIR=data.name, IDPHOTO_AUTH_REQUIRED='true', IDPHOTO_TOKEN_SECRET='x'*64,
                  WECHAT_APP_ID='wx0000000000000000',WECHAT_APP_SECRET='test-only',WECHAT_PUSH_TOKEN='test-token',
                  WECHAT_PUSH_AES_KEY=base64.b64encode(b'x'*32).decode().rstrip('='),IDPHOTO_PAYMENT_ENABLED='false',
                  IDPHOTO_ASYNC_MEDIA_ENABLED='false',IDPHOTO_SAVE_MODE='free',IDPHOTO_ADMIN_PORT='8091')
sys.path.insert(0,str(Path(__file__).parents[1]/'backend/hivision-overlay'))
from fastapi.testclient import TestClient
import deploy_api
import miniapp_admin
import miniapp_push
from miniapp_security import issue_token

class DeploymentTests(unittest.TestCase):
    def test_api_default_policy_and_async_guard(self):
        with TestClient(deploy_api.app) as client:
            self.assertEqual(client.get('/health').status_code,200)
            self.assertEqual(client.get('/health').headers['cache-control'],'no-store')
            response=client.get('/capabilities')
            self.assertEqual(response.headers['cache-control'],'no-store')
            self.assertEqual(response.json()['saveMode'],'free')
            self.assertEqual(client.post('/idphoto').status_code,401)
            self.assertEqual(client.post('/content-security/media',json={'media_url':'https://ci.invalid/test.jpg'},headers={'Authorization':'Bearer '+issue_token('fixture')}).status_code,503)
    def test_push_health_and_signature(self):
        with TestClient(miniapp_push.app) as client:
            self.assertEqual(client.get('/health').json()['service'],'push')
            self.assertEqual(client.get('/payment/notify').status_code,403)
    def test_admin_assets_and_network_boundary(self):
        root=Path(data.name);root.mkdir(exist_ok=True)
        salt=b'test-only-salt'; password='test-only-password'
        (root/'admin.json').write_text(json.dumps({'salt':base64.b64encode(salt).decode(),'hash':base64.b64encode(hashlib.scrypt(password.encode(),salt=salt,n=16384,r=8,p=1,dklen=32)).decode()}))
        with TestClient(miniapp_admin.app,base_url='http://127.0.0.1:8091',client=('127.0.0.1',1234)) as client:
            self.assertEqual(client.get('/health').status_code,200)
            self.assertEqual(client.get('/').status_code,401)
            for path in ('/','/admin.css','/admin.js'):
                self.assertEqual(client.get(path,auth=('admin',password)).status_code,200)
        with TestClient(miniapp_admin.app,base_url='http://127.0.0.1:8091',client=('172.18.0.2',1234)) as client:
            self.assertEqual(client.get('/').status_code,403)

if __name__=='__main__':unittest.main()
