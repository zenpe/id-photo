const assert = require('assert'), fs = require('fs'), ts = require('typescript'), vm = require('vm');

const code = ts.transpileModule(fs.readFileSync('src/utils/system-info.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;

function load(wx) {
  const mod = { exports: {} };
  const context = { module: mod, exports: mod.exports };
  if (wx !== undefined) context.wx = wx;
  vm.runInNewContext(code, context);
  return mod.exports;
}

function makeWx() {
  let nativeCalls = 0;
  const wx = {
    getSystemInfoSync() {
      nativeCalls++;
      return { platform: 'ios', version: '8.0.68', windowWidth: 375 };
    },
    getWindowInfo() {
      return {
        windowWidth: 375, windowHeight: 667, screenWidth: 375, screenHeight: 812,
        pixelRatio: 2, statusBarHeight: 44,
        safeArea: { top: 44, left: 0, right: 375, bottom: 778 }
      };
    },
    getDeviceInfo() {
      return { platform: 'ios', brand: 'Apple', model: 'iPhone', system: 'iOS 18.0' };
    },
    getAppBaseInfo() {
      return { version: '8.0.68', SDKVersion: '3.17.5', language: 'zh_CN', theme: 'light' };
    },
    getSystemSetting() { return { deviceOrientation: 'portrait', wifiEnabled: true }; },
    getAppAuthorizeSetting() { return { cameraAuthorized: true }; }
  };
  return { wx, nativeCalls: () => nativeCalls };
}

// 1. 新基础库：不再调用废弃接口，且合成结果与原生等价
{
  const { wx, nativeCalls } = makeWx();
  const { installSystemInfoCompat } = load(wx);
  assert.strictEqual(installSystemInfoCompat(), true);

  const info = wx.getSystemInfoSync();
  assert.strictEqual(nativeCalls(), 0, 'must not call the deprecated native API');
  assert.strictEqual(info.platform, 'ios');
  assert.strictEqual(info.version, '8.0.68');
  assert.strictEqual(info.SDKVersion, '3.17.5');
  assert.strictEqual(info.windowWidth, 375);
  assert.strictEqual(info.screenHeight, 812);
  assert.strictEqual(info.theme, 'light');
  assert.strictEqual(info.deviceOrientation, 'portrait');
  assert.strictEqual(info.cameraAuthorized, true);
  assert.strictEqual(info.errMsg, 'getSystemInfoSync:ok');
  // vm 跨 realm 创建的对象原型不同，逐字段比较
  assert.strictEqual(info.safeAreaInsets.top, 44);
  assert.strictEqual(info.safeAreaInsets.left, 0);
  assert.strictEqual(info.safeAreaInsets.right, 0);
  assert.strictEqual(info.safeAreaInsets.bottom, 34);

  // uni-app 的同步 API wrapper 是运行时通过 wx[name] 调用的
  const viaWrapper = wx['getSystemInfoSync'].apply(wx, []);
  assert.strictEqual(viaWrapper.platform, 'ios');

  // 重复安装是幂等的
  assert.strictEqual(installSystemInfoCompat(), true);
  assert.strictEqual(nativeCalls(), 0);
}

// 2. 老基础库：uni-app 把新 API 降级成 getSystemInfoSync 别名，此时不能替换
{
  const { wx, nativeCalls } = makeWx();
  wx.getAppBaseInfo = wx.getSystemInfoSync;
  assert.strictEqual(load(wx).installSystemInfoCompat(), false);
  assert.strictEqual(wx.getSystemInfoSync().platform, 'ios');
  assert.strictEqual(nativeCalls(), 1);
}

// 3. 新 API 缺失 / 无 wx（H5）：安静跳过，不抛异常
{
  const legacy = { getSystemInfoSync: () => ({ platform: 'android' }) };
  assert.strictEqual(load(legacy).installSystemInfoCompat(), false);
  assert.strictEqual(load(undefined).installSystemInfoCompat(), false);
}

// 4. 单个分类 API 抛异常时其余字段仍可用
{
  const { wx } = makeWx();
  wx.getDeviceInfo = () => { throw new Error('not supported'); };
  assert.strictEqual(load(wx).installSystemInfoCompat(), true);
  const info = wx.getSystemInfoSync();
  assert.strictEqual(info.windowWidth, 375);
  assert.strictEqual(info.version, '8.0.68');
  assert.strictEqual(info.platform, undefined);
}

// 5. wx 属性不可写时保持原生行为
{
  const { wx } = makeWx();
  Object.defineProperty(wx, 'getSystemInfoSync', {
    configurable: false, writable: false,
    value: () => ({ platform: 'native' })
  });
  assert.strictEqual(load(wx).installSystemInfoCompat(), false);
  assert.strictEqual(wx.getSystemInfoSync().platform, 'native');
}

console.log('deprecated getSystemInfoSync compat: composition, fallback, idempotency passed');
