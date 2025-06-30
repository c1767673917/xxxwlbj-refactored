#!/bin/bash

# WLBJ物流报价系统开发环境启动脚本
# 支持前后端同时启动、数据库初始化、健康检查等功能
# 版本: 3.0.0

set -euo pipefail

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV="${1:-development}"
MODE="${2:-full}"  # full, backend, frontend, docker
PROXY_HOST="${PROXY_HOST:-127.0.0.1}"
PROXY_PORT="${PROXY_PORT:-7890}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%H:%M:%S') $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%H:%M:%S') $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $1"
}

log_debug() {
    if [ "${DEBUG:-false}" = "true" ]; then
        echo -e "${PURPLE}[DEBUG]${NC} $(date '+%H:%M:%S') $1"
    fi
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $(date '+%H:%M:%S') $1"
}

# 全局变量
BACKEND_PID=""
FRONTEND_PID=""
CLEANUP_DONE=false

# 清理函数
cleanup() {
    if [ "$CLEANUP_DONE" = "true" ]; then
        return
    fi
    CLEANUP_DONE=true

    log_info "正在清理进程..."

    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        log_info "停止后端服务 (PID: $BACKEND_PID)"
        kill -TERM "$BACKEND_PID" 2>/dev/null || true
        sleep 2
        kill -KILL "$BACKEND_PID" 2>/dev/null || true
    fi

    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        log_info "停止前端服务 (PID: $FRONTEND_PID)"
        kill -TERM "$FRONTEND_PID" 2>/dev/null || true
        sleep 2
        kill -KILL "$FRONTEND_PID" 2>/dev/null || true
    fi

    # 清理可能的端口占用
    cleanup_ports

    log_success "清理完成"
}

# 清理端口占用
cleanup_ports() {
    local ports=(3000 5173 4173)
    for port in "${ports[@]}"; do
        local pid=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$pid" ]; then
            log_info "清理端口 $port 占用 (PID: $pid)"
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done
}

# 设置信号处理
trap cleanup EXIT INT TERM

# 检查系统要求
check_system_requirements() {
    log_step "检查系统要求..."

    # 检查操作系统
    if [[ "$OSTYPE" == "darwin"* ]]; then
        log_debug "检测到 macOS 系统"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_debug "检测到 Linux 系统"
    else
        log_warning "未知操作系统: $OSTYPE"
    fi

    # 检查必要命令
    local required_commands=("node" "npm" "curl" "lsof")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "缺少必要命令: $cmd"
            exit 1
        fi
    done

    log_success "系统要求检查通过"
}

# 检查Node.js版本
check_node_version() {
    log_step "检查Node.js版本..."

    if ! command -v node &> /dev/null; then
        log_error "Node.js未安装"
        exit 1
    fi

    local node_version=$(node -v | cut -d'v' -f2)
    local required_version="18.0.0"

    if ! node -e "process.exit(process.version.slice(1).split('.').map(Number).reduce((a,b,i)=>(a||0)*1000+b,0) >= '$required_version'.split('.').map(Number).reduce((a,b,i)=>(a||0)*1000+b,0) ? 0 : 1)"; then
        log_error "Node.js版本过低，需要 >= $required_version，当前版本: $node_version"
        exit 1
    fi

    local npm_version=$(npm -v)
    log_success "Node.js版本检查通过: $node_version (npm: $npm_version)"
}

# 配置代理（如果需要）
setup_proxy() {
    if [ "${USE_PROXY:-false}" = "true" ]; then
        log_step "配置网络代理..."
        export http_proxy="http://$PROXY_HOST:$PROXY_PORT"
        export https_proxy="http://$PROXY_HOST:$PROXY_PORT"
        export HTTP_PROXY="http://$PROXY_HOST:$PROXY_PORT"
        export HTTPS_PROXY="http://$PROXY_HOST:$PROXY_PORT"
        log_success "代理配置完成: $PROXY_HOST:$PROXY_PORT"
    fi
}

