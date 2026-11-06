"""Exercise real middleware caching behavior without inference imports."""
import ast
from collections import defaultdict, deque
from contextvars import ContextVar
import os
from pathlib import Path
import time
import unittest
from starlette.responses import JSONResponse

source=Path(__file__).parents[1]/'backend/hivision-overlay/miniapp_security.py'
tree=ast.parse(source.read_text(encoding='utf8'))
node=next(item for item in tree.body if isinstance(item,ast.ClassDef) and item.name=='SecurityMiddleware')
namespace=dict(defaultdict=defaultdict,deque=deque,os=os,time=time,JSONResponse=JSONResponse,
               auth_enabled=lambda:True,verify_token=lambda _:None,PUBLIC_PATHS={'/health'},
               MAX_BODY_BYTES=28*1024*1024,_request_subject=ContextVar('test-subject',default=None))
exec(compile(ast.Module(body=[node],type_ignores=[]),'middleware','exec'),namespace)

class CacheTests(unittest.IsolatedAsyncioTestCase):
    async def response(self,path):
        messages=[]
        async def app(scope,receive,send):
            await send({'type':'http.response.start','status':200,'headers':[(b'cache-control',b'public,max-age=3600'),(b'x-fixture',b'yes')]})
            await send({'type':'http.response.body','body':b'ok'})
        async def receive():return {'type':'http.request','body':b'','more_body':False}
        async def send(message):messages.append(message)
        await namespace['SecurityMiddleware'](app)({'type':'http','path':path,'headers':[],'client':('127.0.0.1',1),'method':'GET'},receive,send)
        return messages[0]
    async def test_public_response_overrides_cache_without_losing_other_headers(self):
        response=await self.response('/health')
        self.assertEqual(response['status'],200)
        self.assertEqual(dict(response['headers'])[b'cache-control'],b'no-store')
        self.assertEqual(dict(response['headers'])[b'x-fixture'],b'yes')
    async def test_unauthorized_responses_also_cannot_be_cached(self):
        response=await self.response('/idphoto')
        self.assertEqual(response['status'],401)
        self.assertEqual(dict(response['headers'])[b'cache-control'],b'no-store')

if __name__=='__main__':unittest.main()
