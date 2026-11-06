# 小程序配置与联调

前端使用 Node 24 / Yarn 1.22.22；NAS 后端见 [fnOS 部署](deploy-fnos.md)。完整实施和验收状态见 [review 记录](rollout-review.md)。

## 前端

```sh
npm install --global yarn@1.22.22
yarn install --frozen-lockfile
cp .env.example .env.local
```

填写 `.env.local` 的 API、品牌、实际运营主体、联系渠道，在 `src/manifest.json` 设置自己的微信 AppID。
这些前端值都会公开，不放 AppSecret 或任何后端密钥。生产构建会拒绝缺失配置和上游服务地址。

```sh
yarn test:node24
yarn build:mp-weixin
```

微信开发者工具导入仓库内的 **`dist/build/mp-weixin`**。
不要导入 `dist/build/.automator/mp-weixin` 或其中的 `miniprogram`，那里可能仍是 Hello World 模板。
`yarn dev:mp-weixin` 使用 `dist/dev/mp-weixin`；H5 通过 `yarn dev:h5` / `yarn build:h5` 验证。
当前本地图片生成、草稿和相册保存以微信为主要支持目标，H5 编译成功不代表这些能力已兼容浏览器。

微信公众平台分别添加自己的 HTTPS request、uploadFile、downloadFile 域名；开发者工具进入详情刷新域名信息并重新编译。
线上不能依赖“不校验合法域名”选项。健康接口能打开后仍须测试微信登录及上传。

## 配置规则

- `src/config.ts` 不再回退上游服务器；可分别设置 `VUE_APP_API_DEVELOPMENT/TRIAL/RELEASE`。
- `/capabilities` 返回保存模式及购买、异步检测、诊断入口开关，最多一分钟刷新一次。加载失败允许免费保存，关闭可选能力。
- 默认正式免费保存，无广告位也能上线。广告由后端显式配置；购买另需平台权限和支付全流程验收。
- 默认模型为标准版 Hivision MODNet；其他已安装模型仍可手动选择。
- 图片上传默认要求后端登录和内容安全。不要为解决联调问题关闭公网鉴权或内容检测。

## 发布验收

1. 单人正脸生成；无人脸和多人脸有明确提示，原图与参数仍保留。
2. 证件照换色、三种相纸排版、裁剪线，及抠图、水印、转换、压缩。
3. 无广告位免费保存；权限拒绝后去设置重试，不重复请求生成。
4. 启用广告时区分取消和加载失败，任务内重试不重复观看。
5. 修改转换参数失败仍能看到旧结果，旧结果不会冒充新参数输出。
6. 退出重进后通过草稿继续；本机一天内有效；清理不删除相册图片。
7. 电子照最多两张，满额提示；订单和现有会员查询不因关闭购买而消失。

旧增强编辑页面没有完成全套能力接入，不作为主流程入口；Vue 3 与长任务队列迁移单独进行。
`scripts/macos/recover-photo.sh` 是旧 LaunchAgent 专用归档，必须显式设置自己的目录；Windows/fnOS 使用 Compose。
