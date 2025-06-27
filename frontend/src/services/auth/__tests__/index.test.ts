// AuthService测试

import { authService } from '../index';
import { httpClient } from '../../api/client';
import { STORAGE_KEYS } from '@/constants';
import { TokenStatus } from '@/utils/jwt';

// 模拟依赖
vi.mock('../../api/client');
vi.mock('@/services/utils', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// 模拟localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// 创建模拟JWT Token
const createMockToken = (expiresInMinutes: number): string => {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresInMinutes * 60);
  const iat = now;
  
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    iat,
    exp
  }));
  
  return `${header}.${payload}.signature`;
};

// 模拟用户数据
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  providerId: null
};

const mockLoginResponse = {
  success: true,
  data: {
    user: mockUser,
    accessToken: createMockToken(60), // 1小时后过期
    refreshToken: createMockToken(7 * 24 * 60) // 7天后过期
  }
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // 重置localStorage模拟
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {});
    mockLocalStorage.removeItem.mockImplementation(() => {});
    
    // 重置httpClient模拟
    (httpClient.post as jest.Mock).mockResolvedValue(mockLoginResponse);
    (httpClient.setToken as jest.Mock).mockImplementation(() => {});
    (httpClient.getToken as jest.Mock).mockReturnValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('构造函数和初始化', () => {
    it('应该在构造时加载存储的用户信息', () => {
      const validToken = createMockToken(60);
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.USER_INFO) return JSON.stringify(mockUser);
        if (key === STORAGE_KEYS.ACCESS_TOKEN) return validToken;
        return null;
      });

      // 创建新的AuthService实例来测试构造函数
      const testAuthService = new (authService.constructor as any)();
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_INFO);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(httpClient.setToken).toHaveBeenCalledWith(validToken);
    });

    it('应该清理无效的存储Token', () => {
      const expiredToken = createMockToken(-10); // 已过期
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.USER_INFO) return JSON.stringify(mockUser);
        if (key === STORAGE_KEYS.ACCESS_TOKEN) return expiredToken;
        return null;
      });

      // 创建新的AuthService实例
      const testAuthService = new (authService.constructor as any)();
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_INFO);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
    });
  });

  describe('用户登录', () => {
    it('应该成功登录并设置Token刷新', async () => {
      const credentials = { email: 'test@example.com', password: 'password' };
      
      const result = await authService.login(credentials);
      
      expect(httpClient.post).toHaveBeenCalledWith('/auth/login', credentials);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.USER_INFO, 
        JSON.stringify(expect.objectContaining(mockUser))
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN, 
        mockLoginResponse.data.accessToken
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.REFRESH_TOKEN, 
        mockLoginResponse.data.refreshToken
      );
      expect(result).toEqual(expect.objectContaining(mockUser));
    });

    it('应该处理登录失败', async () => {
      const failureResponse = {
        success: false,
        error: '登录失败'
      };
      (httpClient.post as jest.Mock).mockResolvedValue(failureResponse);

      const credentials = { email: 'test@example.com', password: 'wrong-password' };
      
      await expect(authService.login(credentials)).rejects.toThrow('登录失败');
    });
  });

  describe('Token刷新', () => {
    beforeEach(() => {
      // 设置有效的refresh token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.REFRESH_TOKEN) return createMockToken(7 * 24 * 60);
        return null;
      });
    });

    it('应该成功刷新Token', async () => {
      const newTokenResponse = {
        success: true,
        data: {
          user: mockUser,
          accessToken: createMockToken(60),
          refreshToken: createMockToken(7 * 24 * 60)
        }
      };
      (httpClient.post as jest.Mock).mockResolvedValue(newTokenResponse);

      await authService.refreshAccessToken();

      expect(httpClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: expect.any(String)
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ACCESS_TOKEN,
        newTokenResponse.data.accessToken
      );
    });

    it('应该处理刷新失败并登出用户', async () => {
      const failureResponse = {
        success: false,
        error: 'Token刷新失败'
      };
      (httpClient.post as jest.Mock).mockResolvedValue(failureResponse);

      // 模拟logout方法
      const logoutSpy = jest.spyOn(authService, 'logout').mockImplementation(async () => {});

      await expect(authService.refreshAccessToken()).rejects.toThrow();
      expect(logoutSpy).toHaveBeenCalled();
    });

    it('应该防止重复刷新', async () => {
      const refreshPromise1 = authService.refreshAccessToken();
      const refreshPromise2 = authService.refreshAccessToken();

      await Promise.all([refreshPromise1, refreshPromise2]);

      // 应该只调用一次API
      expect(httpClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('Token状态监控', () => {
    it('应该为有效Token设置正确的刷新时间', () => {
      const validToken = createMockToken(60); // 1小时后过期
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.ACCESS_TOKEN) return validToken;
        if (key === STORAGE_KEYS.REFRESH_TOKEN) return createMockToken(7 * 24 * 60);
        return null;
      });

      // 触发setupTokenRefresh
      authService['setupTokenRefresh']();

      // 应该设置了定时器
      expect(setTimeout).toHaveBeenCalled();
    });

    it('应该立即刷新即将过期的Token', async () => {
      const nearExpiryToken = createMockToken(5); // 5分钟后过期
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.ACCESS_TOKEN) return nearExpiryToken;
        if (key === STORAGE_KEYS.REFRESH_TOKEN) return createMockToken(7 * 24 * 60);
        return null;
      });

      const refreshSpy = jest.spyOn(authService, 'refreshAccessToken').mockResolvedValue();

      // 触发setupTokenRefresh
      authService['setupTokenRefresh']();

      // 应该立即调用刷新
      expect(refreshSpy).toHaveBeenCalled();
    });
  });

  describe('Token状态查询', () => {
    it('应该正确返回Token信息', () => {
      const validToken = createMockToken(60);
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.ACCESS_TOKEN) return validToken;
        return null;
      });

      const tokenInfo = authService.getTokenInfo();
      
      expect(tokenInfo).toBeTruthy();
      expect(tokenInfo?.status).toBe(TokenStatus.VALID);
      expect(tokenInfo?.remainingTime).toBeGreaterThan(0);
    });

    it('应该正确识别即将过期的Token', () => {
      const nearExpiryToken = createMockToken(3); // 3分钟后过期
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.ACCESS_TOKEN) return nearExpiryToken;
        return null;
      });

      expect(authService.isTokenNearExpiry()).toBe(true);
    });

    it('应该返回正确的剩余时间', () => {
      const validToken = createMockToken(60);
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === STORAGE_KEYS.ACCESS_TOKEN) return validToken;
        return null;
      });

      const remainingTime = authService.getTokenRemainingTime();
      expect(remainingTime).toBeGreaterThan(0);
      expect(remainingTime).toBeLessThanOrEqual(60 * 60 * 1000); // 小于等于1小时
    });
  });

  describe('用户登出', () => {
    it('应该清理所有用户数据', async () => {
      await authService.logout();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_INFO);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
      expect(httpClient.setToken).toHaveBeenCalledWith(null);
    });

    it('应该清理定时器和监控器', async () => {
      // 设置一些定时器
      authService['setupTokenRefresh']();
      
      await authService.logout();

      // 验证清理函数被调用
      expect(clearTimeout).toHaveBeenCalled();
    });
  });
});
