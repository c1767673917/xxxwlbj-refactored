// API响应类型定义

// 基础类型
export interface User {
  id: string;
  email?: string;
  name?: string;
  username?: string;
  role: 'admin' | 'user' | 'provider';
  providerId?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
  wechat_webhook_url?: string;
  wechat_notification_enabled?: boolean;
  wechatConfig?: WechatConfig;
}

export interface Order {
  id: string;
  warehouse: string;
  goods: string;
  deliveryAddress: string;
  createdAt: string;
  updatedAt?: string;
  status: 'active' | 'completed' | 'cancelled' | 'placeholder';
  selectedProvider?: string;
  selectedPrice?: number;
  selectedAt?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  description?: string;
  requirements?: string;
}

export interface Quote {
  id: string;
  orderId: string;
  provider: string;
  price: number;
  estimatedDelivery: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  orderWarehouse?: string;
  orderGoods?: string;
  orderDeliveryAddress?: string;
  status?: 'pending' | 'selected' | 'rejected';
  estimatedDays?: number;
  selectedAt?: string;
  order?: Order;
}

export interface Provider {
  id: number;
  name: string;
  accessKey: string;
  wechat_webhook_url?: string;
  createdAt: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  serviceArea?: string;
  description?: string;
  rating?: number;
  isActive?: boolean;
  totalOrders?: number;
  completedOrders?: number;
}

// 认证相关类型
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  username?: string;
  role: string;
  providerId?: string;
  createdAt?: string;
  wechatConfig?: WechatConfig;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasSearch?: boolean;
}

// 统计信息类型
export interface AdminStats {
  totalOrders: number;
  activeOrders: number;
  closedOrders: number;
  totalProviders: number;
  totalQuotes: number;
  totalUsers: number;
  recentOrders: Order[];
  recentQuotes: Quote[];
}

// 用户活动记录类型
export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
  userEmail?: string;
  userName?: string;
}

// 企业微信配置类型
export interface WechatConfig {
  wechat_webhook_url?: string;
  wechat_notification_enabled?: boolean;
  enabled?: boolean;
  webhook?: string;
  secret?: string;
}

// API错误类型
export interface ApiError {
  error: string;
  message?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// 请求参数类型
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
}

export interface OrdersParams extends PaginationParams {
  status?: string;
}

export interface UserActivityParams extends PaginationParams {
  userId?: string;
}

// 创建/更新请求类型
export interface CreateUserRequest {
  email: string;
  password: string;
  name?: string;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  isActive?: boolean;
}

export interface CreateOrderRequest {
  warehouse: string;
  goods: string;
  destination: string;
}

export interface UpdateOrderRequest {
  warehouse?: string;
  goods?: string;
  deliveryAddress?: string;
  status?: string;
}

export interface CreateQuoteRequest {
  orderId: string;
  providerId?: string;
  provider?: string;
  price: number;
  estimatedDelivery?: string;
  estimatedDays?: number;
  notes?: string;
  accessKey?: string;
}

export interface CreateProviderRequest {
  name: string;
  customAccessKey?: string;
  wechatWebhookUrl?: string;
}

export interface SelectProviderRequest {
  provider: string;
  price: number;
}

// 导出相关类型
export interface ExportResponse {
  success: boolean;
  message?: string;
  downloadUrl?: string;
}

// 批量操作类型
export interface BatchQuotesResponse {
  [orderId: string]: Quote | null;
}

// 文件上传类型
export interface FileUploadResponse {
  success: boolean;
  message: string;
  importedCount?: number;
  errors?: string[];
}

// 密码更新类型
export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

// AI识别相关类型
export interface AIRecognitionRequest {
  text: string;
}

export interface AIRecognitionResponse {
  warehouse: string;
  goods: string;
  destination: string;
}

// 系统健康检查类型
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    api: 'up' | 'down';
  };
  version: string;
}

// 备份管理类型
export interface BackupConfig {
  qiniu_access_key?: string;
  qiniu_secret_key?: string;
  qiniu_bucket?: string;
  qiniu_region?: string;
  auto_backup_enabled?: boolean;
  backup_schedule?: string;
}

export interface BackupHistory {
  id: string;
  filename: string;
  size: number;
  fileSize?: number;
  createdAt: string;
  status: 'success' | 'failed' | 'in_progress' | 'completed';
  type: 'manual' | 'auto';
}

export interface RestoreOptions {
  restoreDatabase: boolean;
  restoreConfigs: boolean;
  restoreLogs: boolean;
  createBackup: boolean;
  verifyIntegrity: boolean;
  includeUsers?: boolean;
  includeOrders?: boolean;
  includeQuotes?: boolean;
  includeProviders?: boolean;
  overwriteExisting?: boolean;
}

// 通用API响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// HTTP方法类型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// API请求配置类型
export interface ApiRequestConfig {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

// 表单数据类型
export interface FormData {
  [key: string]: string | number | boolean | File | null | undefined;
}
