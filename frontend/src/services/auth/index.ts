// 认证服务

import { httpClient } from '../api/client';
import { STORAGE_KEYS, SECURITY_CONFIG } from '@/constants';
import { logger } from '@/services/utils';
import {
  getTokenInfo,
  calculateRefreshDelay,
  isTokenValid,
  TokenStatus,
  createTokenMonitor,
  type TokenInfo
} from '@/utils/jwt';
import type {
  LoginResponse,
  AuthUser,
  User
} from '@/types';

// 登录请求参数
interface LoginRequest {
  email: string;
  password: string;
}

// 供应商登录请求参数
interface ProviderLoginRequest {
  accessKey: string;
}

// 刷新token请求参数
interface RefreshTokenRequest {
  refreshToken: string;
}

class AuthService {
  private currentUser: AuthUser | null = null;
  private refreshTokenTimer: NodeJS.Timeout | null = null;
  private tokenMonitorCleanup: (() => void) | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.loadUserFromStorage();
    this.setupTokenRefresh();
  }

  // 从本地存储加载用户信息
  private loadUserFromStorage(): void {
    try {
      const userStr = localStorage.getItem(STORAGE_KEYS.USER_INFO);
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

      if (userStr && token) {
        // 检查Token是否有效
        if (isTokenValid(token)) {
          this.currentUser = JSON.parse(userStr);
          httpClient.setToken(token);
          logger.info('User loaded from storage with valid token');
        } else {
          logger.warn('Token in storage is invalid or expired, clearing user data');
          this.clearUserData();
        }
      }
    } catch (error) {
      logger.warn('Failed to load user from storage:', error);
      this.clearUserData();
    }
  }

  // 保存用户信息到本地存储
  private saveUserToStorage(user: AuthUser, tokens: { accessToken: string; refreshToken: string }): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      
      httpClient.setToken(tokens.accessToken);
      this.currentUser = user;
    } catch (error) {
      logger.error('Failed to save user to storage:', error);
      throw new Error('无法保存用户信息');
    }
  }

  // 清除用户数据
  private clearUserData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_INFO);
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

      httpClient.setToken(null);
      this.currentUser = null;

      // 清理定时器和监控器
      this.clearRefreshTimer();
      this.clearTokenMonitor();

      // 重置刷新状态
      this.isRefreshing = false;
      this.refreshPromise = null;
    } catch (error) {
      logger.warn('Failed to clear user data:', error);
    }
  }

  // 清理刷新定时器
  private clearRefreshTimer(): void {
    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer);
      this.refreshTokenTimer = null;
    }
  }

  // 清理Token监控器
  private clearTokenMonitor(): void {
    if (this.tokenMonitorCleanup) {
      this.tokenMonitorCleanup();
      this.tokenMonitorCleanup = null;
    }
  }

  // 设置token自动刷新
  private setupTokenRefresh(): void {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

    if (!accessToken || !refreshToken) {
      return;
    }

    // 清理之前的定时器和监控器
    this.clearRefreshTimer();
    this.clearTokenMonitor();

    // 获取Token信息
    const tokenInfo = getTokenInfo(accessToken);

    if (tokenInfo.status === TokenStatus.INVALID || tokenInfo.status === TokenStatus.EXPIRED) {
      logger.warn('Token is invalid or expired, attempting refresh');
      this.refreshAccessToken().catch(error => {
        logger.error('Failed to refresh expired token:', error);
        this.logout();
      });
      return;
    }

    // 计算刷新延迟时间（在过期前10分钟刷新）
    const refreshDelay = calculateRefreshDelay(accessToken, SECURITY_CONFIG.TOKEN_REFRESH_THRESHOLD);

    if (refreshDelay <= 0) {
      // 立即刷新
      logger.info('Token needs immediate refresh');
      this.refreshAccessToken().catch(error => {
        logger.error('Immediate token refresh failed:', error);
        this.logout();
      });
    } else {
      // 设置定时刷新
      logger.info(`Token refresh scheduled in ${Math.round(refreshDelay / 1000 / 60)} minutes`);
      this.refreshTokenTimer = setTimeout(() => {
        this.refreshAccessToken().catch(error => {
          logger.error('Scheduled token refresh failed:', error);
          this.logout();
        });
      }, refreshDelay);
    }

    // 设置Token状态监控
    this.setupTokenMonitor(accessToken);
  }

  // 设置Token状态监控
  private setupTokenMonitor(token: string): void {
    this.tokenMonitorCleanup = createTokenMonitor(
      token,
      (tokenInfo: TokenInfo) => {
        logger.warn('Token is near expiry', {
          remainingTime: tokenInfo.remainingTime,
          expiresAt: tokenInfo.expiresAt
        });
        // 可以在这里触发用户提醒或其他操作
      },
      (tokenInfo: TokenInfo) => {
        logger.error('Token has expired', {
          expiresAt: tokenInfo.expiresAt
        });
        this.logout();
      },
      30 * 1000 // 每30秒检查一次
    );
  }

  // 用户登录
  async login(credentials: LoginRequest): Promise<AuthUser> {
    try {
      const response = await httpClient.post<LoginResponse>('/auth/login', credentials);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || '登录失败');
      }

      const { user, accessToken, refreshToken } = response.data;
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        providerId: user.providerId,
      };

      this.saveUserToStorage(authUser, { accessToken, refreshToken });
      this.setupTokenRefresh();

      logger.info('User logged in successfully:', authUser.email);
      return authUser;
    } catch (error) {
      logger.error('Login failed:', error);
      throw error instanceof Error ? error : new Error('登录失败');
    }
  }

  // 供应商登录
  async providerLogin(credentials: ProviderLoginRequest): Promise<AuthUser> {
    try {
      const response = await httpClient.post<LoginResponse>('/auth/login/provider', credentials);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || '供应商登录失败');
      }

      const { user, accessToken, refreshToken } = response.data;
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        providerId: user.providerId,
      };

      this.saveUserToStorage(authUser, { accessToken, refreshToken });
      this.setupTokenRefresh();

      logger.info('Provider logged in successfully:', authUser.providerId);
      return authUser;
    } catch (error) {
      logger.error('Provider login failed:', error);
      throw error instanceof Error ? error : new Error('供应商登录失败');
    }
  }

  // 刷新访问令牌
  async refreshAccessToken(): Promise<void> {
    // 防止重复刷新
    if (this.isRefreshing) {
      if (this.refreshPromise) {
        return this.refreshPromise;
      }
      return;
    }

    this.isRefreshing = true;

    this.refreshPromise = this.performTokenRefresh();

    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  // 执行实际的Token刷新操作
  private async performTokenRefresh(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // 检查refresh token是否有效
      if (!isTokenValid(refreshToken)) {
        throw new Error('Refresh token is invalid or expired');
      }

      logger.info('Starting token refresh...');

      const response = await httpClient.post<LoginResponse>('/auth/refresh', {
        refreshToken,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Token refresh failed');
      }

      const { user, accessToken, refreshToken: newRefreshToken } = response.data;
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        providerId: user.providerId,
      };

      this.saveUserToStorage(authUser, {
        accessToken,
        refreshToken: newRefreshToken
      });

      // 重新设置Token刷新
      this.setupTokenRefresh();

      logger.info('Token refreshed successfully');
    } catch (error) {
      logger.error('Token refresh failed:', error);
      this.logout();
      throw error instanceof Error ? error : new Error('Token刷新失败');
    }
  }

  // 获取当前用户信息
  async getCurrentUser(): Promise<User | null> {
    try {
      if (!this.isAuthenticated()) {
        return null;
      }

      const response = await httpClient.get<User>('/auth/me');
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get user info');
      }

      return response.data;
    } catch (error) {
      logger.error('Get current user failed:', error);
      return null;
    }
  }

  // 用户登出
  async logout(): Promise<void> {
    try {
      // 尝试调用登出API
      await httpClient.post('/auth/logout');
    } catch (error) {
      logger.warn('Logout API call failed:', error);
    } finally {
      this.clearUserData();
      logger.info('User logged out');
    }
  }

  // 检查是否已认证
  isAuthenticated(): boolean {
    return !!(this.currentUser && httpClient.getToken());
  }

  // 获取当前认证用户
  getAuthUser(): AuthUser | null {
    return this.currentUser;
  }

  // 检查用户角色
  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  // 检查是否为管理员
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  // 检查是否为普通用户
  isUser(): boolean {
    return this.hasRole('user');
  }

  // 检查是否为供应商
  isProvider(): boolean {
    return this.hasRole('provider');
  }

  // 获取当前Token状态信息
  getTokenInfo(): TokenInfo | null {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      return null;
    }
    return getTokenInfo(token);
  }

  // 检查Token是否即将过期
  isTokenNearExpiry(): boolean {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      return false;
    }
    const tokenInfo = getTokenInfo(token);
    return tokenInfo.status === TokenStatus.NEAR_EXPIRY;
  }

  // 手动触发Token刷新
  async forceRefreshToken(): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('User not authenticated');
    }

    await this.refreshAccessToken();
  }

  // 获取Token剩余有效时间（毫秒）
  getTokenRemainingTime(): number {
    const tokenInfo = this.getTokenInfo();
    return tokenInfo ? tokenInfo.remainingTime : 0;
  }

  // 获取用户ID
  getUserId(): string | null {
    return this.currentUser?.id || null;
  }

  // 获取供应商ID
  getProviderId(): string | null {
    return this.currentUser?.providerId || null;
  }
}

// 创建全局认证服务实例
export const authService = new AuthService();

// 导出类型和服务
export type { LoginRequest, ProviderLoginRequest, RefreshTokenRequest };
export { AuthService };

// Legacy 服务已移除，统一使用 useAuth Hook 和 AuthService
