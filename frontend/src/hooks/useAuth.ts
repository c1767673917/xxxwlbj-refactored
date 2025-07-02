import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import type { User, AuthUser } from '@/types';

interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string, email?: string) => Promise<void>;
  loginProvider: (accessKey: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

export const useAuth = (): UseAuthReturn => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 检查认证状态
  const checkAuth = useCallback(async () => {
    try {
      // 首先检查普通用户认证信息
      let token = localStorage.getItem('wlbj_access_token');
      let userData = localStorage.getItem('wlbj_user');
      let isAdmin = false;

      // 如果没有普通用户认证信息，检查管理员认证信息
      if (!token || !userData) {
        token = localStorage.getItem('wlbj_admin_access_token');
        userData = localStorage.getItem('wlbj_admin_user');
        isAdmin = true;
      }

      if (token && userData) {
        // 验证token是否仍然有效
        try {
          const response = await api.auth.verifyToken();
          if (response.success) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
          } else {
            throw new Error('Token验证失败');
          }
        } catch (error) {
          console.error('Token验证失败:', error);

          // 尝试使用refresh token刷新
          try {
            await refreshToken();
            // 刷新成功后重新获取用户数据
            const updatedUserData = isAdmin
              ? localStorage.getItem('wlbj_admin_user')
              : localStorage.getItem('wlbj_user');
            if (updatedUserData) {
              const parsedUser = JSON.parse(updatedUserData);
              setUser(parsedUser);
              return; // 成功刷新，不需要清除认证信息
            }
          } catch (refreshError) {
            console.error('Token刷新失败:', refreshError);
          }

          // 只有在刷新也失败时才清除认证信息
          if (isAdmin) {
            localStorage.removeItem('wlbj_admin_access_token');
            localStorage.removeItem('wlbj_admin_refresh_token');
            localStorage.removeItem('wlbj_admin_user');
          } else {
            localStorage.removeItem('wlbj_access_token');
            localStorage.removeItem('wlbj_refresh_token');
            localStorage.removeItem('wlbj_user');
          }
          setUser(null);
        }
      }
    } catch (error) {
      console.error('检查认证状态失败:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 用户登录
  const login = useCallback(async (password: string, email?: string) => {
    setIsLoading(true);
    try {
      const response = await api.auth.login(password, email);
      setUser(response.user);
      
      // 根据用户角色跳转
      if (response.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // 供应商登录
  const loginProvider = useCallback(async (accessKey: string) => {
    setIsLoading(true);
    try {
      const response = await api.auth.loginProvider(accessKey);
      setUser(response.user);
      navigate(`/provider/${accessKey}`);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // 登出
  const logout = useCallback(async () => {
    try {
      // 根据当前用户类型调用相应的登出API
      if (user?.role === 'admin') {
        await api.admin.logout();
      } else {
        await api.auth.logout();
      }
    } catch (error) {
      console.error('登出API调用失败:', error);
    } finally {
      // 清除本地认证信息（包括普通用户和管理员）
      localStorage.removeItem('wlbj_access_token');
      localStorage.removeItem('wlbj_refresh_token');
      localStorage.removeItem('wlbj_user');
      localStorage.removeItem('wlbj_admin_access_token');
      localStorage.removeItem('wlbj_admin_refresh_token');
      localStorage.removeItem('wlbj_admin_user');
      localStorage.removeItem('provider_token');
      localStorage.removeItem('provider_key');

      setUser(null);
      navigate('/');
    }
  }, [navigate, user]);

  // 刷新令牌
  const refreshToken = useCallback(async () => {
    try {
      // 首先尝试普通用户的刷新令牌
      let refreshToken = localStorage.getItem('wlbj_refresh_token');
      let isAdmin = false;

      // 如果没有普通用户的刷新令牌，尝试管理员的
      if (!refreshToken) {
        refreshToken = localStorage.getItem('wlbj_admin_refresh_token');
        isAdmin = true;
      }

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.auth.refresh(refreshToken);

      // 根据用户类型保存新的访问令牌（api.auth.refresh已经处理了token保存）
      // 这里只需要确认刷新成功
      if (response.accessToken) {
        console.log('Token刷新成功');
      }
    } catch (error) {
      console.error('刷新令牌失败:', error);
      await logout();
    }
  }, [logout]);

  // 更新用户信息
  const updateUser = useCallback((userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('wlbj_user', JSON.stringify(updatedUser));
    }
  }, [user]);

  // 初始化时检查认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginProvider,
    logout,
    refreshToken,
    updateUser,
  };
};
