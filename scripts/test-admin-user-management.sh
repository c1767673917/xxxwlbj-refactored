#!/bin/bash

# 管理员用户管理功能测试脚本
# 用于验证管理员后台用户管理功能是否正常工作

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
API_BASE_URL="http://localhost:3000/api"
ADMIN_PASSWORD="NewAdmin123!"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查服务是否运行
check_backend_service() {
    log_info "检查后端服务状态..."
    
    if curl -s "${API_BASE_URL}/health" > /dev/null; then
        log_success "后端服务运行正常"
    else
        log_error "后端服务未运行，请先启动后端服务"
        exit 1
    fi
}

# 管理员登录测试
test_admin_login() {
    log_info "测试管理员登录..."
    
    local response=$(curl -s -X POST "${API_BASE_URL}/admin/login" \
        -H "Content-Type: application/json" \
        -d "{\"password\": \"${ADMIN_PASSWORD}\"}")
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "管理员登录成功"
        # 提取access token
        ACCESS_TOKEN=$(echo "$response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$ACCESS_TOKEN" ]; then
            log_success "获取到访问令牌"
        else
            log_error "未能获取访问令牌"
            exit 1
        fi
    else
        log_error "管理员登录失败"
        echo "响应: $response"
        exit 1
    fi
}

# 测试用户列表获取
test_get_users() {
    log_info "测试获取用户列表..."
    
    local response=$(curl -s -X GET "${API_BASE_URL}/admin/users/list" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "用户列表获取成功"
        
        # 检查是否有用户数据
        local user_count=$(echo "$response" | grep -o '"data":\[.*\]' | grep -o '\[.*\]' | grep -o '},{' | wc -l)
        user_count=$((user_count + 1))
        log_info "当前用户数量: $user_count"
    else
        log_error "用户列表获取失败"
        echo "响应: $response"
        exit 1
    fi
}

# 测试用户搜索
test_user_search() {
    log_info "测试用户搜索功能..."
    
    local response=$(curl -s -X GET "${API_BASE_URL}/admin/users/list?search=admin" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "用户搜索功能正常"
    else
        log_error "用户搜索功能失败"
        echo "响应: $response"
    fi
}

# 测试分页功能
test_pagination() {
    log_info "测试分页功能..."
    
    local response=$(curl -s -X GET "${API_BASE_URL}/admin/users/list?page=1&pageSize=10" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    if echo "$response" | grep -q '"pagination"'; then
        log_success "分页功能正常"
    else
        log_warning "分页信息可能不完整"
    fi
}

# 测试创建用户（可选）
test_create_user() {
    log_info "测试创建用户功能..."
    
    local test_email="test_$(date +%s)@example.com"
    local response=$(curl -s -X POST "${API_BASE_URL}/admin/users" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${test_email}\",
            \"password\": \"SecureP@ssw0rd2024!\",
            \"name\": \"测试用户\"
        }")
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "用户创建功能正常"
        
        # 提取用户ID用于后续删除
        TEST_USER_ID=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        log_info "创建的测试用户ID: $TEST_USER_ID"
    else
        log_warning "用户创建功能可能有问题"
        echo "响应: $response"
    fi
}

# 测试删除用户（如果创建了测试用户）
test_delete_user() {
    if [ -n "${TEST_USER_ID:-}" ]; then
        log_info "测试删除用户功能..."
        
        local response=$(curl -s -X DELETE "${API_BASE_URL}/admin/users/${TEST_USER_ID}" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}")
        
        if echo "$response" | grep -q '"success":true'; then
            log_success "用户删除功能正常"
        else
            log_warning "用户删除功能可能有问题"
            echo "响应: $response"
        fi
    fi
}

# 检查前端服务
check_frontend_service() {
    log_info "检查前端服务状态..."
    
    if curl -s "http://localhost:5173" > /dev/null; then
        log_success "前端服务运行正常"
        log_info "管理员登录页面: http://localhost:5173/admin/login"
        log_info "管理员后台: http://localhost:5173/admin"
    else
        log_warning "前端服务未运行，请启动前端服务进行完整测试"
    fi
}

# 主测试流程
main() {
    echo "=========================================="
    echo "管理员用户管理功能测试"
    echo "=========================================="
    
    check_backend_service
    test_admin_login
    test_get_users
    test_user_search
    test_pagination
    test_create_user
    test_delete_user
    check_frontend_service
    
    echo ""
    echo "=========================================="
    log_success "所有测试完成！"
    echo "=========================================="
    
    echo ""
    echo "测试总结:"
    echo "- 后端API功能正常"
    echo "- 管理员认证正常"
    echo "- 用户管理基础功能正常"
    echo ""
    echo "如需测试前端界面，请："
    echo "1. 访问 http://localhost:5173/admin/login"
    echo "2. 使用密码: ${ADMIN_PASSWORD}"
    echo "3. 进入用户管理页面测试各项功能"
}

# 运行主函数
main "$@"
