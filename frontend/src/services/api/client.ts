// HTTP客户端

import {
  apiConfig,
  getHeaders,
  isPublicEndpoint,
  ERROR_CODES,
  ERROR_MESSAGES,
  RETRY_CONFIG,
  TIMEOUT_CONFIG
} from './config';
import { logger } from '@/services/utils';
import { isTokenValid } from '@/utils/jwt';
import type { ApiResponse, ApiRequestConfig } from '@/types';

// 请求选项接口
interface RequestOptions extends ApiRequestConfig {
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
  timeout?: number;
  retries?: number;
  skipTokenValidation?: boolean; // 跳过Token验证（用于刷新Token的请求）
}

// HTTP客户端类
class HttpClient {
  private baseURL: string;
  private defaultTimeout: number;
  private token: string | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.baseURL = apiConfig.baseURL;
    this.defaultTimeout = apiConfig.timeout;
    this.loadToken();
  }

  // 加载存储的token
  private loadToken(): void {
    try {
      this.token = localStorage.getItem('wlbj_access_token');
    } catch (error) {
      logger.warn('Failed to load token from localStorage:', error);
    }
  }

  // 设置token
  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      try {
        localStorage.setItem('wlbj_access_token', token);
      } catch (error) {
        logger.warn('Failed to save token to localStorage:', error);
      }
    } else {
      try {
        localStorage.removeItem('wlbj_access_token');
      } catch (error) {
        logger.warn('Failed to remove token from localStorage:', error);
      }
    }
  }

  // 获取token
  getToken(): string | null {
    return this.token;
  }

  // 检查Token是否有效
  private isTokenValid(): boolean {
    if (!this.token) return false;
    return isTokenValid(this.token);
  }

  // 尝试刷新Token
  private async tryRefreshToken(): Promise<void> {
    // 如果已经在刷新中，等待刷新完成
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = localStorage.getItem('wlbj_refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = this.performTokenRefresh(refreshToken);

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  // 执行Token刷新
  private async performTokenRefresh(refreshToken: string): Promise<void> {
    try {
      logger.info('Attempting to refresh token via HTTP client');

      const response = await this.request<{
        accessToken: string;
        refreshToken: string;
        user: any;
      }>({
        url: '/auth/refresh',
        method: 'POST',
        data: { refreshToken },
        skipTokenValidation: true // 跳过Token验证，因为我们正在刷新
      });

      if (response.success && response.data) {
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // 更新Token
        this.setToken(accessToken);
        localStorage.setItem('wlbj_refresh_token', newRefreshToken);

        logger.info('Token refreshed successfully via HTTP client');
      } else {
        throw new Error(response.error || 'Token refresh failed');
      }
    } catch (error) {
      logger.error('Token refresh failed via HTTP client:', error);

      // 清除无效的Token
      this.setToken(null);
      localStorage.removeItem('wlbj_refresh_token');

      throw error;
    }
  }

  // 构建完整URL
  private buildURL(url: string, params?: Record<string, unknown>): string {
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    if (!params || Object.keys(params).length === 0) {
      return fullURL;
    }

    const urlObj = new URL(fullURL);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        urlObj.searchParams.append(key, String(value));
      }
    });

    return urlObj.toString();
  }

  // 处理请求错误
  private handleError(error: unknown, url: string): never {
    logger.error('HTTP request failed:', { url, error });

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR]);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Unknown error occurred');
  }

  // 发送HTTP请求（带Token验证和自动刷新）
  async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    const { skipTokenValidation = false } = options;

    // 如果需要认证且Token无效，尝试刷新
    if (!skipTokenValidation && !isPublicEndpoint(options.url)) {
      if (!this.isTokenValid()) {
        try {
          await this.tryRefreshToken();
        } catch (error) {
          logger.error('Failed to refresh token before request:', error);
          // Token刷新失败，继续发送请求，让服务器返回401
        }
      }
    }

    try {
      return await this.sendRequest<T>(options);
    } catch (error) {
      // 如果是401错误且不是刷新Token的请求，尝试刷新Token后重试
      if (!skipTokenValidation &&
          !isPublicEndpoint(options.url) &&
          error instanceof Error &&
          error.message.includes('401')) {

        try {
          logger.info('Received 401, attempting token refresh and retry');
          await this.tryRefreshToken();

          // 重新发送请求
          return await this.sendRequest<T>(options);
        } catch (refreshError) {
          logger.error('Token refresh failed after 401:', refreshError);
          throw error; // 抛出原始错误
        }
      }

      throw error;
    }
  }

  // 发送HTTP请求（内部方法）
  private async sendRequest<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    const {
      url,
      method = 'GET',
      data,
      params,
      headers: customHeaders = {},
      timeout = this.defaultTimeout,
      retries = RETRY_CONFIG.maxRetries,
    } = options;

    const fullURL = this.buildURL(url, params);
    const needsAuth = !isPublicEndpoint(url);
    const requestHeaders = {
      ...getHeaders(needsAuth ? this.token || undefined : undefined),
      ...customHeaders,
    };

    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(timeout),
    };

    if (data && method !== 'GET') {
      if (data instanceof FormData) {
        requestConfig.body = data;
        // 删除Content-Type，让浏览器自动设置
        delete requestHeaders['Content-Type'];
      } else {
        requestConfig.body = JSON.stringify(data);
      }
    }

    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        logger.debug(`HTTP ${method} ${fullURL}`, { attempt: attempt + 1, data });

        const response = await fetch(fullURL, requestConfig);
        const responseData = await this.parseResponse<T>(response);

        logger.debug(`HTTP ${method} ${fullURL} - ${response.status}`, responseData);

        if (!response.ok) {
          throw new Error(
            ERROR_MESSAGES[response.status as keyof typeof ERROR_MESSAGES] || 
            `HTTP ${response.status}: ${response.statusText}`
          );
        }

        return responseData;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 如果不是最后一次尝试且错误可重试，则继续
        if (attempt < retries && this.shouldRetry(lastError)) {
          await this.delay(RETRY_CONFIG.retryDelay * (attempt + 1));
          continue;
        }
        
        break;
      }
    }

    this.handleError(lastError || new Error('Unknown error'), fullURL);
  }

  // 解析响应
  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    
    if (contentType?.includes('text/')) {
      const text = await response.text();
      return { success: response.ok, data: text as T };
    }

    // 对于其他类型（如文件下载），返回blob
    const blob = await response.blob();
    return { success: response.ok, data: blob as T };
  }

  // 判断是否应该重试
  private shouldRetry(error: Error): boolean {
    // 网络错误或5xx错误才重试
    return error.message.includes('fetch') || 
           error.message.includes('timeout') ||
           error.message.includes('500');
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // GET请求
  async get<T>(url: string, params?: Record<string, unknown>, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'GET', params, ...config });
  }

  // POST请求
  async post<T>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'POST', data, ...config });
  }

  // PUT请求
  async put<T>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'PUT', data, ...config });
  }

  // DELETE请求
  async delete<T>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'DELETE', ...config });
  }

  // PATCH请求
  async patch<T>(url: string, data?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'PATCH', data, ...config });
  }

  // 文件上传
  async upload<T>(url: string, file: File, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<T>({
      url,
      method: 'POST',
      data: formData,
      timeout: TIMEOUT_CONFIG.upload,
      ...config,
    });
  }

  // 文件下载
  async download(url: string, filename?: string, config?: ApiRequestConfig): Promise<void> {
    const response = await this.request<Blob>({
      url,
      method: 'GET',
      timeout: TIMEOUT_CONFIG.download,
      ...config,
    });

    if (response.success && response.data) {
      const blob = response.data;
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    }
  }
}

// 创建全局HTTP客户端实例
export const httpClient = new HttpClient();

// 导出类型和实例
export type { RequestOptions };
export { HttpClient };
