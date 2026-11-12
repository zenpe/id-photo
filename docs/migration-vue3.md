# Vue 3 技术栈迁移与集成验证

日期：2026-11-12。分支：`migration/vue3-vite`。

本次按“先完成迁移、持续回归、最后集中正式验收”执行。工作区原有的品牌、页面和后台修改已保留，迁移前源码及测试快照位于本机忽略目录 `.migration/before-vue3.zip`，不包含环境配置、密钥或运行数据库。

## 完成范围

| 部分 | 结果 |
| --- | --- |
| 前端框架 | Vue 3.4.21、TypeScript 5.6.3、uni-app 官方 Vue 3 工具链 `3.0.0-alpha-5030620261106001`、Vite 5.2.8 |
| 页面与组件 | 全部业务 SFC 使用 Composition API / script setup；移除 class/decorator 与 Vue 2 全局实例写法 |
| UI | uview-plus 3.8.138，easycom 按页面加载；H5 不全量注册组件库 |
| 状态 | Pinia 2.1.7，每个应用实例建立独立 Pinia；保留照片规格和处理结果的业务含义 |
| 构建 | 移除 Vue CLI、Webpack 配置、Node legacy util 补丁、旧版 Promise 适配器及旧 HTML 模板 |
| 后端 | 保留 FastAPI、Python、SQLite 和原有接口；图片解码、推理、压缩、排版和编码移入有限容量线程池 |
| 依赖 | 前端精确版本及 `yarn.lock`；后端 Python 3.11 完整版本与文件哈希锁 `backend/requirements-api.lock` |
| CI | 加入 Vue 模板类型检查、H5 浏览器回归，统一运行后端十二组回归 |

现有 `.env.local`、微信 AppID 和品牌配置继续使用。Vite 仅将 `VUE_APP_` 前缀的公开配置写入客户端，生产构建继续检查 API 地址、运营主体、联系渠道和 AppID。本次本机构建使用测试运营主体与联系方式，未补填真实运营资料，不应直接上传为正式发布包。

旧增强编辑页也完成语法迁移，但仍未注册为主流程入口。管理后台保留现有 HTML/CSS/JS 实现；本次未改变用户库、订单库和权益数据结构。

## 图片执行与容量

新模块 `miniapp_image_runtime.py` 使用专用线程池，默认两个工作线程、四个运行及排队任务。变量为 `IDPHOTO_IMAGE_WORKERS` 和 `IDPHOTO_IMAGE_CAPACITY`，容量必须不小于线程数。

容量用尽立即返回 HTTP 503 和 `Retry-After: 3`，前端保留照片与参数，不自动重发。请求取消后，已经运行的模型任务仍持有容量，直到实际执行完毕；排队任务取消可以释放容量。共享 IDCreator 继续通过原有锁保护模型选择和推理。

这不是持久化后台任务系统，也不提供跨服务重启恢复。默认仍部署一个 API 进程，增加 worker 会复制模型和容量限制，不能据此认为性能会线性增长。

同时修复统计模块 SQLite 事务结束后未显式关闭连接的问题；测试等待异步统计落盘后清理临时目录。Pydantic 校验器已适配 V2。

## 本机已执行验证

| 检查 | 结果 |
| --- | --- |
| Yarn 冻结锁文件离线安装 | 通过 |
| `npm run typecheck` | 通过，包含 Vue 脚本和模板 |
| `npm run test:node24` | 十组通过，包括原有保存、相机、草稿和存储回归，以及 Pinia 隔离、三类图片交接、订单失败及退款申请 |
| 微信生产编译 | 通过；导入目录 `dist/build/mp-weixin` |
| H5 生产编译 | 通过 |
| `npm run test:h5` | 本机 Edge 无头浏览器通过：22 个页面、文本输入、单选框、展开设置及运行时异常检查；接口为隔离测试响应 |
| `python scripts/test-backend.py` | Python 3.11 隔离环境下十二组、50 项通过；微信与支付请求均为模拟 |
| 默认模型 | SHA-256 校验后安装 Hivision MODNet，仓库公开照片真实推理通过；单次本机冒烟约 0.59 秒，不代表 NAS 性能 |
| 图片接口 | 实际验证透明 PNG、JPEG 合成白底、无法满足压缩目标的反馈、换底、排版、水印、压缩和证件照默认模型输出 |
| 依赖兼容检查与补丁空白检查 | 通过 |

H5 首页主 JS 在取消组件库全量注册后，从约 1.33 MB 降至约 544 KB；微信首轮构建文件总量约 850 KB。数字为未压缩的本机产物，不能替代微信上传包体积检查。

## 复现命令

使用 Node 24、Yarn 1.22.22，先填写自己的公开前端配置：

```sh
yarn install --frozen-lockfile
yarn typecheck
yarn test:node24
yarn build:mp-weixin
yarn build:h5
yarn exec playwright-core install --with-deps chromium
yarn test:h5
```

也可通过 `IDPHOTO_BROWSER_EXECUTABLE` 指定已有 Chrome / Edge 的可执行文件。

使用 Python 3.11 创建隔离环境后：

```sh
python -m pip install --require-hashes -r backend/requirements-api.lock
python -m pip install httpx==0.28.1
python scripts/test-backend.py
```

默认模型未安装时，图片接口测试会跳过真实模型用例，其余编解码和业务测试继续执行。模型下载遵循 `backend/scripts/download_models.py`。完整依赖锁可使用 uv 0.13.7 重新解析；升级时重新回归，不手工猜测传递依赖版本：

```sh
uv pip compile backend/requirements.txt --python-version 3.11 --universal --generate-hashes --output-file backend/requirements-api.lock
```

## 旧微信自动化脚本

以下脚本保留原路径作为历史资料，依赖 Vue 2 的 `$vm` 业务字段或 `$children`，不兼容当前 script setup 页面，未计入本轮通过的测试：

- `tests/camera-integration.test.cjs`
- `tests/camera-legacy-handoff.test.cjs`
- `tests/camera-ui-audit.cjs`
- `tests/membership-order-flow.test.cjs`

当前组件状态和业务交接使用 `tests/camera-flow.test.cjs`、`tests/vue3-flows.test.cjs` 回归，页面渲染和交互使用 `tests/h5-smoke.test.cjs` 验证，图片接口使用后端回归验证。这些检查不能替代微信端到端交互验收；后续微信自动化应通过页面元素操作及可见结果断言重写，并在开发者工具中验证。其他保留的开发工具脚本本轮也未执行。

## 集中正式验收待完成项

本机 Docker daemon 未运行，本轮没有启动 NAS 上的生产服务，也没有执行真实支付、退款或微信回调。CI 文件已更新，但未将其定义视为远端 CI 已通过。

统一正式验收应针对同一个迁移版本完成：

1. Linux amd64 镜像构建及 API、push、admin 启动；目标设备并发、内存、过载拒绝及轻量接口响应。
2. 微信真机相机初始化、前后摄像头、权限、相册保存、分包、草稿恢复、抠图和排版；正式上传包检查。
3. 微信真实登录、图片和文本内容安全；广告资格与真实 SDK。H5 沿用现有微信登录限制，本次浏览器回归不代表 H5 已支持微信业务登录。
4. 支付资格、订单确认、回调验签、退款与权益回收；未完成前保持购买开关关闭。
5. 填写实际运营主体和联系方式，确认隐私说明、CDN 不缓存 API、SQLite 与身份密钥成组备份恢复。

通过后再发布迁移版本，并保留旧镜像、数据库和身份密钥的成组备份作为回退依据。
