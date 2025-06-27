require('dotenv').config();

// 测试环境默认配置
if (process.env.NODE_ENV === 'test') {
  // 为测试环境设置默认值
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  }
  if (!process.env.LOG_LEVEL) {
    process.env.LOG_LEVEL = 'error';
  }
}

const config = {
  // 应用配置
  app: {
    name: process.env.APP_NAME || 'wlbj-refactored',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || '0.0.0.0',
  },

  // 数据库配置
  database: {
    client: process.env.DB_CLIENT || 'sqlite3',
    filename: process.env.DB_FILENAME || './data/logistics.db',
  },

  // JWT配置
  jwt: {
    get secret() {
      if (process.env.JWT_SECRET) {
        return process.env.JWT_SECRET;
      }

      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production environment');
      }

      console.warn('⚠️  Using development JWT secret. Set JWT_SECRET in production!');
      return process.env.JWT_SECRET || 'dev-only-secret-fixed-key-for-development';
    },
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // 安全配置
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15分钟
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },

  // 企业微信配置
  wechat: {
    webhookUrl: process.env.WECHAT_WEBHOOK_URL,
  },

  // 文件上传配置
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10485760, // 10MB
    allowedTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'application/pdf',
    ],
  },

  // 缓存配置
  cache: {
    ttl: parseInt(process.env.CACHE_TTL, 10) || 300, // 5分钟
    maxSize: parseInt(process.env.CACHE_MAX_SIZE, 10) || 1000,
  },

  // 监控配置
  monitoring: {
    enabled: process.env.ENABLE_METRICS === 'true',
    port: parseInt(process.env.METRICS_PORT, 10) || 9090,
  },

  // 备份配置
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    interval: parseInt(process.env.BACKUP_INTERVAL, 10) || 86400000, // 24小时
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 30,
  },
};

// 开发环境特殊配置
if (config.app.env === 'development') {
  config.logging.level = 'debug';
}

// 生产环境特殊配置
if (config.app.env === 'production') {
  config.security.rateLimitMaxRequests = 50; // 生产环境更严格的限制
}

// 配置验证函数
config.validate = () => {
  const errors = [];

  // JWT密钥安全验证
  if (config.jwt.secret.includes('default') || config.jwt.secret.includes('change')) {
    errors.push('JWT_SECRET contains default values, must be changed');
  }
  if (config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  // 生产环境必需配置验证
  if (config.app.env === 'production') {
    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET environment variable is required in production');
    }
  }

  if (errors.length > 0) {
    throw new Error('Configuration validation failed:\n' + errors.join('\n'));
  }

  return true;
};

// 开发环境和生产环境都进行基本验证
if (config.app.env !== 'test') {
  try {
    config.validate();
  } catch (error) {
    console.error('❌ Configuration Error:', error.message);
    if (config.app.env === 'production') {
      process.exit(1);
    }
  }
}

module.exports = config;
