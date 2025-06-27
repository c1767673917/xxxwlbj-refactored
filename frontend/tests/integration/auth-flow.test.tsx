/**
 * 认证流程集成测试
 * 验证重构后认证系统的完整流程
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoginPage from '@/components/auth/LoginPage';
import AdminProtectedRoute from '@/components/auth/AdminProtectedRoute';
import UserSettings from '@/components/user/UserSettings';

// Mock API
vi.mock('@/services/api', () => ({
  default: {
    auth: {
      login: vi.fn(),
      logout: vi.fn(),
      verifyToken: vi.fn(),
      refresh: vi.fn(),
    },
    users: {
      updatePassword: vi.fn(),
      updateWechatConfig: vi.fn(),
    },
  },
}));

const mockApi = {
  auth: {
    login: vi.fn(),
    logout: vi.fn(),
    verifyToken: vi.fn(),
    refresh: vi.fn(),
  },
  users: {
    updatePassword: vi.fn(),
    updateWechatConfig: vi.fn(),
  },
};

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

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('认证流程集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockNavigate.mockClear();
  });

  describe('完整登录流程', () => {
    it('应该完成用户登录到访问受保护页面的完整流程', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        role: 'user',
        name: 'Test User',
        username: 'testuser',
        createdAt: '2024-01-01T00:00:00Z'
      };

      const mockLoginResponse = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: mockUser
      };

      // 模拟登录API成功
      mockApi.auth.login.mockResolvedValue(mockLoginResponse);
      mockApi.auth.verifyToken.mockResolvedValue({
        success: true,
        user: mockUser,
        message: 'Token有效'
      });

      // 1. 渲染登录页面
      const { rerender } = render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // 2. 填写登录表单
      const emailInput = screen.getByLabelText(/用户名.邮箱/i);
      const passwordInput = screen.getByLabelText(/密码/i);
      const loginButton = screen.getByRole('button', { name: /登录/i });

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // 3. 提交登录表单
      fireEvent.click(loginButton);

      // 4. 等待登录完成
      await waitFor(() => {
        expect(mockApi.auth.login).toHaveBeenCalledWith('password123', 'user@example.com');
      });

      // 5. 模拟认证状态更新后重新渲染用户设置页面
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'wlbj_access_token') return 'access-token-123';
        if (key === 'wlbj_refresh_token') return 'refresh-token-123';
        if (key === 'wlbj_user') return JSON.stringify(mockUser);
        return null;
      });

      rerender(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );

      // 6. 验证用户可以访问受保护的页面
      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
        expect(screen.getByText('user@example.com')).toBeInTheDocument();
      });
    });

    it('应该完成管理员登录到访问管理员页面的完整流程', async () => {
      const mockAdmin = {
        id: '1',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const mockLoginResponse = {
        accessToken: 'admin-token-123',
        refreshToken: 'admin-refresh-123',
        user: mockAdmin
      };

      mockApi.auth.login.mockResolvedValue(mockLoginResponse);
      mockApi.auth.verifyToken.mockResolvedValue({
        success: true,
        user: mockAdmin,
        message: 'Token有效'
      });

      // 模拟管理员已登录状态
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'wlbj_access_token') return 'admin-token-123';
        if (key === 'wlbj_refresh_token') return 'admin-refresh-123';
        if (key === 'wlbj_user') return JSON.stringify(mockAdmin);
        return null;
      });

      // 渲染管理员保护的路由
      render(
        <TestWrapper>
          <AdminProtectedRoute>
            <div>Admin Dashboard</div>
          </AdminProtectedRoute>
        </TestWrapper>
      );

      // 验证管理员可以访问管理员页面
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('安全边界测试', () => {
    it('应该阻止普通用户访问管理员页面', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        role: 'user',
        name: 'Regular User'
      };

      // 模拟普通用户已登录
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'wlbj_access_token') return 'user-token-123';
        if (key === 'wlbj_user') return JSON.stringify(mockUser);
        return null;
      });

      mockApi.auth.verifyToken.mockResolvedValue({
        success: true,
        user: mockUser,
        message: 'Token有效'
      });

      render(
        <TestWrapper>
          <AdminProtectedRoute>
            <div>Admin Dashboard</div>
          </AdminProtectedRoute>
        </TestWrapper>
      );

      // 普通用户不应该看到管理员内容
      await waitFor(() => {
        expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
      });
    });

    it('应该在token过期时自动登出', async () => {
      const mockUser = {
        id: '1',
        email: 'user@example.com',
        role: 'user',
        name: 'Test User'
      };

      // 模拟用户已登录但token过期
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'wlbj_access_token') return 'expired-token';
        if (key === 'wlbj_user') return JSON.stringify(mockUser);
        return null;
      });

      // 模拟token验证失败
      mockApi.auth.verifyToken.mockRejectedValue(new Error('Token已过期'));

      render(
        <TestWrapper>
          <UserSettings />
        </TestWrapper>
      );

      // 应该清除过期的认证信息
      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('wlbj_access_token');
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('wlbj_refresh_token');
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('wlbj_user');
      });

      // 应该显示未认证状态
      expect(screen.getByText('无法加载用户信息')).toBeInTheDocument();
    });

    it('应该防止会话固定攻击', async () => {
      const oldToken = 'old-session-token';
      const newToken = 'new-session-token';

      // 模拟旧会话
      mockLocalStorage.getItem.mockReturnValue(oldToken);

      const mockUser = {
        id: '1',
        email: 'user@example.com',
        role: 'user',
        name: 'Test User'
      };

      const mockLoginResponse = {
        accessToken: newToken,
        refreshToken: 'new-refresh-token',
        user: mockUser
      };

      mockApi.auth.login.mockResolvedValue(mockLoginResponse);

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // 执行登录
      const emailInput = screen.getByLabelText(/用户名.邮箱/i);
      const passwordInput = screen.getByLabelText(/密码/i);
      const loginButton = screen.getByRole('button', { name: /登录/i });

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockApi.auth.login).toHaveBeenCalled();
      });

      // 验证新token被设置，旧token被替换
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('wlbj_access_token', newToken);
    });
  });

  describe('错误恢复测试', () => {
    it('应该在网络错误后允许重试登录', async () => {
      // 第一次登录失败
      mockApi.auth.login.mockRejectedValueOnce(new Error('网络错误'));

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/用户名.邮箱/i);
      const passwordInput = screen.getByLabelText(/密码/i);
      const loginButton = screen.getByRole('button', { name: /登录/i });

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      // 等待错误显示
      await waitFor(() => {
        expect(screen.getByText(/网络错误/i)).toBeInTheDocument();
      });

      // 第二次登录成功
      const mockUser = { id: '1', email: 'user@example.com', role: 'user', name: 'Test User' };
      mockApi.auth.login.mockResolvedValueOnce({
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        user: mockUser
      });

      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockApi.auth.login).toHaveBeenCalledTimes(2);
      });
    });

    it('应该在认证服务不可用时显示适当错误', async () => {
      mockApi.auth.login.mockRejectedValue(new Error('服务不可用'));

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/用户名.邮箱/i);
      const passwordInput = screen.getByLabelText(/密码/i);
      const loginButton = screen.getByRole('button', { name: /登录/i });

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/服务不可用/i)).toBeInTheDocument();
      });

      // 用户应该仍然可以重试
      expect(loginButton).not.toBeDisabled();
    });
  });
});
