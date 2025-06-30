# WLBJ物流报价系统 - 开发环境启动指南

## 快速开始

### 1. 基本启动

```bash
# 启动完整开发环境（前后端）
./start.sh

# 或者使用详细命令
./start.sh development full
```

### 2. 分别启动服务

```bash
# 仅启动后端
./start.sh development backend

# 仅启动前端
./start.sh development frontend

# 使用Docker启动
./start.sh development docker
```

## 启动模式说明

### 环境选项
- `development` - 开发环境（默认）
- `production` - 生产环境
- `test` - 测试环境

### 模式选项
- `full` - 启动前后端（默认）
- `backend` - 仅启动后端服务
- `frontend` - 仅启动前端服务
- `docker` - 使用Docker容器启动

## 环境变量配置

### 代理配置（适用于需要代理访问GitHub的环境）
```bash
# 启用代理
USE_PROXY=true ./start.sh

# 自定义代理地址
USE_PROXY=true PROXY_HOST=127.0.0.1 PROXY_PORT=7890 ./start.sh
```

### 调试模式
```bash
# 启用详细调试信息
DEBUG=true ./start.sh
```

### 强制重新初始化数据
```bash
# 强制重新运行种子数据
FORCE_SEED=true ./start.sh
```

## 服务访问地址

### 开发环境
- **后端API**: http://localhost:3000
- **前端界面**: http://localhost:5173
- **健康检查**: http://localhost:3000/health

### Docker环境
- **应用**: http://localhost:3000
- **数据库管理**: http://localhost:5050 (pgAdmin)
- **Redis管理**: http://localhost:8001 (RedisInsight)

## 环境配置文件

### 首次运行
1. 复制环境配置文件：
   ```bash
   cp .env.development.example .env.development
   ```

2. 根据需要修改配置：
   ```bash
   vim .env.development
   ```

### 配置文件说明
- `.env.development` - 开发环境配置
- `.env.production` - 生产环境配置
- `.env.test` - 测试环境配置

## 常见问题

### 端口占用
如果遇到端口占用问题，脚本会自动清理：
- 后端端口：3000
- 前端端口：5173
- 预览端口：4173

### 数据库初始化
首次运行时会自动：
1. 创建数据目录
2. 运行数据库迁移
3. 初始化种子数据（开发/测试环境）

### 依赖安装
脚本会自动检查并安装：
- 后端依赖（根目录）
- 前端依赖（frontend目录）

## 停止服务

按 `Ctrl+C` 停止服务，脚本会自动清理所有进程。

## 日志查看

### 实时日志
启动后按任意键可查看实时日志。

### 日志文件
- 应用日志：`./logs/combined.log`
- 错误日志：`./logs/error.log`

## 高级用法

### 生产环境部署
```bash
# 生产环境启动
./start.sh production full

# 仅生产后端
./start.sh production backend
```

### 测试环境
```bash
# 测试环境启动
./start.sh test backend
```

## 系统要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- curl（用于健康检查）
- lsof（用于端口管理）

## Docker要求（可选）

- Docker
- docker-compose

## 故障排除

### 权限问题
```bash
chmod +x start.sh scripts/start.sh
```

### 清理环境
```bash
# 清理node_modules
rm -rf node_modules frontend/node_modules

# 清理数据库
rm -rf data/*.db

# 重新启动
./start.sh
```

### 查看帮助
```bash
./start.sh --help
```
