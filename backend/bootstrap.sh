#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
VENV_DIR=${IDPHOTO_VENV:-"$ROOT_DIR/.venv"}

find_python() {
  for candidate in "${PYTHON_BIN:-}" python3.11 python3 python; do
    [ -n "$candidate" ] || continue
    command -v "$candidate" >/dev/null 2>&1 || continue
    version=$($candidate -c 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}")')
    case "$version" in
      3.11) printf '%s\n' "$candidate"; return 0 ;;
    esac
  done
  printf '%s\n' '需要 Python 3.11；可用 PYTHON_BIN 指定解释器，与部署依赖锁保持一致。' >&2
  exit 1
}

PYTHON=$(find_python)
if [ ! -x "$VENV_DIR/bin/python" ]; then
  "$PYTHON" -m venv "$VENV_DIR"
fi

"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/python" -m pip install --require-hashes -r "$ROOT_DIR/requirements-api.lock"
"$VENV_DIR/bin/python" -m pip check
"$VENV_DIR/bin/python" "$ROOT_DIR/scripts/download_models.py" --models all

printf '\n环境已准备完成。首次使用还需要在 backend 目录配置微信密钥和后台密码：\n'
printf '  %s\n' "$ROOT_DIR/configure.sh"
printf '启动三个服务：\n'
printf '  %s\n' "$ROOT_DIR/start-all.sh"
