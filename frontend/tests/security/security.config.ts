/**
 * 安全测试配置
 * 定义安全测试的配置和工具函数
 */

import { vi } from 'vitest';

// 安全测试常量
export const SECURITY_TEST_CONFIG = {
  // 测试超时时间
  TIMEOUT: 10000,
  
  // 模拟延迟
  NETWORK_DELAY: 100,
  
  // 测试用户数据
  TEST_USERS: {
    REGULAR_USER: {
      id: '1',
      email: 'user@example.com',
      role: 'user' as const,
      name: 'Test User',
      username: 'testuser',
      createdAt: '2024-01-01T00:00:00Z'
    },
    ADMIN_USER: {
      id: '2',
      email: 'admin@example.com',
      role: 'admin' as const,
      name: 'Admin User',
      username: 'admin',
      createdAt: '2024-01-01T00:00:00Z'
    },
    PROVIDER_USER: {
      id: '3',
      email: 'provider@example.com',
      role: 'provider' as const,
      name: 'Provider User',
      username: 'provider',
      providerId: 'provider-123',
      createdAt: '2024-01-01T00:00:00Z'
    }
  },
  
  // 测试令牌
  TEST_TOKENS: {
    VALID_ACCESS_TOKEN: 'valid-access-token-123',
    EXPIRED_ACCESS_TOKEN: 'expired-access-token-456',
    INVALID_ACCESS_TOKEN: 'invalid-access-token-789',
    REFRESH_TOKEN: 'refresh-token-123'
  },
  
  // 恶意输入测试数据
  MALICIOUS_INPUTS: {
    XSS_SCRIPT: '<script>alert("xss")</script>',
    SQL_INJECTION: "'; DROP TABLE users; --",
    HTML_INJECTION: '<img src="x" onerror="alert(1)">',
    LONG_STRING: 'A'.repeat(10000),
    NULL_BYTES: '\0\0\0',
    UNICODE_ATTACK: '𝕏𝕊𝕊',
  }
};

// 创建模拟的 localStorage
export function createMockLocalStorage() {
  const storage = new Map<string, string>();
  
  return {
    getItem: vi.fn((key: string) => storage.get(key) || null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
    key: vi.fn((index: number) => Array.from(storage.keys())[index] || null),
    get length() { return storage.size; }
  };
}

// 创建模拟的 API 响应
export function createMockApiResponse<T>(data: T, success = true, delay = 0) {
  return new Promise<{ success: boolean; data?: T; error?: string }>((resolve) => {
    setTimeout(() => {
      if (success) {
        resolve({ success: true, data });
      } else {
        resolve({ success: false, error: '操作失败' });
      }
    }, delay);
  });
}

// 创建模拟的认证状态
export function createMockAuthState(user: any = null, isAuthenticated = false, isLoading = false) {
  return {
    user,
    isAuthenticated,
    isLoading,
    login: vi.fn(),
    loginProvider: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    updateUser: vi.fn(),
  };
}

// 安全测试工具函数
export const SecurityTestUtils = {
  // 验证敏感信息不会泄露到控制台
  checkConsoleForSensitiveData: (sensitiveData: string[]) => {
    const consoleSpy = vi.spyOn(console, 'log');
    const consoleErrorSpy = vi.spyOn(console, 'error');
    const consoleWarnSpy = vi.spyOn(console, 'warn');
    
    return {
      verify: () => {
        const allLogs = [
          ...consoleSpy.mock.calls.flat(),
          ...consoleErrorSpy.mock.calls.flat(),
          ...consoleWarnSpy.mock.calls.flat()
        ];
        
        sensitiveData.forEach(data => {
          allLogs.forEach(log => {
            if (typeof log === 'string') {
              expect(log).not.toContain(data);
            }
          });
        });
      },
      restore: () => {
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
      }
    };
  },
  
  // 模拟网络错误
  simulateNetworkError: (message = '网络连接失败') => {
    return Promise.reject(new Error(message));
  },
  
  // 模拟认证错误
  simulateAuthError: (code = 401, message = '认证失败') => {
    const error = new Error(message);
    (error as any).status = code;
    return Promise.reject(error);
  },
  
  // 验证输入清理
  verifyInputSanitization: (input: string, output: string) => {
    // 检查是否移除了危险字符
    expect(output).not.toContain('<script>');
    expect(output).not.toContain('javascript:');
    expect(output).not.toContain('onload=');
    expect(output).not.toContain('onerror=');
  },
  
  // 验证 CSRF 保护
  verifyCsrfProtection: (requestHeaders: Record<string, string>) => {
    // 检查是否包含 CSRF 令牌或其他保护机制
    expect(
      requestHeaders['X-CSRF-Token'] || 
      requestHeaders['X-Requested-With'] ||
      requestHeaders['Authorization']
    ).toBeDefined();
  },
  
  // 验证会话安全
  verifySessionSecurity: (sessionData: any) => {
    // 检查会话数据不包含敏感信息
    expect(sessionData).not.toHaveProperty('password');
    expect(sessionData).not.toHaveProperty('secret');
    expect(sessionData).not.toHaveProperty('privateKey');
  }
};

// 安全测试断言
export const SecurityAssertions = {
  // 断言用户只能访问自己的数据
  assertUserDataIsolation: (userData: any, currentUserId: string) => {
    if (userData.userId) {
      expect(userData.userId).toBe(currentUserId);
    }
    if (userData.ownerId) {
      expect(userData.ownerId).toBe(currentUserId);
    }
  },
  
  // 断言角色权限正确
  assertRolePermissions: (userRole: string, allowedRoles: string[]) => {
    expect(allowedRoles).toContain(userRole);
  },
  
  // 断言令牌格式正确
  assertTokenFormat: (token: string) => {
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
    // JWT 令牌应该有三个部分
    if (token.includes('.')) {
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    }
  },
  
  // 断言密码安全性
  assertPasswordSecurity: (password: string) => {
    expect(password.length).toBeGreaterThanOrEqual(6);
    // 不应该包含常见的弱密码
    const weakPasswords = ['123456', 'password', 'admin', 'user'];
    weakPasswords.forEach(weak => {
      expect(password.toLowerCase()).not.toBe(weak);
    });
  },
  
  // 断言 URL 安全性
  assertUrlSecurity: (url: string) => {
    expect(url).not.toContain('javascript:');
    expect(url).not.toContain('data:');
    expect(url).not.toContain('vbscript:');
  }
};

// 性能安全测试
export const PerformanceSecurityTests = {
  // 测试防止 DoS 攻击
  testDoSProtection: async (apiCall: () => Promise<any>, maxCalls = 100) => {
    const promises = Array(maxCalls).fill(null).map(() => apiCall());
    
    // 应该有某种限制机制
    const results = await Promise.allSettled(promises);
    const failures = results.filter(r => r.status === 'rejected');
    
    // 如果所有请求都成功，可能存在 DoS 漏洞
    expect(failures.length).toBeGreaterThan(0);
  },
  
  // 测试内存泄漏
  testMemoryLeaks: (componentRender: () => void, iterations = 100) => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    for (let i = 0; i < iterations; i++) {
      componentRender();
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    // 内存增长不应该过大
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
  }
};

// 导出所有工具
export default {
  SECURITY_TEST_CONFIG,
  createMockLocalStorage,
  createMockApiResponse,
  createMockAuthState,
  SecurityTestUtils,
  SecurityAssertions,
  PerformanceSecurityTests
};
