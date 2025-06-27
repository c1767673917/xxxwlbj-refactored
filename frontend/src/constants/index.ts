// 应用常量定义

export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'WLBJ物流报价系统',
  version: import.meta.env.VITE_APP_VERSION || '3.0.0',
  description: '连接货主与物流供应商的专业平台',
} as const;

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || '10000', 10),
  retries: parseInt(import.meta.env.VITE_MAX_RETRY_ATTEMPTS || '3', 10),
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN_USER: '/login-user-page',
  ADMIN_LOGIN: '/admin/login',
  USER_PORTAL: '/user',
  ADMIN_PORTAL: '/admin',
  PROVIDER_PORTAL: '/provider/:accessKey',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  PROVIDER: 'provider',
} as const;

export const ORDER_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  PLACEHOLDER: 'placeholder',
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'wlbj_access_token',
  REFRESH_TOKEN: 'wlbj_refresh_token',
  USER_INFO: 'wlbj_user_info',
  ADMIN_TOKEN: 'wlbj_admin_token',
  ADMIN_INFO: 'wlbj_admin_info',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: parseInt(import.meta.env.VITE_PAGINATION_DEFAULT_SIZE || '10', 10),
  MAX_PAGE_SIZE: parseInt(import.meta.env.VITE_PAGINATION_MAX_SIZE || '100', 10),
} as const;

export const VALIDATION = {
  PASSWORD_MIN_LENGTH: parseInt(import.meta.env.VITE_PASSWORD_MIN_LENGTH || '6', 10),
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^1[3-9]\d{9}$/,
  SEARCH_MIN_LENGTH: parseInt(import.meta.env.VITE_SEARCH_MIN_LENGTH || '2', 10),
} as const;

export const SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: parseInt(import.meta.env.VITE_MAX_LOGIN_ATTEMPTS || '5', 10),
  LOGIN_LOCKOUT_DURATION: parseInt(import.meta.env.VITE_LOGIN_LOCKOUT_DURATION || '900000', 10),
  TOKEN_REFRESH_THRESHOLD: parseInt(import.meta.env.VITE_TOKEN_REFRESH_THRESHOLD || '300000', 10),
  AUTO_LOGOUT_TIMEOUT: parseInt(import.meta.env.VITE_AUTO_LOGOUT_TIMEOUT || '1800000', 10),
} as const;

export const PERFORMANCE_CONFIG = {
  DEBOUNCE_DELAY: parseInt(import.meta.env.VITE_DEBOUNCE_DELAY || '300', 10),
} as const;

export const FEATURE_FLAGS = {
  AI_RECOGNITION: import.meta.env.VITE_ENABLE_AI_RECOGNITION === 'true',
  EXPORT: import.meta.env.VITE_ENABLE_EXPORT === 'true',
  NOTIFICATIONS: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
} as const;

export const DEBUG = {
  ENABLED: import.meta.env.VITE_DEBUG_MODE === 'true',
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',
} as const;
