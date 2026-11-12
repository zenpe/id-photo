<div align="center">

# 一寸不差照片助手

**证件照制作、图片处理与会员运营的一体化微信小程序**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![uni-app](https://img.shields.io/badge/uni--app-Vue3-2b9939.svg)](https://uniapp.dcloud.io/)
[![Vue](https://img.shields.io/badge/Vue-3.4-42b883.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6.svg)](https://www.typescriptlang.org/)

[当前版本基线](#当前版本基线) · [界面展示](#界面展示) · [功能介绍](#功能介绍) · [快速开始](#快速开始) · [管理后台](#管理后台) · [项目结构](#项目结构)

</div>

---

## 项目简介

一寸不差照片助手是一个面向个人用户的照片制作工具。用户可以选择证件照规格，通过拍摄或相册导入照片，完成裁剪、背景处理、排版、水印、格式转换和压缩。

仓库包含微信小程序、基于 [HivisionIDPhotos](https://github.com/Zeyi-Lin/HivisionIDPhotos) 的图片处理服务，以及会员、支付和运营管理后台。项目用于个人图片制作与编辑，不提供用户内容公开发布、社区互动或内容分发。

## 界面展示

<table>
  <tr>
    <td align="center"><b>首页与规格选择</b></td>
    <td align="center"><b>证件照编辑</b></td>
    <td align="center"><b>人像抠图</b></td>
  </tr>
  <tr>
    <td><img src="docs/readme/home.png" alt="首页与证件照规格选择" width="250" /></td>
    <td><img src="docs/ui-audit-2026-10-31/photo-edit.png" alt="证件照背景与输出方式编辑" width="250" /></td>
    <td><img src="docs/readme/matting.png" alt="人像抠图设置" width="250" /></td>
  </tr>
  <tr>
    <td align="center"><b>格式转换与压缩</b></td>
    <td align="center"><b>文字水印</b></td>
    <td align="center"><b>服务状态</b></td>
  </tr>
  <tr>
    <td><img src="docs/ui-audit-2026-10-31/convert.png" alt="图片格式与大小调整" width="250" /></td>
    <td><img src="docs/ui-audit-2026-10-31/watermark.png" alt="图片文字水印设置" width="250" /></td>
    <td><img src="docs/readme/status.png" alt="照片服务和会员服务状态" width="250" /></td>
  </tr>
</table>

截图来自微信开发者工具中的开发版，部分页面使用项目自带示例人像。套餐、服务状态和页面显示以实际部署为准；开发版界面不代表已通过微信审核或正式发布。

## 功能介绍

### 照片制作与图片工具

- **证件照制作**：选择常用规格或自定义尺寸，支持人像分割、背景替换、电子照和打印排版照。
- **拍摄辅助**：统一的拍摄界面提供可开关的人像和眼部参考线，支持前后摄像头切换、预览和重拍。
- **人像抠图**：提取人物轮廓，支持不同处理方式并输出透明背景图片。
- **文字水印**：自定义文字、颜色、大小、透明度、角度和间距。
- **格式与压缩**：转换 JPG / PNG，并尝试按所选目标控制文件大小。
- **电子照与分享**：管理已保存的电子照，并通过微信分享小程序入口。

### 会员与支付

- 默认正式免费保存，无需广告权限。广告及购买均须运营方显式开启；广告不可用推荐免费兜底。
- 会员采用单次购买，不自动续费；有效期按自然月计算，未到期续费时长叠加。
- 首次初始化的套餐示例为 **1 个月 ¥12、3 个月 ¥24、12 个月 ¥68**。套餐可在后台调整，实际价格和上架状态以购买页面为准。
- 接入微信虚拟支付，提供订单查询、订单详情和退款申请入口；支付能力需要完成微信平台配置。iPhone 支付需满足微信及 Apple 的相关条件。

### 内容安全与服务状态

- 内容安全默认开启：照片进入处理流程前调用微信图片内容安全接口，文字水印在渲染前进行文本检测。检测不通过或服务不可用时会停止相应处理。
- **我的 → 服务状态**展示基础连接；审核演示默认隐藏。异步检测须另启推送、完成回调验收后开放。
- 小程序和管理后台可查看照片服务、会员服务等运行状态。状态页展示基础配置与近期异常，并不代表第三方支付或每次图片处理一定成功。

## 管理后台

管理后台用于日常运营和问题处理，包含：

| 模块 | 主要能力 |
| --- | --- |
| 运营概览与服务监控 | 查看用户、会员、订单及服务状态，检查本机服务与公网连接 |
| 用户与会员 | 通过会员编号查找用户，查看权益流水，按自然月延长或调整到期时间 |
| 会员套餐 | 新建、编辑、排序、归档套餐；核对微信商品后上架 |
| 订单与退款 | 查询订单和退款申请，按支付渠道处理退款并记录核对结果 |
| 审计记录 | 查看后台重要操作记录 |

后台可对符合条件的普通虚拟支付订单发起退款；Apple 内购退款按 Apple 的流程处理。经核实全额退款后，系统会回收该订单尚未使用的会员权益；部分退款及无法安全计算的情况需要人工核对。退款流程与部署注意事项见 [后端说明](backend/README.md#定位用户与处理退款申请)。

默认本地后台地址为 `http://127.0.0.1:8091/`。如需公网访问，应配置 Cloudflare Tunnel、Cloudflare Access 和后台账号密码；历史原生部署见 [后台公网访问](backend/README.md#后台公网访问)；fnOS 推荐使用 [SSH 隧道后台访问](docs/deploy-fnos.md#可选管理后台)。

## 当前版本基线

- **唯一开发主线**：`migration/vue3-vite`（Vue 3 + Vite，含小程序运行时修复与后端线程池优化）。后续所有改动都基于这条分支。
- `test/fnos-docker` 是 NAS 部署分支，`main` 是 Vue 2 历史版本；两者均已冻结，不作为开发基线。
- 发布构建前须在 `.env.local` 填写真实的 `VUE_APP_OPERATOR` 与 `VUE_APP_CONTACT`；占位值会被 `scripts/validate-config.cjs` 拦截。仅本地预览打包时可设 `IDPHOTO_PREVIEW_BUILD=1`。
- 上线前验收清单见 [迁移记录](docs/migration-vue3.md) 末尾的「集中正式验收待完成项」。

## 快速开始

### 环境要求

- Node.js 24.x 和 Yarn Classic 1.22.22（前端安装使用仓库的 `yarn.lock`）
- fnOS / N100 推荐 Docker（镜像 Python 3.11）；前端构建不需要本地 Python
- 微信开发者工具及可用的小程序 AppID
- 微信小程序服务端凭据；如需会员支付，还需完成微信虚拟支付、商品和消息推送配置

### 1. 获取代码并安装前端依赖

```bash
git clone https://github.com/zenpe/id-photo.git
cd id-photo
npm install --global yarn@1.22.22
yarn install --frozen-lockfile
```

前端采用 uni-app Vue 3、Vite、TypeScript、Pinia 和 uview-plus。请使用 Yarn 安装仓库的固定版本依赖，
不需要旧版 Vue CLI、Webpack 或 Node 兼容补丁。构建命令仍可通过 npm 运行。
`.node-version` 供 fnm 等版本管理工具读取；Windows/Linux 构建由 GitHub Actions 检查。

### 2. 配置并启动后端

fnOS / N100 按 [Docker 部署说明](docs/deploy-fnos.md) 操作。默认只启动一个 API，宿主机端口 8090，后台和消息回调按需启用。
首次部署填入自有微信凭据和随机签名密钥，数据与配置放 NAS 持久化目录，不进入 Git 或镜像。

原生 Python/macOS 启动脚本留作兼容入口，详见 [后端说明](backend/README.md)，不是 Windows/fnOS 推荐安装方案。

### 3. 配置小程序

从仓库根目录复制配置模板：

```bash
cp .env.example .env.local
```

品牌名称、简称、首页说明与分享文案统一放在 `backend/branding.json`，前端和管理后台共用。
在 `.env.local` 中填写自己的服务地址、实际运营主体和联系方式（不要放 AppSecret），例如：

```dotenv
VUE_APP_API_BASE_URL=https://your-api-domain.example
VUE_APP_OPERATOR=实际运营主体
VUE_APP_CONTACT=实际客服邮箱或联系方式
```

也可分别设置 `VUE_APP_API_DEVELOPMENT`、`VUE_APP_API_TRIAL`、`VUE_APP_API_RELEASE`。缺项会阻止生产构建，不会回退到原作者服务器。广告由后端 `/capabilities` 配置，默认关闭。将 `src/manifest.json` 的 `mp-weixin.appid` 改为自己的 AppID，并在微信公众平台配置对应的合法服务器域名。

### 4. 开发与构建

```bash
# 开发版：使用微信开发者工具打开 dist/dev/mp-weixin
yarn dev:mp-weixin

# 发布构建：使用微信开发者工具打开 dist/build/mp-weixin
yarn build:mp-weixin
```

在微信开发者工具中导入对应目录后，可预览、上传代码并在微信公众平台提交审核。相机、广告、登录和支付能力需结合真实设备、微信平台配置及网络环境使用。

## 项目结构

```text
id-photo/
├── src/
│   ├── api/                   # 照片、会员与内容安全接口
│   ├── components/            # 相机、加载状态等公共组件
│   ├── pages/                 # 首页、图片工具、会员、服务状态等页面
│   ├── model/                 # 证件照规格、颜色和数据类型
│   ├── static/                # 图标与示例图片
│   ├── utils/                 # 请求、广告、图片和本地存储工具
│   └── config.ts              # 服务地址与广告位配置
├── backend/
│   ├── hivision-core/         # HivisionIDPhotos 上游源码
│   ├── hivision-overlay/      # 图片 API、微信登录、会员、支付及后台
│   └── README.md              # 后端配置、运行与运维说明
├── docs/                      # 设计、界面截图与实施文档
├── scripts/                   # 构建辅助与本机服务恢复脚本
├── .env.example               # 前端配置模板
└── README.md
```

## 常用接口

以下接口由本项目后端提供；图片与会员接口按部署配置要求微信登录鉴权。接口详情请参考 [后端说明](backend/README.md) 和 `backend/hivision-overlay/` 中的实现。

| 接口 | 用途 |
| --- | --- |
| `POST /auth/wechat` | 微信登录 |
| `POST /idphoto` | 生成证件照 |
| `POST /human_matting` | 人像抠图 |
| `POST /add_background` | 图片背景处理 |
| `POST /generate_layout_photos` | 生成打印排版照 |
| `POST /watermark` | 添加文字水印 |
| `POST /convert_image` | 图片格式转换与压缩 |
| `GET /service-status` | 查询服务状态 |
| `POST /content-security/image` | 图片内容安全检测演示 |
| `POST /content-security/text` | 文本内容安全检测演示 |
| `POST /content-security/media` | 异步媒体内容安全检测演示 |

## 许可证与致谢

本项目使用 [MIT License](LICENSE)。仓库包含的 HivisionIDPhotos 上游代码遵循其 [Apache-2.0 许可证](backend/LICENSE-HIVISION-APACHE-2.0)；上游模型及其他依赖的使用条件请以各自许可为准。

感谢 [HivisionIDPhotos](https://github.com/Zeyi-Lin/HivisionIDPhotos)、[uni-app](https://uniapp.dcloud.io/)、[Vue.js](https://vuejs.org/) 和 [uView UI](https://www.uviewui.com/) 等开源项目。

<details>
<summary>关注与支持</summary>

<table>
  <tr>
    <td align="center"><b>关注公众号</b></td>
    <td align="center"><b>支付宝支持</b></td>
    <td align="center"><b>微信支持</b></td>
  </tr>
  <tr>
    <td><img src="docs/qrcode/wechat-official.jpg" alt="微信公众号二维码" width="150" /></td>
    <td><img src="docs/qrcode/zhifu.jpg" alt="支付宝支持二维码" width="150" /></td>
    <td><img src="docs/qrcode/wx.jpg" alt="微信支持二维码" width="150" /></td>
  </tr>
</table>

</details>

## 发布与验证范围

本轮实现、每批 review 和待实机验收见 [实施记录](docs/rollout-review.md)。默认模型为标准版 Hivision MODNet。
本地已验证 Node 24 锁文件安装、类型检查、微信与 H5 构建、浏览器回归及默认模型真实推理；镜像构建、目标 NAS 性能、微信回调及备份恢复仍需在目标环境验收。
`yarn test:node24` 运行不访问微信/支付/用户照片的回归。四个依赖 Vue 2 实例内部结构的微信自动化脚本已标记为历史资料，不能作为 Vue 3 验收依据，具体清单见迁移记录；其他开发工具脚本也未在本轮连接微信工具执行。

Vue 3 迁移、后端图片任务容量限制及集成验证见 [迁移记录](docs/migration-vue3.md)。
`yarn typecheck` 检查页面脚本和模板；`python scripts/test-backend.py` 运行隔离的后端回归。
手动调试资料在 `docs/debug/`，macOS 历史恢复脚本在 `scripts/macos/`，均不是 fnOS 启动入口。
