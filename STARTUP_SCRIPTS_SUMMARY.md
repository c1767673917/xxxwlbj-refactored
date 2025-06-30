# WLBJ物流报价系统 - 启动脚本功能总结

## 📁 脚本文件列表

### 主要启动脚本
- `start.sh` - 根目录快捷启动脚本
- `scripts/start.sh` - 完整功能启动脚本
- `START_GUIDE.md` - 详细使用指南

### 快捷启动脚本
- `dev.sh` - 快速启动完整开发环境
- `backend.sh` - 快速启动后端服务
- `frontend.sh` - 快速启动前端服务
- `docker.sh` - 快速启动Docker环境

## 🚀 核心功能特性

### 1. 多环境支持
- **development** - 开发环境（默认）
- **production** - 生产环境
- **test** - 测试环境

### 2. 多种启动模式
- **full** - 启动前后端（默认）
- **backend** - 仅启动后端服务
- **frontend** - 仅启动前端服务
- **docker** - 使用Docker容器启动

### 3. 智能依赖管理
- 自动检查Node.js版本（>=18.0.0）
- 自动安装缺失的依赖包
- 支持前后端依赖分别管理
- 支持代理环境下的依赖安装

### 4. 数据库自动化
- 自动创建数据目录
- 自动运行数据库迁移
- 开发环境自动初始化种子数据
- 支持SQLite和PostgreSQL

### 5. 健康检查机制
- 后端服务健康检查（/health端点）
- 前端服务可用性检查
- 启动超时保护（30秒）
- 详细的启动状态反馈

### 6. 进程管理
- 优雅的进程启动和停止
- 自动清理端口占用
- 支持Ctrl+C中断处理
- 后台进程PID跟踪

### 7. 环境配置管理
- 支持多层级环境文件加载
- 自动设置默认配置值
- 生产环境安全检查
- 环境变量验证

### 8. 代理支持
- 支持SOCKS5代理配置
- 适配GitHub访问受限环境
- 可配置代理主机和端口
- npm包安装代理支持

### 9. 日志和监控
- 彩色日志输出
- 时间戳标记
- 不同级别日志（INFO、SUCCESS、WARNING、ERROR）
- 实时日志查看功能

### 10. 用户友好界面
- 清晰的启动进度显示
- 详细的服务信息展示
- 完整的帮助文档
- 错误提示和故障排除

## 🛠️ 使用示例

### 基本使用
```bash
# 最简单的启动方式
./dev.sh

# 查看帮助
./start.sh --help

# 启动后端开发环境
./backend.sh
```

### 高级使用
```bash
# 使用代理启动
USE_PROXY=true ./start.sh

# 启用调试模式
DEBUG=true ./start.sh development full

# 强制重新初始化数据
FORCE_SEED=true ./start.sh

# 生产环境启动
./start.sh production full
```

### Docker使用
```bash
# Docker开发环境
./docker.sh

# 或者
./start.sh development docker
```

## 🔧 技术实现亮点

### 1. 错误处理
- 使用`set -euo pipefail`确保脚本安全
- 完善的错误捕获和处理
- 优雅的清理机制

### 2. 跨平台兼容
- 支持macOS和Linux
- 自动检测操作系统类型
- 兼容不同的shell环境

### 3. 参数验证
- 严格的参数类型检查
- 友好的错误提示
- 完整的使用说明

### 4. 性能优化
- 智能依赖检查（避免重复安装）
- 并行服务启动
- 高效的健康检查机制

### 5. 安全考虑
- 生产环境配置验证
- 敏感信息保护
- 权限检查

## 📋 文件结构

```
wlbj-refactored/
├── start.sh                    # 根目录快捷启动
├── dev.sh                      # 开发环境快捷启动
├── backend.sh                  # 后端快捷启动
├── frontend.sh                 # 前端快捷启动
├── docker.sh                   # Docker快捷启动
├── scripts/
│   └── start.sh                # 完整功能启动脚本
├── START_GUIDE.md              # 详细使用指南
├── STARTUP_SCRIPTS_SUMMARY.md  # 功能总结（本文件）
├── .env.development.example    # 开发环境配置示例
└── .env.production.example     # 生产环境配置示例
```

## 🎯 设计目标达成

✅ **易用性** - 一键启动，无需复杂配置
✅ **灵活性** - 支持多种启动模式和环境
✅ **可靠性** - 完善的错误处理和健康检查
✅ **可维护性** - 清晰的代码结构和文档
✅ **扩展性** - 易于添加新功能和配置选项

这套启动脚本系统为WLBJ物流报价系统提供了完整的开发环境管理解决方案，大大简化了开发者的工作流程。
