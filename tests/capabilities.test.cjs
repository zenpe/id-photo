const assert = require('assert'), fs = require('fs'), ts = require('typescript'), vm = require('vm');
const config = {baseUrl:'https://ci.invalid',adConfig:{saveMode:'free'},capabilities:{}};
let now = 100000, request;
const mod = {exports:{}};
const code = ts.transpileModule(fs.readFileSync('src/api/capabilities.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
vm.runInNewContext(code,{module:mod,exports:mod.exports,Date:{now:()=>now},Promise,
  require:()=>config, uni:{request:options=>{request=options;}}});
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
  console.log('capability coalescing, refresh failure and malformed response passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
