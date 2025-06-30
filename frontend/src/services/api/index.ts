// API服务统一导出

import { httpClient } from './client';
import type {
  LoginResponse,
  AuthUser,
  User,
  Order,
  Quote,
  Provider,
  PaginatedResponse,
  AdminStats,
  UserActivity,
  WechatConfig,
  // ApiError, // 暂时注释未使用的类型
  PaginationParams,
  OrdersParams,
  UserActivityParams,
  CreateUserRequest,
  UpdateUserRequest,
  CreateOrderRequest,
  UpdateOrderRequest,
  CreateQuoteRequest,
  CreateProviderRequest,
  SelectProviderRequest,
  BatchQuotesResponse,
  FileUploadResponse,
  UpdatePasswordRequest,
  ResetPasswordRequest,
  // AIRecognitionRequest, // 暂时注释未使用的类型
  AIRecognitionResponse,
  BackupConfig,
  BackupHistory,
  RestoreOptions,
} from '@/types';

// API服务配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

// 认证API端点（不需要token）
const PUBLIC_ENDPOINTS = ['/auth/login', '/auth/login/provider', '/auth/refresh', '/providers/details', '/admin/login'];

// 请求配置常量 (预留用于未来功能)
// const REQUEST_TIMEOUT = parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || '10000', 10);
// const MAX_RETRY_ATTEMPTS = parseInt(import.meta.env.VITE_MAX_RETRY_ATTEMPTS || '3', 10);

// 检查是否为公开端点
function isPublicEndpoint(endpoint: string): boolean {
  return PUBLIC_ENDPOINTS.some(publicEndpoint => endpoint.includes(publicEndpoint));
}

// 通用API请求函数
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  // 如果不是公开端点，添加认证头
  if (!isPublicEndpoint(endpoint)) {
    // 首先尝试普通用户token，然后尝试管理员token
    let accessToken = localStorage.getItem('wlbj_access_token');
    if (!accessToken) {
      accessToken = localStorage.getItem('wlbj_admin_access_token');
    }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // 处理token过期
    if (response.status === 401 && !isPublicEndpoint(endpoint)) {
      // 首先尝试普通用户的刷新token，然后尝试管理员的
      let refreshToken = localStorage.getItem('wlbj_refresh_token');
      let isAdmin = false;

      if (!refreshToken) {
        refreshToken = localStorage.getItem('wlbj_admin_refresh_token');
        isAdmin = true;
      }

      if (refreshToken) {
        try {
          // 尝试刷新token
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshResponse.ok) {
            const tokenData = await refreshResponse.json();
            if (tokenData.accessToken && tokenData.refreshToken) {
              // 根据用户类型保存新token
              if (isAdmin) {
                localStorage.setItem('wlbj_admin_access_token', tokenData.accessToken);
                localStorage.setItem('wlbj_admin_refresh_token', tokenData.refreshToken);
              } else {
                localStorage.setItem('wlbj_access_token', tokenData.accessToken);
                localStorage.setItem('wlbj_refresh_token', tokenData.refreshToken);
              }

              // 使用新token重试原请求
              const newHeaders = {
                ...headers,
                'Authorization': `Bearer ${tokenData.accessToken}`,
              };

              const retryResponse = await fetch(url, {
                ...config,
                headers: newHeaders,
              });

              if (retryResponse.ok) {
                return await retryResponse.json();
              }
            }
          }
        } catch (refreshError) {
          console.error('Token刷新失败:', refreshError);
        }
      }

      // 如果刷新失败，清除认证信息（包括管理员和普通用户）
      localStorage.removeItem('wlbj_access_token');
      localStorage.removeItem('wlbj_refresh_token');
      localStorage.removeItem('wlbj_user');
      localStorage.removeItem('wlbj_admin_access_token');
      localStorage.removeItem('wlbj_admin_refresh_token');
      localStorage.removeItem('wlbj_admin_user');

      throw new Error('认证已过期，请重新登录');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API请求失败:', error);
    throw error;
  }
}

