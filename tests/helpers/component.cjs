// Execute the real Vue 3 setup function with reactive state and isolated platform APIs.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const { parse, compileScript } = require('@vue/compiler-sfc');
const vue = require('vue');

exports.loadComponent = function loadComponent(file, modules = {}, uni = {}, globals = {}) {
  const filename = path.resolve(__dirname, '../..', file);
  const source = fs.readFileSync(filename, 'utf8');
  // Match the mini-program's conditional compilation, not both platform branches.
  const processed = source.replace(/\/\/ #ifdef H5[\s\S]*?\/\/ #endif/g, '');
  const { descriptor } = parse(processed, { filename });
  const script = compileScript(descriptor, { id: file });
  const code = ts.transpileModule(script.content, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020
  }}).outputText;
  return class SetupComponent {
    constructor(initialProps = {}) {
      const hooks = {};
      const scope = vue.effectScope();
      const emitted = [];
      const mod = { exports: {} };
      const photoStore = vue.reactive({
        photoConfig: { name: '测试规格', pxWidth: 295, pxHeight: 413, dpi: 300 },
        photoPath: { base64: '', base64HD: '', base64Path: '', base64HDPath: '' },
        setPhotoSize(value) { photoStore.photoConfig = value; },
        setPhotoPath(value) { photoStore.photoPath = value; }
      });
      const requireMock = name => {
        if (name === 'vue') return { ...vue,
          onMounted: fn => { hooks.mounted = fn; },
          onBeforeUnmount: fn => { hooks.beforeUnmount = fn; },
          onUnmounted: fn => { hooks.unmounted = fn; }
        };
        if (name === '@dcloudio/uni-app') return new Proxy({}, { get: (_, hook) => fn => { hooks[hook] = fn; } });
        if (name === '@/store/modules/photo') return { usePhotoStore: () => photoStore };
        if (name in modules) return modules[name];
        if (name === '@/config') return { productConfig: {name:'测试照片助手',shareTitle:'测试分享'}, capabilities: {} };
        if (name === '@/utils/album') {
          const album = { exports: {} };
          const text = fs.readFileSync(path.resolve(__dirname, '../../src/utils/album.ts'), 'utf8');
          vm.runInNewContext(ts.transpileModule(text, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
            { module: album, exports: album.exports, uni, Promise, Error });
          return album.exports;
        }
        if (name.endsWith('.vue')) return { __esModule: true, default: {} };
        throw Error('unexpected import ' + name + ' in ' + file);
      };
      vm.runInNewContext(code, { module: mod, exports: mod.exports, require: requireMock,
        uni, wx: {}, process: {env:{}}, Promise, Error, Number, Math, JSON, console,
        decodeURIComponent, encodeURIComponent, setInterval, clearInterval, ...globals });
      const component = mod.exports.default;
      const props = vue.reactive({});
      for (const [name, options] of Object.entries(component.props || {})) {
        props[name] = Object.hasOwn(initialProps, name) ? initialProps[name] : options.default;
      }
      let bindings;
      scope.run(() => { bindings = component.setup(props, { expose() {}, emit: (...args) => emitted.push(args) }); });
      const state = vue.proxyRefs(bindings);
      return new Proxy(state, {
        get(target, name) {
          if (name === 'emitted') return emitted;
          if (name === 'hooks') return hooks;
          if (name === 'dispose') return () => { hooks.beforeUnmount?.(); scope.stop(); };
          if (name in props) return props[name];
          return name in target ? target[name] : hooks[name];
        },
        set(target, name, value) {
          if (name in props) props[name] = value;
          else target[name] = value;
          return true;
        }
      });
    }
  };
};
