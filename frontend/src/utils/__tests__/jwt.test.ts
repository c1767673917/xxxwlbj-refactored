// JWT工具函数测试

import {
  parseJWTPayload,
  getTokenInfo,
  isTokenValid,
  isTokenNearExpiry,
  calculateRefreshDelay,
  formatRemainingTime,
  createTokenMonitor,
  TokenStatus
} from '../jwt';

// 模拟JWT Token生成
const createMockToken = (expiresInMinutes: number, issuedAtMinutes: number = 0): string => {
  const now = Math.floor(Date.now() / 1000);
  const iat = now - (issuedAtMinutes * 60);
  const exp = now + (expiresInMinutes * 60);
  
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    iat,
    exp
  }));
  const signature = 'mock-signature';
  
  return `${header}.${payload}.${signature}`;
};

describe('JWT工具函数', () => {
  describe('parseJWTPayload', () => {
    it('应该正确解析有效的JWT Token', () => {
      const token = createMockToken(60); // 1小时后过期
      const payload = parseJWTPayload(token);
      
      expect(payload).toBeTruthy();
      expect(payload?.id).toBe('test-user-id');
      expect(payload?.email).toBe('test@example.com');
      expect(payload?.role).toBe('user');
      expect(payload?.iat).toBeDefined();
      expect(payload?.exp).toBeDefined();
    });

    it('应该处理无效的Token格式', () => {
      expect(parseJWTPayload('')).toBeNull();
      expect(parseJWTPayload('invalid-token')).toBeNull();
      expect(parseJWTPayload('header.payload')).toBeNull();
    });

    it('应该处理损坏的payload', () => {
      const token = 'header.invalid-base64.signature';
      expect(parseJWTPayload(token)).toBeNull();
    });
  });

  describe('getTokenInfo', () => {
    it('应该返回有效Token的正确信息', () => {
      const token = createMockToken(60); // 1小时后过期
      const tokenInfo = getTokenInfo(token);
      
      expect(tokenInfo.status).toBe(TokenStatus.VALID);
      expect(tokenInfo.payload).toBeTruthy();
      expect(tokenInfo.expiresAt).toBeInstanceOf(Date);
      expect(tokenInfo.issuedAt).toBeInstanceOf(Date);
      expect(tokenInfo.remainingTime).toBeGreaterThan(0);
    });

    it('应该识别即将过期的Token', () => {
      const token = createMockToken(3); // 3分钟后过期
      const tokenInfo = getTokenInfo(token, 5 * 60 * 1000); // 5分钟阈值
      
      expect(tokenInfo.status).toBe(TokenStatus.NEAR_EXPIRY);
      expect(tokenInfo.remainingTime).toBeLessThan(5 * 60 * 1000);
    });

    it('应该识别已过期的Token', () => {
      const token = createMockToken(-10); // 10分钟前过期
      const tokenInfo = getTokenInfo(token);
      
      expect(tokenInfo.status).toBe(TokenStatus.EXPIRED);
      expect(tokenInfo.remainingTime).toBeLessThanOrEqual(0);
    });

    it('应该处理无效的Token', () => {
      const tokenInfo = getTokenInfo('invalid-token');
      
      expect(tokenInfo.status).toBe(TokenStatus.INVALID);
      expect(tokenInfo.payload).toBeNull();
      expect(tokenInfo.expiresAt).toBeNull();
      expect(tokenInfo.remainingTime).toBe(0);
    });
  });

  describe('isTokenValid', () => {
    it('应该正确识别有效Token', () => {
      const validToken = createMockToken(60);
      expect(isTokenValid(validToken)).toBe(true);
    });

    it('应该正确识别即将过期但仍有效的Token', () => {
      const nearExpiryToken = createMockToken(3);
      expect(isTokenValid(nearExpiryToken)).toBe(true);
    });

    it('应该正确识别过期Token', () => {
      const expiredToken = createMockToken(-10);
      expect(isTokenValid(expiredToken)).toBe(false);
    });

    it('应该正确识别无效Token', () => {
      expect(isTokenValid('invalid-token')).toBe(false);
      expect(isTokenValid('')).toBe(false);
    });
  });

  describe('isTokenNearExpiry', () => {
    it('应该正确识别即将过期的Token', () => {
      const nearExpiryToken = createMockToken(3);
      expect(isTokenNearExpiry(nearExpiryToken, 5 * 60 * 1000)).toBe(true);
    });

    it('应该正确识别不会很快过期的Token', () => {
      const validToken = createMockToken(60);
      expect(isTokenNearExpiry(validToken, 5 * 60 * 1000)).toBe(false);
    });
  });

  describe('calculateRefreshDelay', () => {
    it('应该为有效Token计算正确的刷新延迟', () => {
      const token = createMockToken(60); // 1小时后过期
      const refreshDelay = calculateRefreshDelay(token, 10 * 60 * 1000); // 提前10分钟刷新
      
      expect(refreshDelay).toBeGreaterThan(0);
      expect(refreshDelay).toBeLessThan(60 * 60 * 1000); // 小于1小时
    });

    it('应该为即将过期的Token返回0延迟', () => {
      const token = createMockToken(5); // 5分钟后过期
      const refreshDelay = calculateRefreshDelay(token, 10 * 60 * 1000); // 提前10分钟刷新
      
      expect(refreshDelay).toBe(0);
    });

    it('应该为过期Token返回0延迟', () => {
      const token = createMockToken(-10); // 已过期
      const refreshDelay = calculateRefreshDelay(token);
      
      expect(refreshDelay).toBe(0);
    });

    it('应该为无效Token返回0延迟', () => {
      const refreshDelay = calculateRefreshDelay('invalid-token');
      expect(refreshDelay).toBe(0);
    });
  });

  describe('formatRemainingTime', () => {
    it('应该正确格式化剩余时间', () => {
      expect(formatRemainingTime(0)).toBe('已过期');
      expect(formatRemainingTime(-1000)).toBe('已过期');
      expect(formatRemainingTime(30 * 60 * 1000)).toBe('30分钟');
      expect(formatRemainingTime(90 * 60 * 1000)).toBe('1小时30分钟');
      expect(formatRemainingTime(25 * 60 * 60 * 1000)).toBe('1天1小时');
    });
  });

  describe('createTokenMonitor', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该在Token即将过期时触发回调', () => {
      const nearExpiryCallback = vi.fn();
      const expiredCallback = vi.fn();
      const token = createMockToken(3); // 3分钟后过期
      
      const cleanup = createTokenMonitor(
        token,
        nearExpiryCallback,
        expiredCallback,
        1000 // 1秒检查间隔
      );
      
      // 立即检查应该触发即将过期回调
      expect(nearExpiryCallback).toHaveBeenCalledTimes(1);
      expect(expiredCallback).not.toHaveBeenCalled();
      
      cleanup();
    });

    it('应该在Token过期时触发回调', () => {
      const nearExpiryCallback = vi.fn();
      const expiredCallback = vi.fn();
      const token = createMockToken(-1); // 已过期
      
      const cleanup = createTokenMonitor(
        token,
        nearExpiryCallback,
        expiredCallback,
        1000
      );
      
      // 立即检查应该触发过期回调
      expect(expiredCallback).toHaveBeenCalledTimes(1);
      expect(nearExpiryCallback).not.toHaveBeenCalled();
      
      cleanup();
    });

    it('应该正确清理监控器', () => {
      const nearExpiryCallback = vi.fn();
      const expiredCallback = vi.fn();
      const token = createMockToken(60);

      const cleanup = createTokenMonitor(
        token,
        nearExpiryCallback,
        expiredCallback,
        1000
      );

      // 清理监控器
      cleanup();

      // 推进时间，确保回调不再被调用
      vi.advanceTimersByTime(2000);
      expect(nearExpiryCallback).not.toHaveBeenCalled();
      expect(expiredCallback).not.toHaveBeenCalled();
    });

    it('应该避免重复触发相同状态的回调', () => {
      const nearExpiryCallback = vi.fn();
      const expiredCallback = vi.fn();
      const token = createMockToken(3); // 即将过期

      const cleanup = createTokenMonitor(
        token,
        nearExpiryCallback,
        expiredCallback,
        100 // 100ms检查间隔
      );

      // 推进时间，触发多次检查
      vi.advanceTimersByTime(500);

      // 即将过期回调应该只被调用一次
      expect(nearExpiryCallback).toHaveBeenCalledTimes(1);
      expect(expiredCallback).not.toHaveBeenCalled();

      cleanup();
    });
  });
});