// 认证相关API
export const authAPI = {
  // 用户登录
  login: async (password: string, email?: string): Promise<LoginResponse> => {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password, email }),
    });

    // 保存认证信息
    if (response.accessToken && response.refreshToken) {
      localStorage.setItem('wlbj_access_token', response.accessToken);
      localStorage.setItem('wlbj_refresh_token', response.refreshToken);
      localStorage.setItem('wlbj_user', JSON.stringify(response.user));
      httpClient.setToken(response.accessToken, false); // 标记为普通用户token
    }

    return response;
  },

  // 供应商登录
  loginProvider: async (accessKey: string): Promise<LoginResponse> => {
    const response = await apiRequest<LoginResponse>('/auth/login/provider', {
      method: 'POST',
      body: JSON.stringify({ accessKey }),
    });

    // 保存认证信息
    if (response.accessToken && response.refreshToken) {
      localStorage.setItem('wlbj_access_token', response.accessToken);
      localStorage.setItem('wlbj_refresh_token', response.refreshToken);
      localStorage.setItem('wlbj_user', JSON.stringify(response.user));
      httpClient.setToken(response.accessToken, false); // 标记为普通用户token
    }

    return response;
  },

  // 刷新token
  refresh: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await apiRequest<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    // 判断是否为管理员token
    const isAdmin = localStorage.getItem('wlbj_admin_refresh_token') === refreshToken;

    // 保存新的token
    if (response.accessToken && response.refreshToken) {
      if (isAdmin) {
        localStorage.setItem('wlbj_admin_access_token', response.accessToken);
        localStorage.setItem('wlbj_admin_refresh_token', response.refreshToken);
        httpClient.setToken(response.accessToken, true);
      } else {
        localStorage.setItem('wlbj_access_token', response.accessToken);
        localStorage.setItem('wlbj_refresh_token', response.refreshToken);
        httpClient.setToken(response.accessToken, false);
      }
    }

    return response;
  },

  // 登出
  logout: async (): Promise<void> => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('wlbj_access_token');
      localStorage.removeItem('wlbj_refresh_token');
      localStorage.removeItem('wlbj_user');
      httpClient.setToken(null);
    }
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<AuthUser> => {
    return apiRequest<AuthUser>('/auth/me');
  },

  // 验证token有效性
  verifyToken: async (): Promise<{ success: boolean; user: AuthUser; message: string }> => {
    return apiRequest<{ success: boolean; user: AuthUser; message: string }>('/auth/verify');
  },
};

