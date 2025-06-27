/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_DEV_PORT: string;
  readonly VITE_ENABLE_AI_RECOGNITION: string;
  readonly VITE_ENABLE_EXPORT: string;
  readonly VITE_ENABLE_NOTIFICATIONS: string;
  readonly VITE_DEBUG_MODE: string;
  readonly VITE_LOG_LEVEL: string;
}

// 扩展 ImportMeta 接口
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// 全局类型声明
declare global {
  const __DEV__: boolean;
}

export {};
