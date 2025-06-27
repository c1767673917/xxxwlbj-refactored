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
      const token = localStorage.getItem('wlbj_access_token');
      const userData = localStorage.getItem('wlbj_user');

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
          // 清除无效的认证信息
          localStorage.removeItem('wlbj_access_token');
          localStorage.removeItem('wlbj_refresh_token');
          localStorage.removeItem('wlbj_user');
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
      await api.auth.logout();
    } catch (error) {
      console.error('登出API调用失败:', error);
    } finally {
      // 清除本地认证信息
      localStorage.removeItem('wlbj_access_token');
      localStorage.removeItem('wlbj_refresh_token');
      localStorage.removeItem('wlbj_user');
      localStorage.removeItem('provider_token');
      localStorage.removeItem('provider_key');
      
      setUser(null);
      navigate('/');
    }
  }, [navigate]);

  // 刷新令牌
  const refreshToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('wlbj_refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await api.auth.refresh(refreshToken);
      localStorage.setItem('wlbj_access_token', response.accessToken);
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
