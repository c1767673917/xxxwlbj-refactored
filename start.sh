#!/bin/bash

# WLBJ物流报价系统开发环境启动脚本 - 根目录快捷方式
# 这个脚本会调用 scripts/start.sh 来启动系统

set -euo pipefail

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 检查 scripts/start.sh 是否存在
if [ ! -f "$SCRIPT_DIR/scripts/start.sh" ]; then
    echo "错误: 找不到 scripts/start.sh 文件"
    exit 1
fi

# 确保 scripts/start.sh 有执行权限
chmod +x "$SCRIPT_DIR/scripts/start.sh"

# 调用实际的启动脚本，传递所有参数
exec "$SCRIPT_DIR/scripts/start.sh" "$@"