# 检查后端依赖
check_backend_dependencies() {
    log_step "检查后端依赖..."

    cd "$PROJECT_ROOT"

    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        log_info "安装后端依赖..."
        if [ "${USE_PROXY:-false}" = "true" ]; then
            npm config set proxy "http://$PROXY_HOST:$PROXY_PORT"
            npm config set https-proxy "http://$PROXY_HOST:$PROXY_PORT"
        fi
        npm ci --silent
        log_success "后端依赖安装完成"
    else
        log_debug "后端依赖已存在，跳过安装"
    fi
}

# 检查前端依赖
check_frontend_dependencies() {
    log_step "检查前端依赖..."

    if [ ! -d "$PROJECT_ROOT/frontend" ]; then
        log_error "前端目录不存在: $PROJECT_ROOT/frontend"
        exit 1
    fi

    cd "$PROJECT_ROOT/frontend"

    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        log_info "安装前端依赖..."
        if [ "${USE_PROXY:-false}" = "true" ]; then
            npm config set proxy "http://$PROXY_HOST:$PROXY_PORT"
            npm config set https-proxy "http://$PROXY_HOST:$PROXY_PORT"
        fi
        npm ci --silent
        log_success "前端依赖安装完成"
    else
        log_debug "前端依赖已存在，跳过安装"
    fi

    cd "$PROJECT_ROOT"
}

# 加载环境配置
load_environment() {
    log_step "加载环境配置: $ENV"

    # 设置NODE_ENV
    export NODE_ENV="$ENV"

    # 加载.env文件
    local env_files=(".env" ".env.local" ".env.$ENV" ".env.$ENV.local")

    for env_file in "${env_files[@]}"; do
        local full_path="$PROJECT_ROOT/$env_file"
        if [ -f "$full_path" ]; then
            log_debug "加载环境文件: $env_file"
            set -a
            source "$full_path"
            set +a
        fi
    done

    # 检查关键环境变量
    if [ "$ENV" = "production" ] && [ -z "${JWT_SECRET:-}" ]; then
        log_error "生产环境必须设置 JWT_SECRET"
        exit 1
    fi

    # 设置默认值
    export PORT="${PORT:-3000}"
    export HOST="${HOST:-0.0.0.0}"
    export LOG_LEVEL="${LOG_LEVEL:-info}"

    if [ "$ENV" = "development" ]; then
        export LOG_LEVEL="${LOG_LEVEL:-debug}"
        export DEBUG="${DEBUG:-true}"
    fi

    log_success "环境配置加载完成 (PORT: $PORT, LOG_LEVEL: $LOG_LEVEL)"
}

# 初始化数据库
init_database() {
    log_step "初始化数据库..."

    cd "$PROJECT_ROOT"

    # 创建数据目录
    mkdir -p data logs

    # 检查数据库文件
    local db_file="./data/logistics.db"
    if [ "$ENV" = "test" ]; then
        db_file="./data/test_e2e.db"
    fi

    local db_exists=false
    if [ -f "$db_file" ]; then
        db_exists=true
        log_debug "数据库文件已存在: $db_file"
    fi

    # 运行数据库迁移
    log_info "运行数据库迁移..."
    if npm run migrate:latest --silent; then
        log_success "数据库迁移完成"
    else
        log_warning "数据库迁移失败，可能是首次运行"
    fi

    # 如果是开发或测试环境，且数据库是新建的，运行种子数据
    if [ "$ENV" = "development" ] || [ "$ENV" = "test" ]; then
        if [ "$db_exists" = "false" ] || [ "${FORCE_SEED:-false}" = "true" ]; then
            log_info "初始化种子数据..."
            if npm run seed:run --silent 2>/dev/null; then
                log_success "种子数据初始化完成"
            else
                log_debug "种子数据初始化跳过（无种子文件或已存在）"
            fi
        fi
    fi
}

# 后端健康检查
check_backend_health() {
    local max_attempts=30
    local attempt=1
    local port="${PORT:-3000}"

    log_info "等待后端服务启动 (端口: $port)..."

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$port/health" > /dev/null 2>&1; then
            log_success "后端服务健康检查通过"
            return 0
        fi

        if [ $attempt -eq 1 ]; then
            echo -n "等待中"
        else
            echo -n "."
        fi

        sleep 2
        ((attempt++))
    done

    echo ""
    log_error "后端服务启动失败或健康检查超时"
    return 1
}

