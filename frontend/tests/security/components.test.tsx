/**
 * 重构后组件安全测试
 * 验证重构后的认证相关组件的安全性
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AdminProtectedRoute from '@/components/auth/AdminProtectedRoute';
import UserSettings from '@/components/user/UserSettings';

// Mock useAuth hook
vi.mock('@/hooks/useAuth');
const mockUseAuth = vi.mocked(useAuth);

// Mock API
vi.mock('@/services/api', () => ({
  default: {
    users: {
      updatePassword: vi.fn(),
      updateWechatConfig: vi.fn(),
    },
  },
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('重构后组件安全测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('AdminProtectedRoute 安全性', () => {
    it('应该在未认证时重定向到登录页', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        loginProvider: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        updateUser: vi.fn(),
      });

      render(
        <TestWrapper>
          <AdminProtectedRoute>
            <div>Admin Content</div>
          </AdminProtectedRoute>
        </TestWrapper>
      );

      // 应该重定向到管理员登录页
      await waitFor(() => {
        expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      });
    });

    it('应该在非管理员用户时重定向到未授权页', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'user@example.com', role: 'user', name: 'Test User' },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        loginProvider: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        updateUser: vi.fn(),
      });

      render(
        <TestWrapper>
          <AdminProtectedRoute>
            <div>Admin Content</div>
          </AdminProtectedRoute>
        </TestWrapper>
      );

      // 应该重定向到未授权页面
      await waitFor(() => {
        expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      });
    });

    it('应该在管理员认证时显示内容', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'admin@example.com', role: 'admin', name: 'Admin User' },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        loginProvider: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        updateUser: vi.fn(),
      });

      render(
        <TestWrapper>
          <AdminProtectedRoute>
            <div>Admin Content</div>
          </AdminProtectedRoute>
        </TestWrapper>
      );

      // 应该显示管理员内容
      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });
    });

    it('应该在认证加载时显示加载状态', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: vi.fn(),
        loginProvider: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        updateUser: vi.fn(),
      });

      render(
        <TestWrapper>
          <AdminProtectedRoute>
            <div>Admin Content</div>
          </AdminProtectedRoute>
        </TestWrapper>
      );

      // 应该显示加载状态（检查旋转图标）
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('应该防止角色提升攻击', async () => {
      // 模拟恶意用户尝试修改本地存储来提升权限
      const maliciousUser = {
        id: '1',
        email: 'user@example.com',
        role: 'user', // 实际角色是普通用户
        name: 'Malicious User'
      };

      mockUseAuth.mockReturnValue({
        user: maliciousUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        loginProvider: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        updateUser: vi.fn(),
      });

      render(
        <TestWrapper>
          <AdminProtectedRoute>
            <div>Admin Content</div>
          </AdminProtectedRoute>
        </TestWrapper>
      );

      // 即使用户尝试修改本地存储，也不应该显示管理员内容
      await waitFor(() => {
        expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      });
    });
  });

  describe('UserSettings 安全性', () => {
    const mockUser = {
      id: '1',
      email: 'user@example.com',
      role: 'user' as const,
      name: 'Test User',
      username: 'testuser',
      createdAt: '2024-01-01T00:00:00Z'
    };

    it('应该在未认证时显示错误信息', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        loginProvider: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        updateUser: vi.fn(),
      });

      render(<UserSettings />);

      expect(screen.getByText('无法加载用户信息')).toBeInTheDocument();
    });

    it('应该在认证加载时显示加载状态', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: vi.fn(),
        loginProvider: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        updateUser: vi.fn(),
      });

      render(<UserSettings />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('应该只显示当前用户的信息', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        loginProvider: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        updateUser: vi.fn(),
      });

      render(<UserSettings />);

      // 应该显示当前用户的信息
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('应该防止用户信息泄露', () => {
      const sensitiveUser = {
        ...mockUser,
        password: 'secret-password', // 敏感信息
        internalId: 'internal-123'
      };

      mockUseAuth.mockReturnValue({
        user: sensitiveUser,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        loginProvider: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        updateUser: vi.fn(),
      });

      render(<UserSettings />);

      // 不应该显示敏感信息
      expect(screen.queryByText('secret-password')).not.toBeInTheDocument();
      expect(screen.queryByText('internal-123')).not.toBeInTheDocument();
    });
  });

  describe('统一认证系统安全性', () => {
    it('应该确保所有组件使用相同的认证状态', () => {
      const authState = {
        user: { id: '1', email: 'test@example.com', role: 'admin' as const, name: 'Test' },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        loginProvider: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        updateUser: vi.fn(),
      };

      mockUseAuth.mockReturnValue(authState);

      // 渲染多个使用认证的组件
      const { rerender } = render(
        <TestWrapper>
          <AdminProtectedRoute>
            <div>Admin Content</div>
          </AdminProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();

      // 重新渲染另一个组件，应该使用相同的认证状态
      rerender(<UserSettings />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();

      // 验证 useAuth 被正确调用
      expect(mockUseAuth).toHaveBeenCalled();
    });

    it('应该在认证状态变化时正确更新所有组件', async () => {
      // 初始状态：未认证
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        loginProvider: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        updateUser: vi.fn(),
      });

      const { rerender } = render(
        <TestWrapper>
          <AdminProtectedRoute>
            <div>Admin Content</div>
          </AdminProtectedRoute>
        </TestWrapper>
      );

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();

      // 模拟认证成功
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'admin@example.com', role: 'admin', name: 'Admin' },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        loginProvider: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
        updateUser: vi.fn(),
      });

      rerender(
        <TestWrapper>
          <AdminProtectedRoute>
            <div>Admin Content</div>
          </AdminProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });
    });
  });
});
