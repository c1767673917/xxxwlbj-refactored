# WLBJ前端项目

WLBJ物流报价系统的现代化前端应用，基于React 18 + TypeScript + Vite构建。

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm >= 8.0.0

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```
访问 http://localhost:5173

### 生产构建
```bash
npm run build:prod
```

### 预览构建产物
```bash
npm run preview
```

## 📁 项目结构

```
src/
├── components/          # 组件库
│   ├── admin/          # 管理员端组件
│   ├── auth/           # 认证相关组件
│   ├── layout/         # 布局组件
│   ├── provider/       # 供应商端组件
│   ├── ui/             # 基础UI组件
│   └── user/           # 用户端组件
├── services/           # API服务层
│   ├── api/            # API客户端
│   ├── auth/           # 认证服务
│   └── utils/          # 工具函数
├── types/              # TypeScript类型定义
├── router/             # 路由配置
├── constants/          # 常量定义
├── styles/             # 样式文件
├── App.tsx             # 应用入口
└── main.tsx            # React入口
```

## 🛠️ 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run build:prod` | 构建生产版本(优化) |
| `npm run preview` | 预览构建产物 |
| `npm run lint` | 运行ESLint检查 |
| `npm run lint:fix` | 自动修复ESLint问题 |
| `npm run format` | 格式化代码 |
| `npm run type-check` | TypeScript类型检查 |
| `npm run size-check` | 分析构建产物大小 |
| `npm run clean` | 清理构建缓存 |

## 🔧 技术栈

- **React 18.3.1** - 前端框架
- **TypeScript 5.6.2** - 类型安全
- **Vite 6.3.5** - 构建工具
- **Tailwind CSS 3.4.1** - 样式框架
- **React Router DOM 7.6.1** - 路由管理
- **Lucide React 0.344.0** - 图标库
- **ESLint + Prettier** - 代码质量

## 🎯 功能模块

### 用户端
- 订单管理
- 供应商选择
- 报价比较
- 用户设置

### 供应商端
- 可用订单查看
- 报价提交
- 报价历史

### 管理员端
- 用户管理
- 订单管理
- 系统设置
- 备份管理

## 🔐 认证系统

支持多角色认证：
- 普通用户登录
- 供应商登录
- 管理员登录

## 📱 响应式设计

完美适配：
- 桌面端 (1200px+)
- 平板端 (768px-1199px)
- 移动端 (<768px)

## 🚀 部署

### Docker部署
项目已集成到主项目的Docker配置中，无需单独部署。

### 手动部署
1. 构建项目：`npm run build:prod`
2. 将`dist/`目录部署到Web服务器
3. 配置反向代理到后端API

## 📄 许可证

本项目为内部项目，版权所有。

---

更多详细信息请参考 [前端重构计划文档](../docs/frontend-refactor-plan.md)。
