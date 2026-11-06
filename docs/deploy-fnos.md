# fnOS / N100 部署

目标为 Linux amd64，Docker Compose **2.24 或以上**。默认一个 API 容器；push、admin 按需开启，三者使用同一镜像。
默认免费保存、购买与异步检测关闭。开发机不需要安装 Python 推理环境。

## 首次安装

```sh
git clone https://github.com/zenpe/id-photo.git
cd id-photo
git switch test/fnos-docker
cp compose.env.example .env
cp backend/docker.env.example backend/.env.docker
chmod 600 .env backend/.env.docker
docker compose build api
docker compose run --rm --no-deps api python -c 'import secrets; print(secrets.token_hex(32))'
```

在 `backend/.env.docker` 填入自己的 `WECHAT_APP_ID`、`WECHAT_APP_SECRET` 和刚生成的 `IDPHOTO_TOKEN_SECRET`。
签名密钥及数据目录的 `identity.key` 后续保持稳定。前端 AppID 与后端必须一致。

在根目录 `.env` 设置宿主机端口及数据目录，不要修改受 Git 管理的 Compose：

```dotenv
IDPHOTO_API_PORT=8090
IDPHOTO_API_BIND=0.0.0.0
IDPHOTO_DATA_PATH=./backend/.miniapp_data
```

`0.0.0.0` 允许 Lucky 经局域网访问；按 NAS 防火墙限制来源。后台不会随此设置开放。

```sh
docker compose up -d api
docker compose ps
curl http://192.168.5.100:8090/health
curl http://192.168.5.100:8090/capabilities
docker compose logs --tail=100 api
```

健康检查仅代表进程启动，不能证明模型、微信登录、内容安全、相册保存全部可用。
只有一个推理 worker；N100 先观察单张照片耗时与内存，再考虑队列，不直接增加 worker。

## 构建与版本

首次构建需要 Docker Hub、PyPI、GitHub Releases。约 275 MB 模型按大小和 SHA-256 校验，后续随镜像使用。
API 不安装 Gradio 演示依赖；原项目演示仍可另装 `hivision-core/requirements-app.txt`。

当前固定数值推理栈版本，并在镜像中保存完整解析结果 `/app/requirements.resolved.txt`。
**这还不是跨时间完全冻结的 Python 依赖锁**。本机 Docker daemon 未启动，镜像构建和真实推理尚须 NAS 或新增 CI 验证。
验证通过后保留镜像和解析清单，重建镜像不能代替回退：

```sh
docker compose exec -T api cat /app/requirements.resolved.txt > requirements.resolved.txt
docker image tag id-photo-api:local id-photo-api:verified-YYYYMMDD
docker image save -o /你的安全备份目录/id-photo-verified.tar id-photo-api:verified-YYYYMMDD
```

真实默认模型检查使用经授权的清晰单人正面测试照片（不写出结果）：

```sh
docker compose cp /本地测试照片.jpg api:/tmp/fixture.jpg
docker compose exec api python smoke_inference.py /tmp/fixture.jpg
docker compose exec api rm /tmp/fixture.jpg
```

CI 使用仓库上游公开演示照片。另通过小程序验收单人、无人脸、多人脸、断网及相册权限。
不得把真实用户照片写入普通日志或提交进仓库。

## 可选消息回调

需要微信异步媒体检测或支付回调时再开启：

```sh
cp backend/push.env.example backend/.env.push
chmod 600 backend/.env.push
# 填入 AppID、消息推送 Token 和 EncodingAESKey（变量名 WECHAT_PUSH_AES_KEY）
docker compose --profile push up -d api push
curl http://127.0.0.1:8092/health
```

Lucky 将 `/payment/notify` 单独转发到 `http://192.168.5.100:8092`，其他 API 转发到 8090。
微信后台配置回调 URL、Token 和 EncodingAESKey，完成 URL 验签和真实事件测试后，才在 API 的
`backend/.env.docker` 设置 `IDPHOTO_ASYNC_MEDIA_ENABLED=true`，重新创建 API。
该显式开关代表运营者已完成配置，不是回调连通性自动探测。

每个角色只读取自己的环境文件。API 只开异步图片检测时无需持有推送 AESKey；push 也不需要 API 登录签名密钥。
购买默认关闭；支付须另行补全平台权限、虚拟支付密钥、商品、签名、幂等、退款及通知重放验收，不能仅凭容器启动判定可用。

## 可选管理后台

后台沿用既有本机访问、Host、Origin 和 Basic 认证校验。fnOS 上使用 Linux host 网络，进程只监听 `127.0.0.1:8091`；
不发布 LAN 或公网端口，不需要增加已有 API 的访问权限。