# 前端健康检查
check_frontend_health() {
    local max_attempts=30
    local attempt=1
    local port="5173"  # Vite默认端口

    log_info "等待前端服务启动 (端口: $port)..."

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$port" > /dev/null 2>&1; then
            log_success "前端服务健康检查通过"
            return 0
        fi

        if [ $attempt -eq 1 ]; then
            echo -n "等待中"
        else
            echo -n "."
        fi

        sleep 2
        ((attempt++))
    done

    echo ""
    log_error "前端服务启动失败或健康检查超时"
    return 1
}

# 启动后端服务
start_backend() {
    log_step "启动后端服务..."

    cd "$PROJECT_ROOT"

    case "$ENV" in
        "development")
            log_info "启动后端开发模式 (nodemon)..."
            npm run dev &
            BACKEND_PID=$!
            ;;
        "production")
            log_info "启动后端生产模式..."
            npm start &
            BACKEND_PID=$!
            ;;
        "test")
            log_info "启动后端测试模式..."
            NODE_ENV=test npm start &
            BACKEND_PID=$!
            ;;
        *)
            log_error "不支持的环境: $ENV"
            exit 1
            ;;
    esac

    log_success "后端服务已启动 (PID: $BACKEND_PID)"

    # 健康检查
    if ! check_backend_health; then
        log_error "后端服务启动失败"
        exit 1
    fi
}

# 启动前端服务
start_frontend() {
    log_step "启动前端服务..."

    cd "$PROJECT_ROOT/frontend"

    case "$ENV" in
        "development")
            log_info "启动前端开发模式 (Vite)..."
            npm run dev &
            FRONTEND_PID=$!
            ;;
        "production")
            log_info "构建并预览前端..."
            npm run build
            npm run preview &
            FRONTEND_PID=$!
            ;;
        *)
            log_error "前端不支持环境: $ENV"
            exit 1
            ;;
    esac

    cd "$PROJECT_ROOT"
    log_success "前端服务已启动 (PID: $FRONTEND_PID)"

    # 健康检查
    if ! check_frontend_health; then
        log_error "前端服务启动失败"
        exit 1
    fi
}

# Docker模式启动
start_docker() {
    log_step "启动Docker开发环境..."

    cd "$PROJECT_ROOT"

    # 检查Docker是否可用
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装或不可用"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose未安装或不可用"
        exit 1
    fi

    # 停止现有容器
    log_info "停止现有容器..."
    docker-compose -f docker-compose.dev.yml down --remove-orphans

    # 启动开发环境
    log_info "启动Docker开发环境..."
    docker-compose -f docker-compose.dev.yml up --build
}

# 显示服务信息
show_service_info() {
    echo ""
    echo "=========================================="
    echo "🚀 WLBJ物流报价系统已启动"
    echo "=========================================="
    echo ""

    if [ "$MODE" = "full" ] || [ "$MODE" = "backend" ]; then
        echo "📡 后端服务:"
        echo "   - API地址: http://localhost:${PORT:-3000}"
        echo "   - 健康检查: http://localhost:${PORT:-3000}/health"
        echo "   - 环境: $ENV"
        echo ""
    fi

    if [ "$MODE" = "full" ] || [ "$MODE" = "frontend" ]; then
        echo "🌐 前端服务:"
        echo "   - 访问地址: http://localhost:5173"
        echo "   - 环境: $ENV"
        echo ""
    fi

    if [ "$MODE" = "docker" ]; then
        echo "🐳 Docker服务:"
        echo "   - 应用: http://localhost:3000"
        echo "   - 数据库管理: http://localhost:5050"
        echo "   - Redis管理: http://localhost:8001"
        echo ""
    fi

    echo "📝 日志文件: ./logs/"
    echo "🗄️  数据库: ./data/"
    echo ""
    echo "按 Ctrl+C 停止服务"
    echo "=========================================="
}