// 用户相关API
export const usersAPI = {
  // 获取用户列表（管理员功能）
  getUsers: async (params?: PaginationParams): Promise<PaginatedResponse<User>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return apiRequest<PaginatedResponse<User>>(`/admin/users/list${query ? `?${query}` : ''}`);
  },

  // 获取单个用户（管理员功能）
  getUser: async (userId: string): Promise<User> => {
    return apiRequest<User>(`/admin/users/${userId}`);
  },

  // 创建用户（管理员功能）
  createUser: async (userData: CreateUserRequest): Promise<User> => {
    return apiRequest<User>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // 更新用户（管理员功能）
  updateUser: async (userId: string, userData: UpdateUserRequest): Promise<User> => {
    return apiRequest<User>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // 删除用户（管理员功能）
  deleteUser: async (userId: string): Promise<void> => {
    return apiRequest<void>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // 更新用户密码（使用统一的密码修改接口）
  updatePassword: async (passwordData: UpdatePasswordRequest): Promise<void> => {
    return apiRequest<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  },

  // 重置用户密码
  resetPassword: async (userId: string, passwordData: ResetPasswordRequest): Promise<void> => {
    return apiRequest<void>(`/users/${userId}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  },

  // 获取用户活动记录
  getUserActivity: async (params?: UserActivityParams): Promise<PaginatedResponse<UserActivity>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.userId) queryParams.append('userId', params.userId);
    
    const query = queryParams.toString();
    return apiRequest<PaginatedResponse<UserActivity>>(`/users/activity${query ? `?${query}` : ''}`);
  },

  // 更新微信配置
  updateWechatConfig: async (userId: string, config: WechatConfig): Promise<void> => {
    return apiRequest<void>(`/users/${userId}/wechat`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },
};

// 订单相关API
export const ordersAPI = {
  // 获取订单列表（管理员功能）
  getOrders: async (params?: OrdersParams): Promise<PaginatedResponse<Order>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const query = queryParams.toString();
    return apiRequest<PaginatedResponse<Order>>(`/admin/orders/all${query ? `?${query}` : ''}`);
  },

  // 获取单个订单
  getOrder: async (orderId: string): Promise<Order> => {
    return apiRequest<Order>(`/orders/${orderId}`);
  },

  // 创建订单
  createOrder: async (orderData: CreateOrderRequest): Promise<Order> => {
    return apiRequest<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  // 更新订单
  updateOrder: async (orderId: string, orderData: UpdateOrderRequest): Promise<Order> => {
    return apiRequest<Order>(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    });
  },

  // 删除订单
  deleteOrder: async (orderId: string): Promise<void> => {
    return apiRequest<void>(`/orders/${orderId}`, {
      method: 'DELETE',
    });
  },

  // 选择供应商（通过选择报价实现）
  selectProvider: async (quoteId: string): Promise<Order> => {
    return apiRequest<Order>(`/quotes/${quoteId}/select`, {
      method: 'POST',
    });
  },

  // 关闭订单
  closeOrder: async (orderId: string): Promise<Order> => {
    return apiRequest<Order>(`/orders/${orderId}/close`, {
      method: 'POST',
    });
  },
};

// 报价相关API
export const quotesAPI = {
  // 获取报价列表
  getQuotes: async (params?: PaginationParams): Promise<PaginatedResponse<Quote>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return apiRequest<PaginatedResponse<Quote>>(`/quotes${query ? `?${query}` : ''}`);
  },

  // 获取订单的报价（修复路径）
  getOrderQuotes: async (orderId: string): Promise<Quote[]> => {
    return apiRequest<Quote[]>(`/quotes/orders/${orderId}`);
  },

  // 创建报价（使用请求体中的orderId）
  createQuote: async (quoteData: CreateQuoteRequest): Promise<Quote> => {
    return apiRequest<Quote>(`/quotes/orders/${quoteData.orderId}`, {
      method: 'POST',
      body: JSON.stringify(quoteData),
    });
  },

  // 更新报价
  updateQuote: async (quoteId: string, quoteData: Partial<CreateQuoteRequest>): Promise<Quote> => {
    return apiRequest<Quote>(`/quotes/${quoteId}`, {
      method: 'PUT',
      body: JSON.stringify(quoteData),
    });
  },

  // 删除报价
  deleteQuote: async (quoteId: string): Promise<void> => {
    return apiRequest<void>(`/quotes/${quoteId}`, {
      method: 'DELETE',
    });
  },

  // 批量获取报价
  getBatchQuotes: async (orderIds: string[]): Promise<BatchQuotesResponse> => {
    return apiRequest<BatchQuotesResponse>('/quotes/batch', {
      method: 'POST',
      body: JSON.stringify({ orderIds }),
    });
  },
};

// 供应商相关API
export const providersAPI = {
  // 获取供应商列表
  getProviders: async (params?: PaginationParams): Promise<PaginatedResponse<Provider>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return apiRequest<PaginatedResponse<Provider>>(`/providers${query ? `?${query}` : ''}`);
  },

  // 获取单个供应商
  getProvider: async (providerId: string): Promise<Provider> => {
    return apiRequest<Provider>(`/providers/${providerId}`);
  },

  // 通过访问密钥获取供应商详情
  getProviderByKey: async (accessKey: string): Promise<Provider> => {
    return apiRequest<Provider>(`/providers/details?accessKey=${accessKey}`);
  },

  // 创建供应商
  createProvider: async (providerData: CreateProviderRequest): Promise<Provider> => {
    return apiRequest<Provider>('/providers', {
      method: 'POST',
      body: JSON.stringify(providerData),
    });
  },

  // 更新供应商
  updateProvider: async (providerId: string, providerData: Partial<CreateProviderRequest>): Promise<Provider> => {
    return apiRequest<Provider>(`/providers/${providerId}`, {
      method: 'PUT',
      body: JSON.stringify(providerData),
    });
  },

  // 删除供应商
  deleteProvider: async (providerId: string): Promise<void> => {
    return apiRequest<void>(`/providers/${providerId}`, {
      method: 'DELETE',
    });
  },

  // 获取供应商的可用订单
  getAvailableOrders: async (accessKey: string): Promise<Order[]> => {
    return apiRequest<Order[]>(`/providers/orders?accessKey=${accessKey}`);
  },

  // 获取供应商的报价历史
  getQuoteHistory: async (accessKey: string): Promise<Quote[]> => {
    return apiRequest<Quote[]>(`/providers/quotes?accessKey=${accessKey}`);
  },
};

// 管理员相关API
export const adminAPI = {
  // 管理员登录
  login: async (password: string): Promise<LoginResponse> => {
    const response = await apiRequest<{data: LoginResponse}>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });

    // 提取实际的登录数据
    const loginData = response.data;

    // 保存管理员认证信息
    if (loginData.accessToken && loginData.refreshToken) {
      localStorage.setItem('wlbj_admin_access_token', loginData.accessToken);
      localStorage.setItem('wlbj_admin_refresh_token', loginData.refreshToken);
      localStorage.setItem('wlbj_admin_user', JSON.stringify(loginData.user));
      httpClient.setToken(loginData.accessToken, true); // 标记为管理员token
    }

    return loginData;
  },

  // 获取系统统计信息
  getStats: async (): Promise<AdminStats> => {
    return apiRequest<AdminStats>('/admin/stats');
  },

  // 更新管理员密码
  updatePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    return apiRequest<void>('/admin/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // 获取系统配置
  getSystemConfig: async (configKey?: string): Promise<any> => {
    const params = configKey ? `?configKey=${configKey}` : '';
    return apiRequest<any>(`/admin/system-config${params}`);
  },

  // 更新系统配置
  updateSystemConfig: async (configData: any): Promise<any> => {
    return apiRequest<any>('/admin/system-config', {
      method: 'PUT',
      body: JSON.stringify(configData),
    });
  },

  // 验证系统配置
  validateSystemConfig: async (configData: any): Promise<void> => {
    return apiRequest<void>('/admin/system-config/validate', {
      method: 'POST',
      body: JSON.stringify(configData),
    });
  },

  // 重置配置为默认值
  resetConfigToDefault: async (configKey: string): Promise<any> => {
    return apiRequest<any>('/admin/system-config/reset', {
      method: 'POST',
      body: JSON.stringify({ configKey }),
    });
  },

  // 初始化默认配置
  initializeDefaultConfigs: async (): Promise<void> => {
    return apiRequest<void>('/admin/system-config/initialize', {
      method: 'POST',
    });
  },

  // 备份相关
  getBackupConfig: async (): Promise<BackupConfig> => {
    return apiRequest<BackupConfig>('/admin/backup/config');
  },

  updateBackupConfig: async (config: BackupConfig): Promise<void> => {
    return apiRequest<void>('/admin/backup/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  createBackup: async (): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>('/admin/backup/create', {
      method: 'POST',
    });
  },

  getBackupHistory: async (): Promise<BackupHistory[]> => {
    return apiRequest<BackupHistory[]>('/admin/backup/history');
  },

  restoreBackup: async (file: File, options: RestoreOptions): Promise<{ success: boolean; message: string }> => {
    const formData = new FormData();
    formData.append('backup', file);
    formData.append('options', JSON.stringify(options));

    return apiRequest<{ success: boolean; message: string }>('/admin/backup/restore', {
      method: 'POST',
      body: formData,
      headers: {}, // 让浏览器自动设置Content-Type
    });
  },

  // 管理员登出
  logout: async (): Promise<void> => {
    try {
      await apiRequest('/admin/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('wlbj_admin_access_token');
      localStorage.removeItem('wlbj_admin_refresh_token');
      localStorage.removeItem('wlbj_admin_user');
    }
  },
};

// 导出相关API
export const exportAPI = {
  // 导出订单（使用管理员路由）
  exportOrders: async (format: 'csv' | 'excel' = 'excel'): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/admin/orders/export?format=${format}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('wlbj_access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('导出失败');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // 导出报价
  exportQuotes: async (format: 'csv' | 'excel' = 'excel'): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/export/quotes?format=${format}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('wlbj_access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('导出失败');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quotes_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // 导入订单
  importOrders: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest<FileUploadResponse>('/import/orders', {
      method: 'POST',
      body: formData,
      headers: {}, // 让浏览器自动设置Content-Type
    });
  },
};

// AI识别相关API
export const aiAPI = {
  // 文本识别
  recognizeText: async (text: string): Promise<AIRecognitionResponse> => {
    return apiRequest<AIRecognitionResponse>('/ai/recognize', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },
};

// 统一API导出
const api = {
  auth: authAPI,
  users: usersAPI,
  orders: ordersAPI,
  quotes: quotesAPI,
  providers: providersAPI,
  admin: adminAPI,
  export: exportAPI,
  ai: aiAPI,
};

export default api;

// 导出HTTP客户端和配置
export { httpClient } from './client';
export { apiConfig } from './config';

// 导出类型
export type { RequestOptions } from './client';
