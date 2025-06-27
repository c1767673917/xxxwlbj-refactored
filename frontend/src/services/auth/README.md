# 认证服务使用指南

## 概述

重构后的认证服务提供了智能的Token刷新机制，解决了原有系统中Token过期导致的用户体验问题。

## 主要特性

### 🚀 智能Token刷新
- 基于JWT过期时间精确计算刷新时机
- 避免用户操作期间Token突然失效
- 防止重复刷新请求

### 📊 实时状态监控
- Token状态实时监控
- 即将过期自动提醒
- 可视化状态展示

### 🛡️ 健壮错误处理
- 网络错误自动重试
- 刷新失败自动登出
- 完善的错误日志

## 基本使用

### 1. 用户登录
```typescript
import { authService } from '@/services/auth';

// 用户登录
try {
  const user = await authService.login({
    email: 'user@example.com',
    password: 'password'
  });
  console.log('登录成功:', user);
} catch (error) {
  console.error('登录失败:', error.message);
}
```

### 2. 检查认证状态
```typescript
// 检查是否已登录
if (authService.isAuthenticated()) {
  console.log('用户已登录');
  
  // 获取当前用户信息
  const user = authService.getAuthUser();
  console.log('当前用户:', user);
}
```

### 3. 手动刷新Token
```typescript
// 手动触发Token刷新
try {
  await authService.forceRefreshToken();
  console.log('Token刷新成功');
} catch (error) {
  console.error('Token刷新失败:', error.message);
}
```

### 4. 获取Token状态
```typescript
// 获取Token详细信息
const tokenInfo = authService.getTokenInfo();
if (tokenInfo) {
  console.log('Token状态:', tokenInfo.status);
  console.log('剩余时间:', tokenInfo.remainingTime);
  console.log('过期时间:', tokenInfo.expiresAt);
}

// 检查Token是否即将过期
if (authService.isTokenNearExpiry()) {
  console.log('Token即将过期，建议刷新');
}
```

## 使用Hook

### useTokenStatus Hook
```typescript
import { useTokenStatus } from '@/hooks/useTokenStatus';

function MyComponent() {
  const {
    tokenInfo,
    isRefreshing,
    refreshToken,
    isNearExpiry,
    getStatusText
  } = useTokenStatus({
    onNearExpiry: (tokenInfo) => {
      // Token即将过期时的处理
      console.log('Token即将过期:', tokenInfo);
    },
    onExpired: (tokenInfo) => {
      // Token过期时的处理
      console.log('Token已过期:', tokenInfo);
    }
  });

  return (
    <div>
      <p>Token状态: {getStatusText()}</p>
      <button 
        onClick={refreshToken}
        disabled={isRefreshing}
      >
        {isRefreshing ? '刷新中...' : '刷新Token'}
      </button>
    </div>
  );
}
```

## 使用组件

### TokenStatusMonitor 组件
```typescript
import { TokenStatusMonitor } from '@/components/TokenStatusMonitor';

function App() {
  return (
    <div>
      {/* 基础状态监控 */}
      <TokenStatusMonitor />
      
      {/* 显示详细信息 */}
      <TokenStatusMonitor 
        showDetails={true}
        onNearExpiry={(tokenInfo) => {
          // 自定义即将过期处理
          notification.warning({
            message: 'Token即将过期',
            description: '请及时刷新'
          });
        }}
      />
    </div>
  );
}
```

## 配置选项

### 环境变量配置
```typescript
// src/constants/index.ts
export const SECURITY_CONFIG = {
  // Token刷新阈值：在过期前5分钟刷新
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000,
  // 自动登出超时：30分钟无操作
  AUTO_LOGOUT_TIMEOUT: 30 * 60 * 1000,
} as const;
```

### Hook配置选项
```typescript
const tokenStatus = useTokenStatus({
  // 自动刷新阈值（毫秒）
  autoRefreshThreshold: 5 * 60 * 1000,
  // 是否启用自动刷新
  enableAutoRefresh: true,
  // 状态更新间隔（毫秒）
  updateInterval: 30 * 1000,
  // 回调函数
  onNearExpiry: (tokenInfo) => { /* 处理逻辑 */ },
  onExpired: (tokenInfo) => { /* 处理逻辑 */ },
  onRefreshSuccess: (tokenInfo) => { /* 处理逻辑 */ },
  onRefreshError: (error) => { /* 处理逻辑 */ }
});
```

## API参考

### AuthService 方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `login(credentials)` | 用户登录 | `{email, password}` | `Promise<AuthUser>` |
| `logout()` | 用户登出 | - | `Promise<void>` |
| `refreshAccessToken()` | 刷新Token | - | `Promise<void>` |
| `isAuthenticated()` | 检查认证状态 | - | `boolean` |
| `getAuthUser()` | 获取当前用户 | - | `AuthUser \| null` |
| `getTokenInfo()` | 获取Token信息 | - | `TokenInfo \| null` |
| `isTokenNearExpiry()` | 检查即将过期 | - | `boolean` |
| `forceRefreshToken()` | 手动刷新Token | - | `Promise<void>` |

### Token状态枚举

```typescript
enum TokenStatus {
  VALID = 'valid',           // 有效
  EXPIRED = 'expired',       // 已过期
  NEAR_EXPIRY = 'near_expiry', // 即将过期
  INVALID = 'invalid'        // 无效
}
```

## 最佳实践

### 1. 错误处理
```typescript
try {
  await authService.login(credentials);
} catch (error) {
  if (error.message.includes('网络')) {
    // 处理网络错误
  } else if (error.message.includes('密码')) {
    // 处理认证错误
  } else {
    // 处理其他错误
  }
}
```

### 2. 状态监控
```typescript
// 在应用根组件中添加Token监控
function App() {
  return (
    <div>
      <TokenStatusMonitor />
      <Routes>
        {/* 路由配置 */}
      </Routes>
    </div>
  );
}
```

### 3. 路由保护
```typescript
import { authService } from '@/services/auth';

function ProtectedRoute({ children }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  
  return children;
}
```

## 故障排除

### 常见问题

1. **Token刷新失败**
   - 检查网络连接
   - 确认refresh token有效
   - 查看控制台错误日志

2. **频繁登出**
   - 检查服务器时间同步
   - 确认Token有效期配置
   - 检查SECURITY_CONFIG配置

3. **状态不更新**
   - 确认useTokenStatus Hook正确使用
   - 检查组件是否正确挂载
   - 查看浏览器控制台警告

### 调试技巧

```typescript
// 启用调试日志
localStorage.setItem('debug', 'auth:*');

// 查看Token详细信息
console.log('Token Info:', authService.getTokenInfo());

// 手动触发状态检查
authService.forceRefreshToken();
```

## 迁移指南

### 从旧版本迁移

1. **更新导入**
```typescript
// 旧版本
import { AuthService } from '@/services/auth';

// 新版本
import { authService } from '@/services/auth';
```

2. **更新方法调用**
```typescript
// 旧版本
AuthService.login(credentials);

// 新版本
authService.login(credentials);
```

3. **添加状态监控**
```typescript
// 在应用中添加Token状态监控
<TokenStatusMonitor showDetails={true} />
```

## 性能考虑

- Token状态检查间隔默认为30秒，可根据需要调整
- 避免在短时间内频繁调用Token相关API
- 使用Hook时注意组件卸载时的清理工作

## 安全注意事项

- 不要在客户端存储敏感信息
- 定期检查Token有效期配置
- 监控异常的Token刷新行为
- 及时更新安全配置
