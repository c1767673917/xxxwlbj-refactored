// JWT工具函数测试 (Node.js版本)

// 模拟前端的JWT工具函数
const parseJWTPayload = (token) => {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    // Node.js环境使用Buffer而不是atob
    const decodedPayload = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
    
    return JSON.parse(decodedPayload);
  } catch (error) {
    return null;
  }
};

const TokenStatus = {
  VALID: 'valid',
  EXPIRED: 'expired',
  NEAR_EXPIRY: 'near_expiry',
  INVALID: 'invalid'
};

const getTokenInfo = (token, nearExpiryThreshold = 5 * 60 * 1000) => {
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

  let status;
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
};

const isTokenValid = (token) => {
  const tokenInfo = getTokenInfo(token);
  return tokenInfo.status === TokenStatus.VALID || tokenInfo.status === TokenStatus.NEAR_EXPIRY;
};

const calculateRefreshDelay = (token, refreshBeforeExpiry = 10 * 60 * 1000) => {
  const tokenInfo = getTokenInfo(token);
  
  if (!tokenInfo.payload || tokenInfo.status === TokenStatus.INVALID) {
    return 0;
  }

  if (tokenInfo.status === TokenStatus.EXPIRED) {
    return 0;
  }

  const refreshTime = tokenInfo.remainingTime - refreshBeforeExpiry;
  
  if (refreshTime <= 0) {
    return 0;
  }

  return refreshTime;
};

// 创建模拟JWT Token
const createMockToken = (expiresInMinutes, issuedAtMinutes = 0) => {
  const now = Math.floor(Date.now() / 1000);
  const iat = now - (issuedAtMinutes * 60);
  const exp = now + (expiresInMinutes * 60);
  
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    iat,
    exp
  })).toString('base64');
  const signature = 'mock-signature';
  
  return `${header}.${payload}.${signature}`;
};

describe('JWT工具函数', () => {
  describe('parseJWTPayload', () => {
    it('应该正确解析有效的JWT Token', () => {
      const token = createMockToken(60); // 1小时后过期
      const payload = parseJWTPayload(token);
      
      expect(payload).toBeTruthy();
      expect(payload.id).toBe('test-user-id');
      expect(payload.email).toBe('test@example.com');
      expect(payload.role).toBe('user');
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
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

  describe('Token刷新时机计算', () => {
    it('应该在用户重新打开浏览器时正确计算刷新时机', () => {
      // 模拟用户关闭浏览器前Token还有8分钟过期的情况（少于10分钟阈值）
      const almostExpiredToken = createMockToken(8); // 8分钟后过期
      const refreshDelay = calculateRefreshDelay(almostExpiredToken, 10 * 60 * 1000);

      // 应该立即刷新，因为剩余时间少于10分钟阈值
      expect(refreshDelay).toBe(0);
    });

    it('应该为新Token设置合理的刷新时间', () => {
      // 模拟刚登录获得的新Token
      const freshToken = createMockToken(60); // 1小时后过期
      const refreshDelay = calculateRefreshDelay(freshToken, 10 * 60 * 1000);
      
      // 应该在50分钟后刷新
      const expectedDelay = 50 * 60 * 1000; // 50分钟
      const tolerance = 1000; // 1秒误差
      
      expect(Math.abs(refreshDelay - expectedDelay)).toBeLessThan(tolerance);
    });

    it('应该处理Token生命周期的边界情况', () => {
      // 测试Token刚好在阈值边界的情况
      const boundaryToken = createMockToken(10); // 10分钟后过期
      const refreshDelay = calculateRefreshDelay(boundaryToken, 10 * 60 * 1000);
      
      // 应该立即刷新
      expect(refreshDelay).toBe(0);
    });
  });

  describe('实际使用场景测试', () => {
    it('应该模拟完整的Token生命周期', () => {
      // 1. 用户登录，获得新Token
      const loginToken = createMockToken(60); // 1小时
      expect(isTokenValid(loginToken)).toBe(true);
      expect(getTokenInfo(loginToken).status).toBe(TokenStatus.VALID);
      
      // 2. 计算刷新时间
      const refreshDelay = calculateRefreshDelay(loginToken, 10 * 60 * 1000);
      expect(refreshDelay).toBeGreaterThan(0);
      
      // 3. 模拟时间过去，Token即将过期
      const nearExpiryToken = createMockToken(8); // 8分钟后过期
      expect(getTokenInfo(nearExpiryToken, 10 * 60 * 1000).status).toBe(TokenStatus.NEAR_EXPIRY);
      
      // 4. 应该立即刷新
      const immediateRefreshDelay = calculateRefreshDelay(nearExpiryToken, 10 * 60 * 1000);
      expect(immediateRefreshDelay).toBe(0);
      
      // 5. Token过期
      const expiredToken = createMockToken(-1);
      expect(isTokenValid(expiredToken)).toBe(false);
      expect(getTokenInfo(expiredToken).status).toBe(TokenStatus.EXPIRED);
    });
  });
});
