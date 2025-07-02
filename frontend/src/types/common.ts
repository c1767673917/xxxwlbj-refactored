// 通用类型定义

import { ReactNode } from 'react';

// 基础类型
export type ID = string | number;

export type Status = 'idle' | 'loading' | 'success' | 'error';

export type Theme = 'light' | 'dark' | 'auto';

export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

// 用户角色类型
export type UserRole = 'admin' | 'user' | 'provider';

// 订单状态类型
export type OrderStatus = 'active' | 'completed' | 'cancelled' | 'placeholder';

// 分页信息类型
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// 排序信息类型
export interface SortInfo {
  field: string;
  order: 'asc' | 'desc';
}

// 筛选信息类型
export interface FilterInfo {
  field: string;
  value: unknown;
  operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'nin';
}

// 表格列定义类型
export interface TableColumn<T = unknown> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, record: T, index: number) => ReactNode;
}

// 表单字段类型
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string | number }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
}

// 菜单项类型
export interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  path?: string;
  children?: MenuItem[];
  disabled?: boolean;
  hidden?: boolean;
  roles?: UserRole[];
}

// 面包屑项类型
export interface BreadcrumbItem {
  title: string;
  path?: string;
}

// 通知类型
export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  closable?: boolean;
  timestamp: Date;
}

// 模态框配置类型
export interface ModalConfig {
  title: string;
  content: ReactNode;
  width?: number | string;
  closable?: boolean;
  maskClosable?: boolean;
  footer?: ReactNode;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
}

// 确认对话框配置类型
export interface ConfirmConfig {
  title: string;
  content?: ReactNode;
  okText?: string;
  cancelText?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
}

// 文件信息类型
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  url?: string;
}

// 上传文件状态类型
export interface UploadFileStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  response?: unknown;
  error?: string;
}

// 搜索配置类型
export interface SearchConfig {
  placeholder?: string;
  allowClear?: boolean;
  onSearch?: (value: string) => void;
  onClear?: () => void;
}

// 操作按钮类型
export interface ActionButton {
  key: string;
  label: string;
  icon?: ReactNode;
  type?: Variant;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void | Promise<void>;
}

// 统计卡片类型
export interface StatCard {
  title: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
  trend?: {
    value: number;
    type: 'up' | 'down';
  };
}

// 图表数据类型
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

// 时间范围类型
export interface TimeRange {
  start: Date;
  end: Date;
}

// 地址信息类型
export interface Address {
  province?: string;
  city?: string;
  district?: string;
  street?: string;
  detail?: string;
  postalCode?: string;
}

// 联系信息类型
export interface ContactInfo {
  name?: string;
  phone?: string;
  email?: string;
  address?: Address;
}

// 错误边界状态类型
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: {
    componentStack: string;
  };
}

// 路由守卫类型
export interface RouteGuard {
  path: string;
  roles?: UserRole[];
  redirect?: string;
  beforeEnter?: () => boolean | Promise<boolean>;
}

// 应用配置类型
export interface AppConfig {
  name: string;
  version: string;
  description?: string;
  logo?: string;
  theme: Theme;
  language: string;
  features: {
    [key: string]: boolean;
  };
}

// 用户偏好设置类型
export interface UserPreferences {
  theme: Theme;
  language: string;
  pageSize: number;
  notifications: {
    email: boolean;
    push: boolean;
    wechat: boolean;
  };
}

// 系统状态类型
export interface SystemStatus {
  online: boolean;
  lastUpdate: Date;
  version: string;
  environment: 'development' | 'staging' | 'production';
}

// 键值对类型
export type KeyValuePair<T = string> = {
  [key: string]: T;
};

// 深度可选类型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 深度必需类型
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// 选择性必需类型
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// 选择性可选类型
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// 函数类型
export type AsyncFunction<T = void> = () => Promise<T>;
export type EventHandler<T = Event> = (event: T) => void;
export type ValueChangeHandler<T> = (value: T) => void;
