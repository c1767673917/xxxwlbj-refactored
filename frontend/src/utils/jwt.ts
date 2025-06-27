// JWT工具函数
// 用于解析和处理JWT Token

import { logger } from '@/services/utils';

// JWT Token的payload接口
interface JWTPayload {
  id: string;
  email: string;
  role: string;
  iat: number; // 签发时间
  exp: number; // 过期时间
  [key: string]: any;
}

// Token状态枚举
export enum TokenStatus {
  VALID = 'valid',           // 有效
  EXPIRED = 'expired',       // 已过期
  NEAR_EXPIRY = 'near_expiry', // 即将过期
  INVALID = 'invalid'        // 无效
}

// Token信息接口
export interface TokenInfo {
  payload: JWTPayload | null;
  status: TokenStatus;
  expiresAt: Date | null;
  remainingTime: number; // 剩余时间（毫秒）
  issuedAt: Date | null;
}

/**
 * 解析JWT Token（不验证签名，仅解析payload）
 * @param token JWT Token字符串
 * @returns 解析后的payload或null
 */
export function parseJWTPayload(token: string): JWTPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    // JWT格式：header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      logger.warn('Invalid JWT format');
      return null;
    }

    // 解码payload部分（Base64URL）
    const payload = parts[1];
    const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    
    return JSON.parse(decodedPayload) as JWTPayload;
  } catch (error) {
    logger.warn('Failed to parse JWT payload:', error);
    return null;
  }
}

/**
 * 获取Token的详细信息
 * @param token JWT Token字符串
 * @param nearExpiryThreshold 即将过期的阈值（毫秒），默认5分钟
 * @returns Token信息
 */
export function getTokenInfo(token: string, nearExpiryThreshold: number = 5 * 60 * 1000): TokenInfo {
  const payload = parseJWTPayload(token);
  
  if (!payload) {
    return {
      payload: null,
      status: TokenStatus.INVALID,
      expiresAt: null,
      remainingTime: 0,
      issuedAt: null
    };
  }

  const now = Date.now();
  const expiresAt = new Date(payload.exp * 1000);
  const issuedAt = new Date(payload.iat * 1000);
  const remainingTime = expiresAt.getTime() - now;

  let status: TokenStatus;
  if (remainingTime <= 0) {
    status = TokenStatus.EXPIRED;
  } else if (remainingTime <= nearExpiryThreshold) {
    status = TokenStatus.NEAR_EXPIRY;
  } else {
    status = TokenStatus.VALID;
  }

  return {
    payload,
    status,
    expiresAt,
    remainingTime,
    issuedAt
  };
}

/**
 * 检查Token是否有效（未过期）
 * @param token JWT Token字符串
 * @returns 是否有效
 */
export function isTokenValid(token: string): boolean {
  const tokenInfo = getTokenInfo(token);
  return tokenInfo.status === TokenStatus.VALID || tokenInfo.status === TokenStatus.NEAR_EXPIRY;
}

/**
 * 检查Token是否即将过期
 * @param token JWT Token字符串
 * @param threshold 阈值（毫秒），默认5分钟
 * @returns 是否即将过期
 */
export function isTokenNearExpiry(token: string, threshold: number = 5 * 60 * 1000): boolean {
  const tokenInfo = getTokenInfo(token, threshold);
  return tokenInfo.status === TokenStatus.NEAR_EXPIRY;
}

/**
 * 计算Token刷新的最佳时机
 * @param token JWT Token字符串
 * @param refreshBeforeExpiry 在过期前多长时间刷新（毫秒），默认10分钟
 * @returns 刷新延迟时间（毫秒），如果<=0表示应该立即刷新
 */
export function calculateRefreshDelay(token: string, refreshBeforeExpiry: number = 10 * 60 * 1000): number {
  const tokenInfo = getTokenInfo(token);
  
  if (!tokenInfo.payload || tokenInfo.status === TokenStatus.INVALID) {
    return 0; // 立即刷新
  }

  if (tokenInfo.status === TokenStatus.EXPIRED) {
    return 0; // 立即刷新
  }

  // 计算在过期前refreshBeforeExpiry时间刷新
  const refreshTime = tokenInfo.remainingTime - refreshBeforeExpiry;
  
  // 如果剩余时间不足refreshBeforeExpiry，立即刷新
  if (refreshTime <= 0) {
    return 0;
  }

  return refreshTime;
}

/**
 * 格式化剩余时间为可读字符串
 * @param remainingTime 剩余时间（毫秒）
 * @returns 格式化的时间字符串
 */
export function formatRemainingTime(remainingTime: number): string {
  if (remainingTime <= 0) {
    return '已过期';
  }

  const minutes = Math.floor(remainingTime / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}天${hours % 24}小时`;
  } else if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`;
  } else {
    return `${minutes}分钟`;
  }
}

/**
 * 创建Token状态监控器
 * @param token JWT Token字符串
 * @param onNearExpiry 即将过期回调
 * @param onExpired 过期回调
 * @param checkInterval 检查间隔（毫秒），默认1分钟
 * @returns 清理函数
 */
export function createTokenMonitor(
  token: string,
  onNearExpiry: (tokenInfo: TokenInfo) => void,
  onExpired: (tokenInfo: TokenInfo) => void,
  checkInterval: number = 60 * 1000
): () => void {
  let intervalId: NodeJS.Timeout | null = null;
  let hasTriggeredNearExpiry = false;
  let hasTriggeredExpired = false;

  const check = () => {
    const tokenInfo = getTokenInfo(token);
    
    if (tokenInfo.status === TokenStatus.EXPIRED && !hasTriggeredExpired) {
      hasTriggeredExpired = true;
      onExpired(tokenInfo);
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    } else if (tokenInfo.status === TokenStatus.NEAR_EXPIRY && !hasTriggeredNearExpiry) {
      hasTriggeredNearExpiry = true;
      onNearExpiry(tokenInfo);
    }
  };

  // 立即检查一次
  check();

  // 设置定期检查
  intervalId = setInterval(check, checkInterval);

  // 返回清理函数
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}
