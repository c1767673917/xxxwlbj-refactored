// Token刷新集成测试
// 测试完整的Token刷新流程和边缘情况

import { authService } from '../index';
import { httpClient } from '../../api/client';
import { STORAGE_KEYS, SECURITY_CONFIG } from '@/constants';

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
  data: {} as Record<string, string>,
  getItem: jest.fn((key: string) => mockLocalStorage.data[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockLocalStorage.data[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockLocalStorage.data[key];
  }),
  clear: jest.fn(() => {
    mockLocalStorage.data = {};
  })
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// 创建模拟JWT Token
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

describe('Token刷新集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockLocalStorage.clear();
    
    // 重置httpClient模拟
    (httpClient.post as jest.Mock).mockImplementation(() => Promise.resolve({
      success: true,
      data: {
        user: mockUser,
        accessToken: createMockToken(60),
        refreshToken: createMockToken(7 * 24 * 60)
      }
    }));
    (httpClient.setToken as jest.Mock).mockImplementation(() => {});
    (httpClient.getToken as jest.Mock).mockReturnValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('用户重新打开浏览器的场景', () => {
    it('应该处理Token即将过期的情况', async () => {
      // 模拟用户关闭浏览器前的状态：Token还有55分钟过期
      const almostExpiredToken = createMockToken(55, 5); // 55分钟后过期，5分钟前签发
      const refreshToken = createMockToken(7 * 24 * 60);
      
      mockLocalStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(mockUser));
      mockLocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, almostExpiredToken);
      mockLocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

      // 模拟用户重新打开浏览器，创建新的AuthService实例
      const newAuthService = new (authService.constructor as any)();

      // 等待异步操作完成
      await jest.runAllTimersAsync();

      // 应该自动刷新Token，因为剩余时间少于阈值
      expect(httpClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: refreshToken
      });
    });

    it('应该处理Token已过期的情况', async () => {
      // 模拟Token已过期
      const expiredToken = createMockToken(-10); // 10分钟前过期
      const refreshToken = createMockToken(7 * 24 * 60);
      
      mockLocalStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(mockUser));
      mockLocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, expiredToken);
      mockLocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

      // 创建新的AuthService实例
      const newAuthService = new (authService.constructor as any)();

      // 应该清理过期的Token
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_INFO);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
    });

    it('应该为有效Token设置精确的刷新时间', () => {
      // 模拟Token还有30分钟过期
      const validToken = createMockToken(30);
      const refreshToken = createMockToken(7 * 24 * 60);
      
      mockLocalStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(mockUser));
      mockLocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, validToken);
      mockLocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

      // 创建新的AuthService实例
      const newAuthService = new (authService.constructor as any)();

      // 应该设置定时器，在过期前TOKEN_REFRESH_THRESHOLD时间刷新
      const expectedDelay = (30 * 60 * 1000) - SECURITY_CONFIG.TOKEN_REFRESH_THRESHOLD;
      expect(setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Number)
      );

      // 获取实际设置的延迟时间
      const setTimeoutCall = (setTimeout as jest.Mock).mock.calls.find(
        call => typeof call[1] === 'number' && call[1] > 0
      );
      expect(setTimeoutCall).toBeTruthy();
      
      if (setTimeoutCall) {
        const actualDelay = setTimeoutCall[1];
        // 允许一定的误差（1秒）
        expect(Math.abs(actualDelay - expectedDelay)).toBeLessThan(1000);
      }
    });
  });

  describe('并发刷新场景', () => {
    it('应该防止多个并发刷新请求', async () => {
      const refreshToken = createMockToken(7 * 24 * 60);
      mockLocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

      // 模拟慢速网络响应
      let resolveRefresh: (value: any) => void;
      const refreshPromise = new Promise(resolve => {
        resolveRefresh = resolve;
      });
      
      (httpClient.post as jest.Mock).mockReturnValue(refreshPromise);

      // 同时发起多个刷新请求
      const refresh1 = authService.refreshAccessToken();
      const refresh2 = authService.refreshAccessToken();
      const refresh3 = authService.refreshAccessToken();

      // 解决刷新请求
      resolveRefresh!({
        success: true,
        data: {
          user: mockUser,
          accessToken: createMockToken(60),
          refreshToken: createMockToken(7 * 24 * 60)
        }
      });

      await Promise.all([refresh1, refresh2, refresh3]);

      // 应该只发送一次刷新请求
      expect(httpClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('网络错误和重试场景', () => {
    it('应该处理刷新Token时的网络错误', async () => {
      const refreshToken = createMockToken(7 * 24 * 60);
      mockLocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

      // 模拟网络错误
      (httpClient.post as jest.Mock).mockRejectedValue(new Error('Network error'));

      // 模拟logout方法
      const logoutSpy = jest.spyOn(authService, 'logout').mockImplementation(async () => {});

      await expect(authService.refreshAccessToken()).rejects.toThrow('Network error');
      expect(logoutSpy).toHaveBeenCalled();
    });

    it('应该处理服务器返回的刷新失败', async () => {
      const refreshToken = createMockToken(7 * 24 * 60);
      mockLocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

      // 模拟服务器返回刷新失败
      (httpClient.post as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid refresh token'
      });

      const logoutSpy = jest.spyOn(authService, 'logout').mockImplementation(async () => {});

      await expect(authService.refreshAccessToken()).rejects.toThrow();
      expect(logoutSpy).toHaveBeenCalled();
    });
  });

  describe('Token监控场景', () => {
    it('应该在Token即将过期时触发监控回调', () => {
      const nearExpiryToken = createMockToken(3); // 3分钟后过期
      const refreshToken = createMockToken(7 * 24 * 60);
      
      mockLocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, nearExpiryToken);
      mockLocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

      // 创建新的AuthService实例来触发监控设置
      const newAuthService = new (authService.constructor as any)();

      // 推进时间到监控检查点
      jest.advanceTimersByTime(30 * 1000); // 30秒后

      // 验证监控器被正确设置
      expect(setInterval).toHaveBeenCalled();
    });

    it('应该在Token过期时自动登出', () => {
      const expiredToken = createMockToken(-1); // 已过期
      
      mockLocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, expiredToken);

      const logoutSpy = jest.spyOn(authService, 'logout').mockImplementation(async () => {});

      // 创建新的AuthService实例
      const newAuthService = new (authService.constructor as any)();

      // 推进时间触发监控检查
      jest.advanceTimersByTime(30 * 1000);

      // 应该自动登出
      expect(logoutSpy).toHaveBeenCalled();
    });
  });

  describe('边缘情况', () => {
    it('应该处理损坏的localStorage数据', () => {
      // 设置损坏的JSON数据
      mockLocalStorage.setItem(STORAGE_KEYS.USER_INFO, 'invalid-json');
      mockLocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, createMockToken(60));

      // 创建新的AuthService实例
      const newAuthService = new (authService.constructor as any)();

      // 应该清理损坏的数据
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_INFO);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
    });

    it('应该处理缺失的refresh token', async () => {
      // 只设置access token，没有refresh token
      mockLocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, createMockToken(60));

      await expect(authService.refreshAccessToken()).rejects.toThrow('No refresh token available');
    });

    it('应该处理无效的refresh token', async () => {
      // 设置无效的refresh token
      mockLocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'invalid-token');

      await expect(authService.refreshAccessToken()).rejects.toThrow();
    });
  });
});
