/**
 * 微信基础库 2.20.1 起将 getSystemInfoSync 标记为废弃，3.x 会在控制台打印
 * "wx.getSystemInfoSync is deprecated"。uview-plus 3.8.x 的 initThemeSystem()
 * 仍会调用 uni.getSystemInfoSync()，uni-app 运行时再动态转调 wx.getSystemInfoSync()，
 * 因此每次启动都会出现这条警告（uview-plus 已是最新版，升级依赖无法解决）。
 *
 * uni-app 在 initWx() 阶段会把 globalThis.wx 换成一个普通对象，且它的同步 API
 * wrapper 是运行时通过 wx[methodName] 取方法的，所以这里可以用新的分类 API
 * (getWindowInfo / getDeviceInfo / getAppBaseInfo / ...) 合成等价结果，
 * 在调用方无感知的前提下替换掉废弃接口；uni-app 自己的 returnValue 补全逻辑
 * （safeAreaInsets、deviceId 等）依然生效。
 *
 * 只在小程序端、且新 API 全部可用时安装；老基础库或替换失败时保持原生行为。
 */

declare const wx: any;

type SystemInfo = Record<string, any>;

function readApi(target: any, name: string): SystemInfo {
    try {
        const fn = target[name];
        if (typeof fn !== 'function') return {};
        const result = fn.call(target);
        return result && typeof result === 'object' ? result : {};
    }
    catch (_) {
        // 单个分类 API 不可用时不影响其余字段
        return {};
    }
}

/** 用新的分类 API 合成 getSystemInfoSync 的返回结果。 */
export function buildSystemInfo(target: any): SystemInfo {
    const info: SystemInfo = Object.assign(
        {},
        readApi(target, 'getAppAuthorizeSetting'),
        readApi(target, 'getSystemSetting'),
        readApi(target, 'getAppBaseInfo'),
        readApi(target, 'getDeviceInfo'),
        readApi(target, 'getWindowInfo'),
        { errMsg: 'getSystemInfoSync:ok' }
    );

    if (info.safeArea && !info.safeAreaInsets) {
        info.safeAreaInsets = {
            top: info.safeArea.top,
            left: info.safeArea.left,
            right: (info.screenWidth || 0) - info.safeArea.right,
            bottom: (info.screenHeight || 0) - info.safeArea.bottom
        };
    }
    return info;
}

/**
 * 安装兼容层。必须在 uview-plus 的 mount$u() 之前调用（App 启动时）。
 * @returns 是否成功替换；false 表示维持原生行为。
 */
export function installSystemInfoCompat(): boolean {
    const target: any = typeof wx === 'undefined' ? null : wx;
    if (!target || typeof target.getSystemInfoSync !== 'function') return false;
    if (target.__systemInfoCompatInstalled) return true;

    const nativeSync = target.getSystemInfoSync;
    const required = ['getWindowInfo', 'getDeviceInfo', 'getAppBaseInfo'];
    // 老基础库里 uni-app 会把新 API 指向 getSystemInfoSync 作为降级，
    // 这种情况下替换会导致再次调到废弃接口，直接放弃。
    const supported = required.every(
        name => typeof target[name] === 'function' && target[name] !== nativeSync
    );
    if (!supported) return false;

    try {
        Object.defineProperty(target, 'getSystemInfoSync', {
            configurable: true,
            writable: true,
            value: () => buildSystemInfo(target)
        });
        Object.defineProperty(target, '__systemInfoCompatInstalled', {
            configurable: true,
            value: true
        });
        return true;
    }
    catch (_) {
        // wx 对象属性不可写时保持原样，功能不受影响
        return false;
    }
}
