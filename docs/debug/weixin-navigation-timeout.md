# 首页一寸入口跳转超时修复

2026-11-12，微信开发者工具 2.02.2609240、基础库 3.17.5。首页点击“一寸”后提示 `navigateTo:fail timeout`。

工具日志显示，加载 `pages/photo/index` 分包时先发生 WXSS 编译错误，随后页面路由等待 10 秒超时。直接使用开发者工具内置 `wcsc.exe` 编译原产物得到：

```text
ERR: pages/photo/index.wxss(1:6400): error at token `*`
```

原因是页面动画规则使用了 `.content-container > *` 通配选择器，Vite 接受该 CSS，但微信样式编译器拒绝。证件照、抠图和水印页面（含旧上传入口）已将这些选择器改为 `.content-container > view`，保留原动画规则。

重新构建后，本机微信官方编译器检查全部 45 个 WXSS 文件通过。检查命令：

```powershell
npm run build:mp-weixin
$env:WECHAT_WCSC_PATH = 'D:/Program Files (x86)/Tencent/微信web开发者工具/resources/app.asar.unpacked/node_modules/wcc-exec/wcsc.exe'
npm run test:weixin-styles
```

路径应替换为本机微信开发者工具的实际安装位置。专项检查包含所有页面与组件，不能仅凭 Vite 构建成功判断微信样式编译成功。

用户侧验证：对 `dist/build/mp-weixin` 点击“编译”，从首页点“一寸”，应显示已选一寸规格、拍摄建议及拍照/相册入口；再打开抠图、水印入口，确认无 WXSS 编译错误和路由超时。
