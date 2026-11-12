const assert = require('assert'), fs = require('fs'), ts = require('typescript'), vm = require('vm');
const config = {baseUrl:'https://ci.invalid',adConfig:{saveMode:'free'},capabilities:{}};
const auth = { currentToken: () => null, loginToBackend: () => Promise.reject(new Error('login unavailable')) };
let now = 100000, request, requestCount = 0;
const mod = {exports:{}};
const code = ts.transpileModule(fs.readFileSync('src/api/capabilities.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
vm.runInNewContext(code,{module:mod,exports:mod.exports,Date:{now:()=>now},Promise,
  require:name => name === '@/utils/auth' ? auth : config, uni:{request:options=>{request=options; requestCount++;}}});
const tick = () => new Promise(r => setImmediate(r));
(async()=>{
  let first = mod.exports.refreshCapabilities(), second = mod.exports.refreshCapabilities();
  assert.strictEqual(first,second);
  request.success({statusCode:200,data:{version:'v1',saveMode:'rewarded',rewardedVideoAdUnitId:'adunit-123',purchaseEnabled:true}});
  request.complete(); await first;
  assert.strictEqual(config.adConfig.saveMode,'rewarded'); assert.strictEqual(config.capabilities.purchaseEnabled,true);
  now+=60001; first=mod.exports.refreshCapabilities(); request.fail(); request.complete(); await first;
  assert.strictEqual(config.adConfig.saveMode,'free'); assert.strictEqual(config.capabilities.purchaseEnabled,false);
  now+=60001; first=mod.exports.refreshCapabilities(); request.success({statusCode:200,data:{saveMode:'rewarded',purchaseEnabled:true}}); request.complete(); await first;
  assert.strictEqual(config.adConfig.saveMode,'free'); assert.strictEqual(config.capabilities.purchaseEnabled,false);
  // Older backends still require a token: stay on defaults if login is unavailable.
  now+=60001; first=mod.exports.refreshCapabilities();
  request.success({statusCode:401,data:{detail:'请先登录'}}); request.complete(); await first;
  assert.strictEqual(config.capabilities.purchaseEnabled,false);
  // Older backends still require a token: retry exactly once when login succeeds.
  auth.currentToken = () => 'token-1';
  auth.loginToBackend = () => Promise.resolve('token-1');
  now+=60001; first=mod.exports.refreshCapabilities();
  request.success({statusCode:401,data:{}}); request.complete();
  await tick();
  assert.strictEqual(request.header.Authorization,'Bearer token-1');
  request.success({statusCode:200,data:{version:'v2',purchaseEnabled:true}});
  request.complete(); await first;
  assert.strictEqual(config.capabilities.purchaseEnabled,true);
  // Deployment without the /capabilities route: 401 -> login -> retry 404 -> quiet defaults, no third request.
  now+=60001; const before404 = requestCount;
  first=mod.exports.refreshCapabilities();
  request.success({statusCode:401,data:{detail:'请先登录'}}); request.complete();
  await tick();
  assert.strictEqual(requestCount,before404+2,'one retry after login');
  assert.strictEqual(request.header.Authorization,'Bearer token-1');
  request.success({statusCode:404,data:{detail:'Not Found'}}); request.complete(); await first;
  assert.strictEqual(config.capabilities.purchaseEnabled,false);
  assert.strictEqual(config.adConfig.saveMode,'free');
  assert.strictEqual(requestCount,before404+2,'404 must not trigger another retry');
  console.log('capability coalescing, refresh failure, malformed response, 401 and 404 fallback passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
