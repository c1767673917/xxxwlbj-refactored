// Token状态管理Hook
// 提供Token状态监控和管理功能

import { useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '@/services/auth';
import { TokenStatus, type TokenInfo } from '@/utils/jwt';
import { logger } from '@/services/utils';

export interface UseTokenStatusOptions {
  // 自动刷新阈值（毫秒），默认5分钟
  autoRefreshThreshold?: number;
  // 是否启用自动刷新
  enableAutoRefresh?: boolean;
  // 更新间隔（毫秒），默认30秒
  updateInterval?: number;
  // Token即将过期时的回调
  onNearExpiry?: (tokenInfo: TokenInfo) => void;
  // Token过期时的回调
  onExpired?: (tokenInfo: TokenInfo) => void;
  // Token刷新成功时的回调
  onRefreshSuccess?: (tokenInfo: TokenInfo) => void;
  // Token刷新失败时的回调
  onRefreshError?: (error: Error) => void;
}

export interface UseTokenStatusReturn {
  // Token信息
  tokenInfo: TokenInfo | null;
  // 是否正在刷新
  isRefreshing: boolean;
  // 是否已认证
  isAuthenticated: boolean;
  // 手动刷新Token
  refreshToken: () => Promise<void>;
  // 获取剩余时间（毫秒）
  getRemainingTime: () => number;
  // 检查是否即将过期
  isNearExpiry: () => boolean;
  // 检查是否已过期
  isExpired: () => boolean;
  // 获取状态文本
  getStatusText: () => string;
  // 最后更新时间
  lastUpdateTime: Date | null;
}

export const useTokenStatus = (options: UseTokenStatusOptions = {}): UseTokenStatusReturn => {
  const {
    autoRefreshThreshold = 5 * 60 * 1000, // 5分钟
    enableAutoRefresh = true,
    updateInterval = 30 * 1000, // 30秒
    onNearExpiry,
    onExpired,
    onRefreshSuccess,
    onRefreshError
  } = options;

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  // 使用ref来存储回调，避免useEffect依赖问题
  const callbacksRef = useRef({
    onNearExpiry,
    onExpired,
    onRefreshSuccess,
    onRefreshError
  });

  // 更新回调引用
  useEffect(() => {
    callbacksRef.current = {
      onNearExpiry,
      onExpired,
      onRefreshSuccess,
      onRefreshError
    };
  }, [onNearExpiry, onExpired, onRefreshSuccess, onRefreshError]);

  // 更新Token信息
  const updateTokenInfo = useCallback(() => {
    const info = authService.getTokenInfo();
    setTokenInfo(info);
    setLastUpdateTime(new Date());

    if (info) {
      const callbacks = callbacksRef.current;
      
      // 触发状态回调
      if (info.status === TokenStatus.NEAR_EXPIRY && callbacks.onNearExpiry) {
        callbacks.onNearExpiry(info);
      } else if (info.status === TokenStatus.EXPIRED && callbacks.onExpired) {
        callbacks.onExpired(info);
      }

      // 自动刷新逻辑
      if (enableAutoRefresh && 
          info.status === TokenStatus.NEAR_EXPIRY && 
          info.remainingTime <= autoRefreshThreshold &&
          !isRefreshing) {
        logger.info('Auto-refreshing token due to near expiry');
        refreshToken();
      }
    }
  }, [enableAutoRefresh, autoRefreshThreshold, isRefreshing]);

  // 手动刷新Token
  const refreshToken = useCallback(async () => {
    if (isRefreshing) {
      logger.warn('Token refresh already in progress');
      return;
    }

    setIsRefreshing(true);
    try {
      await authService.forceRefreshToken();
      
      // 刷新成功后更新Token信息
      const newTokenInfo = authService.getTokenInfo();
      setTokenInfo(newTokenInfo);
      setLastUpdateTime(new Date());
      
      if (newTokenInfo && callbacksRef.current.onRefreshSuccess) {
        callbacksRef.current.onRefreshSuccess(newTokenInfo);
      }
      
      logger.info('Token refreshed successfully via hook');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Token refresh failed');
      logger.error('Token refresh failed via hook:', err);
      
      if (callbacksRef.current.onRefreshError) {
        callbacksRef.current.onRefreshError(err);
      }
      
      throw err;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // 获取剩余时间
  const getRemainingTime = useCallback(() => {
    return tokenInfo ? tokenInfo.remainingTime : 0;
  }, [tokenInfo]);

  // 检查是否即将过期
  const isNearExpiry = useCallback(() => {
    return tokenInfo ? tokenInfo.status === TokenStatus.NEAR_EXPIRY : false;
  }, [tokenInfo]);

  // 检查是否已过期
  const isExpired = useCallback(() => {
    return tokenInfo ? tokenInfo.status === TokenStatus.EXPIRED : false;
  }, [tokenInfo]);

  // 获取状态文本
  const getStatusText = useCallback(() => {
    if (!tokenInfo) return '未知';
    
    switch (tokenInfo.status) {
      case TokenStatus.VALID:
        return '有效';
      case TokenStatus.NEAR_EXPIRY:
        return '即将过期';
      case TokenStatus.EXPIRED:
        return '已过期';
      case TokenStatus.INVALID:
        return '无效';
      default:
        return '未知';
    }
  }, [tokenInfo]);

  // 检查是否已认证
  const isAuthenticated = authService.isAuthenticated();

  // 定期更新Token信息
  useEffect(() => {
    if (!isAuthenticated) {
      setTokenInfo(null);
      setLastUpdateTime(null);
      return;
    }

    // 立即更新一次
    updateTokenInfo();
    
    // 设置定期更新
    const interval = setInterval(updateTokenInfo, updateInterval);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, updateTokenInfo, updateInterval]);

  // 监听认证状态变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wlbj_access_token' || e.key === 'wlbj_user_info') {
        updateTokenInfo();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [updateTokenInfo]);

  return {
    tokenInfo,
    isRefreshing,
    isAuthenticated,
    refreshToken,
    getRemainingTime,
    isNearExpiry,
    isExpired,
    getStatusText,
    lastUpdateTime
  };
};

export default useTokenStatus;
