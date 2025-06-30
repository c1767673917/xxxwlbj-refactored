#!/bin/bash

# WLBJ开发环境快速启动脚本
# 这是一个简化的启动脚本，用于快速启动开发环境

set -euo pipefail

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 快速启动WLBJ开发环境..."

# 调用完整的启动脚本
exec "$SCRIPT_DIR/start.sh" development full
