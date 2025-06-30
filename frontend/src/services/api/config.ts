// API配置文件

import { API_CONFIG } from '@/constants';

// API基础配置
export const apiConfig = {
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  retries: API_CONFIG.retries,
};

// 公共端点（不需要认证）
export const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/login/provider',
  '/auth/refresh',
  '/admin/login',
  '/providers/details',
  '/health',
];

// 请求头配置
export const getHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

// 检查是否为公共端点
export const isPublicEndpoint = (url: string): boolean => {
  return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

// API错误码映射
export const ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  SERVER_ERROR: 500,
  NETWORK_ERROR: 0,
} as const;

// 错误消息映射
export const ERROR_MESSAGES = {
  [ERROR_CODES.UNAUTHORIZED]: '未授权访问，请重新登录',
  [ERROR_CODES.FORBIDDEN]: '权限不足，无法访问该资源',
  [ERROR_CODES.NOT_FOUND]: '请求的资源不存在',
  [ERROR_CODES.VALIDATION_ERROR]: '请求参数验证失败',
  [ERROR_CODES.SERVER_ERROR]: '服务器内部错误，请稍后重试',
  [ERROR_CODES.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
} as const;

// 重试配置
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1秒
  retryCondition: (status: number) => {
    // 5xx错误和网络错误才重试
    return status >= 500 || status === 0;
  },
};

// 超时配置
export const TIMEOUT_CONFIG = {
  default: 10000, // 10秒
  upload: 60000,  // 60秒（文件上传）
  download: 30000, // 30秒（文件下载）
};

// 缓存配置
export const CACHE_CONFIG = {
  enabled: true,
  ttl: 5 * 60 * 1000, // 5分钟
  maxSize: 100, // 最大缓存条目数
};

// 请求拦截器配置
export const REQUEST_INTERCEPTOR_CONFIG = {
  // 是否自动添加时间戳防止缓存
  addTimestamp: true,
  // 是否自动转换请求数据
  transformRequest: true,
  // 是否记录请求日志
  logRequests: __DEV__,
};

// 响应拦截器配置
export const RESPONSE_INTERCEPTOR_CONFIG = {
  // 是否自动处理错误
  autoHandleErrors: true,
  // 是否记录响应日志
  logResponses: __DEV__,
  // 是否自动刷新token
  autoRefreshToken: true,
};