```sh
cp backend/admin.env.example backend/.env.admin
chmod 600 backend/.env.admin
docker compose --profile admin run --rm --no-deps admin python setup_membership_admin.py
docker compose --profile admin up -d admin
```

在自己的电脑建立 SSH 隧道，浏览器打开 `http://127.0.0.1:8091`，账号 `admin`，密码为刚设置的值：

```sh
ssh -N -L 8091:127.0.0.1:8091 zen@192.168.5.100
```

管理页 HTML、CSS、JS 已打包到镜像。后台不带 API AppSecret 时仍可管理本地数据；调用微信退款等能力须另行配置所需凭据。
后台并非只读账号，注意只在可信设备使用。该 host 网络方案面向 Linux/fnOS，不承诺 Windows Docker Desktop 同样适用。

完整启动：`docker compose --profile push --profile admin up -d`。API、push、admin 分别检查自己的健康端点。
缺少可选环境文件不影响默认 API；显式开启 push/admin 时会校验该角色的必要配置。

## EdgeOne → IPv6 → Lucky

| 项目 | 配置 |
| --- | --- |
| 小程序公网入口 | `https://photo.919966.xyz`（自部署者替换成自己的域名） |
| Lucky API 上游 | `http://192.168.5.100:8090`，容器内部仍为 8080 |
| TLS | 公网 HTTPS；每一段实际协议须与对应监听匹配，不能把 TLS 发给 HTTP 上游 |
| 请求体 | 代理允许至少 28 MiB；后端仍独立限制请求及解码尺寸 |
| 等待时间 | 按实测推理耗时设置；客户端 120 秒，须同时考虑 CDN 的实际平台限制 |
| 缓存 | 对 API 全路径绕过 CDN 缓存，尤其登录、配置、会员、上传、订单与回调 |
| 回调 | `/payment/notify` 按需指向 push 的 8092 |

微信公众平台配置 request、uploadFile、downloadFile 合法域名；开发者工具刷新域名信息再编译。
`Invalid HTTP request received` 仍需通过直连、Lucky、EdgeOne 分段定位，不以关闭日志或单凭警告认定原因。
524 不一定能靠加长本地代理超时解决；若持续超过 CDN 限额，应单独改造异步任务。

## 免费保存与广告

默认无广告位即可正式免费保存。需要广告资格后在 `backend/.env.docker` 显式配置：

```dotenv
IDPHOTO_SAVE_MODE=rewarded
IDPHOTO_REWARDED_AD_UNIT_ID=adunit-自己的广告位
IDPHOTO_AD_UNAVAILABLE=free
```

加载失败推荐免费放行，主动取消仍需按观看规则完成。会员确认异常按明确的兜底规则处理。
运营配置刷新间隔一分钟；当前观看过程冻结配置。该策略控制产品体验，不构成已下载图片的 DRM。
审核演示入口仅在 `IDPHOTO_DIAGNOSTICS_ENABLED=true` 时显示，通常保持关闭；正常图片处理仍执行内容安全检查。

## 备份、恢复与回退

备份包含数据库、身份密钥、后台密码摘要及各角色配置，放在仓库外的私有目录。
脚本从 Compose 实际 `/data` 挂载解析目录，只停止当前运行的角色，完成备份后重新启动它们：

```sh
python3 scripts/backup-nas.py --output /你的私有备份目录
```

恢复先解压到**全新目录**，不要覆盖运行数据：

```sh
mkdir -m 700 /你的恢复检查目录
tar -xzf /你的私有备份目录/idphoto-备份时间.tar.gz -C /你的恢复检查目录
python3 scripts/check-restored-data.py /你的恢复检查目录/data
```

检查通过后停止服务，把 `.env` 的 `IDPHOTO_DATA_PATH` 指向恢复目录，按需恢复配置，先启动 API 再验证真实会员、订单关联和后台访问。
结构检查不能代替这次业务恢复演练。不要丢失 `identity.key` 后重新生成，否则无法解密已有身份映射。

回退代码对应的已验证镜像时，修改 `.env` 中 `IDPHOTO_IMAGE` 为保留的标签并执行 `up -d`，不要加 `--build`。
数据库发生迁移后，旧镜像兼容性须验证，必要时使用配套完整备份；不要直接降级覆盖数据库。

日常更新：`git pull --ff-only` 后 `docker compose up -d --build api`；开启可选服务时使用相同 profiles 更新同一镜像。
本地环境文件、数据和备份不进入 Git。实际 NAS、微信回调和备份恢复演练结果记录在 `rollout-review.md`，不要将本地静态检查写成实机验收。
