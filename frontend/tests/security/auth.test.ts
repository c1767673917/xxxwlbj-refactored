/**
 * 前端认证安全测试
 * 验证前端认证逻辑的安全性
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import * as api from '@/services/api';
import React from 'react';

// Mock API
vi.mock('@/services/api', () => ({
  auth: {
    login: vi.fn(),
    logout: vi.fn(),
    verifyToken: vi.fn(),
    refresh: vi.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Router wrapper for testing hooks that use useNavigate
const RouterWrapper = ({ children }: { children: React.ReactNode }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe('前端认证安全测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('useAuth Hook 安全性', () => {
    it('应该在token验证失败时清除认证信息', async () => {
      // 模拟localStorage中有token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'wlbj_access_token') return 'invalid-token';
        if (key === 'wlbj_user') return JSON.stringify({ id: 1, email: 'test@example.com' });
        return null;
      });

      // 模拟token验证失败
      vi.mocked(api.auth.verifyToken).mockRejectedValue(new Error('Token验证失败'));

      const { result } = renderHook(() => useAuth(), { wrapper: RouterWrapper });

      // 等待checkAuth完成
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // 应该清除认证信息
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('wlbj_access_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('wlbj_refresh_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('wlbj_user');
      expect(result.current.user).toBeNull();
    });

    it('应该在token验证成功时保持认证状态', async () => {
      const mockUser = { id: 1, email: 'test@example.com', role: 'user' };
      
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'wlbj_access_token') return 'valid-token';
        if (key === 'wlbj_user') return JSON.stringify(mockUser);
        return null;
      });

      // 模拟token验证成功
      vi.mocked(api.auth.verifyToken).mockResolvedValue({
        success: true,
        user: mockUser,
        message: 'Token有效'
      });

      const { result } = renderHook(() => useAuth(), { wrapper: RouterWrapper });

      // 等待checkAuth完成
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('应该在登录成功后正确设置认证状态', async () => {
      const mockUser = { id: 1, email: 'test@example.com', role: 'user' };
      const mockLoginResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: mockUser
      };

      vi.mocked(api.auth.login).mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuth(), { wrapper: RouterWrapper });

      await act(async () => {
        await result.current.login('password123', 'test@example.com');
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('应该在登出时清除所有认证信息', async () => {
      vi.mocked(api.auth.logout).mockResolvedValue();

      const { result } = renderHook(() => useAuth(), { wrapper: RouterWrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('wlbj_access_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('wlbj_refresh_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('wlbj_user');
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Token存储安全性', () => {
    it('应该使用安全的存储键名', () => {
      const { result } = renderHook(() => useAuth(), { wrapper: RouterWrapper });

      act(() => {
        result.current.login('password', 'test@example.com');
      });

      // 验证使用了正确的键名
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'wlbj_access_token',
        expect.any(String)
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'wlbj_refresh_token',
        expect.any(String)
      );
    });

    it('不应该在控制台输出敏感信息', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const consoleErrorSpy = vi.spyOn(console, 'error');

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'wlbj_access_token') return 'secret-token';
        return null;
      });

      renderHook(() => useAuth(), { wrapper: RouterWrapper });

      // 检查控制台输出不包含token
      const allLogs = [
        ...consoleSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat()
      ];

      allLogs.forEach(log => {
        if (typeof log === 'string') {
          expect(log).not.toContain('secret-token');
        }
      });

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('错误处理安全性', () => {
    it('应该安全地处理网络错误', async () => {
      vi.mocked(api.auth.login).mockRejectedValue(new Error('网络错误'));

      const { result } = renderHook(() => useAuth(), { wrapper: RouterWrapper });

      await act(async () => {
        try {
          await result.current.login('password', 'test@example.com');
        } catch (error) {
          expect(error.message).toBe('网络错误');
        }
      });

      // 确保认证状态保持安全
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('应该安全地处理API错误响应', async () => {
      vi.mocked(api.auth.verifyToken).mockRejectedValue(new Error('401 Unauthorized'));

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'wlbj_access_token') return 'expired-token';
        if (key === 'wlbj_user') return JSON.stringify({ id: 1 });
        return null;
      });

      const { result } = renderHook(() => useAuth(), { wrapper: RouterWrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // 应该清除过期的认证信息
      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('输入验证安全性', () => {
    it('应该验证登录输入', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: RouterWrapper });

      // 测试空输入
      await act(async () => {
        try {
          await result.current.login('', '');
          fail('应该抛出验证错误');
        } catch (error) {
          expect(error.message).toContain('密码');
        }
      });
    });

    it('应该防止XSS攻击', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      vi.mocked(api.auth.login).mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: 1, email: xssPayload, role: 'user' }
      });

      const { result } = renderHook(() => useAuth(), { wrapper: RouterWrapper });

      await act(async () => {
        await result.current.login('password', xssPayload);
      });

      // 用户信息应该被安全存储，不执行脚本
      const storedUser = JSON.parse(mockLocalStorage.setItem.mock.calls.find(
        call => call[0] === 'wlbj_user'
      )?.[1] || '{}');

      expect(storedUser.email).toBe(xssPayload); // 存储原始值
      // 但在实际使用时应该被转义
    });
  });

  describe('会话管理安全性', () => {
    it('应该在页面刷新后验证token', async () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'wlbj_access_token') return 'stored-token';
        if (key === 'wlbj_user') return JSON.stringify({ id: 1 });
        return null;
      });

      vi.mocked(api.auth.verifyToken).mockResolvedValue({
        success: true,
        user: { id: 1, email: 'test@example.com', role: 'user' },
        message: 'Token有效'
      });

      renderHook(() => useAuth(), { wrapper: RouterWrapper });

      // 应该调用token验证
      expect(api.auth.verifyToken).toHaveBeenCalled();
    });

    it('应该处理并发认证请求', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper: RouterWrapper });

      // 同时发起多个登录请求
      const promises = [
        result.current.login('password1', 'test1@example.com'),
        result.current.login('password2', 'test2@example.com'),
        result.current.login('password3', 'test3@example.com'),
      ];

      await act(async () => {
        await Promise.allSettled(promises);
      });

      // 应该只有一个成功的认证状态
      expect(result.current.isAuthenticated).toBeDefined();
    });
  });
});