# 显示使用说明
show_usage() {
    echo "WLBJ物流报价系统开发环境启动脚本"
    echo ""
    echo "用法: $0 [environment] [mode]"
    echo ""
    echo "环境选项:"
    echo "  development  - 开发环境（默认）"
    echo "  production   - 生产环境"
    echo "  test         - 测试环境"
    echo ""
    echo "模式选项:"
    echo "  full         - 启动前后端（默认）"
    echo "  backend      - 仅启动后端"
    echo "  frontend     - 仅启动前端"
    echo "  docker       - 使用Docker启动"
    echo ""
    echo "环境变量:"
    echo "  USE_PROXY=true     - 启用代理"
    echo "  PROXY_HOST=host    - 代理主机（默认: 127.0.0.1）"
    echo "  PROXY_PORT=port    - 代理端口（默认: 7890）"
    echo "  DEBUG=true         - 启用调试模式"
    echo "  FORCE_SEED=true    - 强制重新初始化种子数据"
    echo ""
    echo "示例:"
    echo "  $0                           # 启动开发环境（前后端）"
    echo "  $0 development full          # 启动开发环境（前后端）"
    echo "  $0 development backend       # 仅启动后端开发环境"
    echo "  $0 development frontend      # 仅启动前端开发环境"
    echo "  $0 development docker        # 使用Docker启动开发环境"
    echo "  USE_PROXY=true $0            # 使用代理启动"
}

# 等待用户输入
wait_for_user() {
    if [ "$MODE" != "docker" ]; then
        echo ""
        echo "服务正在运行中..."
        echo "按任意键查看实时日志，或按 Ctrl+C 停止服务"
        read -n 1 -s

        # 显示实时日志
        if [ -n "$BACKEND_PID" ] && [ -n "$FRONTEND_PID" ]; then
            log_info "显示实时日志（前后端）..."
            tail -f logs/combined.log 2>/dev/null &
        elif [ -n "$BACKEND_PID" ]; then
            log_info "显示后端实时日志..."
            tail -f logs/combined.log 2>/dev/null &
        fi

        # 等待用户中断
        wait
    fi
}

# 主函数
main() {
    # 检查帮助参数
    if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
        show_usage
        exit 0
    fi

    # 检查参数数量
    if [ "$#" -gt 2 ]; then
        show_usage
        exit 1
    fi

    # 显示启动信息
    echo ""
    echo "🚀 启动WLBJ物流报价系统"
    echo "   环境: $ENV"
    echo "   模式: $MODE"
    echo "   时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""

    # 执行启动流程
    check_system_requirements
    check_node_version
    setup_proxy
    load_environment

    case "$MODE" in
        "docker")
            start_docker
            ;;
        "backend")
            check_backend_dependencies
            init_database
            start_backend
            show_service_info
            wait_for_user
            ;;
        "frontend")
            check_frontend_dependencies
            start_frontend
            show_service_info
            wait_for_user
            ;;
        "full")
            check_backend_dependencies
            check_frontend_dependencies
            init_database
            start_backend
            start_frontend
            show_service_info
            wait_for_user
            ;;
        *)
            log_error "不支持的模式: $MODE"
            show_usage
            exit 1
            ;;
    esac
}

# 验证参数
validate_args() {
    # 检查帮助参数
    if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
        return 0  # 跳过验证，直接显示帮助
    fi

    local valid_envs=("development" "production" "test")
    local valid_modes=("full" "backend" "frontend" "docker")

    # 验证环境
    local env_valid=false
    for valid_env in "${valid_envs[@]}"; do
        if [ "$ENV" = "$valid_env" ]; then
            env_valid=true
            break
        fi
    done

    if [ "$env_valid" = "false" ]; then
        log_error "无效的环境: $ENV"
        show_usage
        exit 1
    fi

    # 验证模式
    local mode_valid=false
    for valid_mode in "${valid_modes[@]}"; do
        if [ "$MODE" = "$valid_mode" ]; then
            mode_valid=true
            break
        fi
    done

    if [ "$mode_valid" = "false" ]; then
        log_error "无效的模式: $MODE"
        show_usage
        exit 1
    fi
}

# 执行主流程
validate_args "$@"
main "$@"
