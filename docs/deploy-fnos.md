# 飞牛 fnOS / N100：单容器测试部署

这套配置只启动小程序图片 API，同时提供微信登录、会员查询等 API。
不启动 Gradio 演示页面、管理后台或独立消息推送服务，会员购买关闭。
业务代码保持不变。N100 使用 Linux x86-64 CPU 镜像，不需要 GPU。

## 1. 拉取代码

在飞牛应用中心安装并启动 Docker。通过 SSH 登录 NAS，进入自己选定的数据目录后执行：

```sh
git clone https://github.com/zenpe/id-photo.git
cd id-photo
cp backend/docker.env.example backend/.env.docker
chmod 600 backend/.env.docker
```

以下命令均在含 `compose.yaml` 的仓库根目录执行。需要当前 SSH 用户具有 Docker 权限；
若提示 Docker socket 权限不足，请使用有相应权限的账户或按飞牛配置使用 `sudo docker`。

## 2. 构建镜像

```sh
docker compose build
```

首次构建下载 Python 基础镜像、Python 依赖和约 275 MB 模型，NAS 需要能访问 Docker Hub、
PyPI 和 GitHub Releases。模型下载脚本校验文件大小及 SHA-256；失败时修复网络后重新构建。
后续启动直接使用镜像中的模型，不需要再次下载。未安装独立 Python 也能构建。

## 3. 填写本地配置

生成登录签名密钥：

```sh
docker compose run --rm --no-deps api python -c 'import secrets; print(secrets.token_hex(32))'
```

用飞牛文本编辑器或 `vi backend/.env.docker` 填写三个值：

- `WECHAT_APP_ID`：你自己的小程序 AppID。
- `WECHAT_APP_SECRET`：该小程序的 AppSecret。
- `IDPHOTO_TOKEN_SECRET`：上一步生成的随机字符串，保存后保持稳定。

此文件已被 Git 忽略，不会进入 Docker 构建上下文。不要把密钥写入 Compose、Dockerfile
或公开仓库。前端 `src/manifest.json` 的微信 AppID 也需要与你使用的小程序一致。

## 4. 启动与检查

```sh
docker compose up -d
docker compose ps
docker compose logs --tail=100 api
```

局域网浏览器打开 `http://NAS局域网IP:8080/health`，应返回 `{"status":"ok"}`。
8080 端口需未被占用；如有冲突，将 Compose 中左侧端口改为其他端口，例如 `18080:8080`。
容器可在飞牛 Docker 界面查看和管理，Docker 服务启动后容器会按重启策略自动启动。
健康检查失败只会标记 unhealthy，不会自动重启仍在运行的进程。

健康检查只代表 API 已启动；还需在小程序中实际验证微信登录、内容检测、图片生成和保存。
首次推理会加载模型，耗时可能比后续请求长。不要直接增加 workers，每个进程都会占用模型内存。

## 5. 连接小程序

将自己的 HTTPS 域名反向代理到 NAS 的 8080 端口，图片请求的代理超时应留足处理时间，
上传大小应允许至少 28 MB 请求体。局域网 HTTP 健康检查不需要先配置 HTTPS。
公网小程序使用时，通过 HTTPS 入口访问，不要将 NAS 管理页面作为 API 入口。

在微信公众平台将该 HTTPS 域名加入 request 和 uploadFile 合法域名，配置隐私保护指引；
根据微信接口的实际要求，配置 NAS 出口公网 IP 白名单。
在前端本地环境文件设置 `VUE_APP_API_BASE_URL=https://你的域名`，重新构建小程序。
普通用户保存仍依赖有效的激励视频广告位，广告位属于前端配置。

本配置保持内容安全和登录鉴权开启、支付关闭。异步媒体检测需要另行配置消息推送服务，
不属于本次单容器测试范围。若后续启用支付，还需补齐支付回调、平台配置和端到端验证。

## 日常操作

```sh
# 代码更新后重新构建（本地修改冲突时先处理冲突）
git pull --ff-only
docker compose up -d --build

# 修改本地密钥配置后重新创建容器
docker compose up -d --force-recreate

# 停止服务，保留数据
docker compose down
```

`backend/.miniapp_data/` 是 NAS 上的持久化数据目录，包含数据库和 `identity.key`。
停止服务后，将整个目录与 `backend/.env.docker` 一并备份到安全位置；不要单独备份数据库
而遗漏身份密钥。删除容器不删除这个目录，删除仓库目录则会删除其中的数据。
容器首次写入的数据可能归容器 root 用户所有，需要有权限的账户备份。

当前配置面向首次测试。依赖使用项目现有版本范围，未提供冻结依赖锁文件；
验证成功后可保留镜像用于回退。正式放量前应在 NAS 上验证并发、内存、备份恢复和外网访问。
