#!/bin/bash

# WLBJ Docker环境快速启动脚本

set -euo pipefail

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🐳 快速启动WLBJ Docker环境..."

# 调用完整的启动脚本
exec "$SCRIPT_DIR/start.sh" development docker
