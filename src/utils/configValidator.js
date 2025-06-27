/**
 * 配置验证工具
 * 验证环境变量和配置的完整性和有效性
 */

const { logger } = require('../config/logger');

class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * 验证必需的环境变量
   * @param {Object} config - 配置对象
   * @returns {boolean} 验证是否通过
   */
  validateRequired(config) {
    const requiredFields = [
      { path: 'jwt.secret', name: 'JWT_SECRET' },
      { path: 'app.port', name: 'PORT' },
      { path: 'database.client', name: 'DB_CLIENT' },
    ];

    requiredFields.forEach(field => {
      const value = this.getNestedValue(config, field.path);
      if (!value) {
        this.errors.push(`必需的环境变量 ${field.name} 未设置`);
      }
    });

    return this.errors.length === 0;
  }

  /**
   * 验证JWT配置
   * @param {Object} jwtConfig - JWT配置
   */
  validateJWT(jwtConfig) {
    if (!jwtConfig.secret) {
      this.errors.push('JWT_SECRET 未设置');
      return;
    }

    if (jwtConfig.secret.length < 32) {
      this.warnings.push('JWT_SECRET 长度建议至少32位以提高安全性');
    }

    if (jwtConfig.secret.includes('dev-only') || jwtConfig.secret.includes('change-this')) {
      this.errors.push('JWT_SECRET 使用了默认值，生产环境必须更改');
    }

    // 验证过期时间格式
    if (!this.isValidTimeString(jwtConfig.expiresIn)) {
      this.errors.push('JWT_EXPIRES_IN 格式无效');
    }

    if (!this.isValidTimeString(jwtConfig.refreshExpiresIn)) {
      this.errors.push('JWT_REFRESH_EXPIRES_IN 格式无效');
    }
  }

  /**
   * 验证数据库配置
   * @param {Object} dbConfig - 数据库配置
   */
  validateDatabase(dbConfig) {
    const supportedClients = ['sqlite3', 'postgresql', 'mysql'];
    
    if (!supportedClients.includes(dbConfig.client)) {
      this.errors.push(`不支持的数据库类型: ${dbConfig.client}`);
    }

    if (dbConfig.client === 'sqlite3' && !dbConfig.filename) {
      this.errors.push('SQLite 数据库需要指定 DB_FILENAME');
    }

    if (dbConfig.client === 'postgresql') {
      const requiredFields = ['host', 'port', 'database', 'user', 'password'];
      requiredFields.forEach(field => {
        if (!dbConfig[field]) {
          this.warnings.push(`PostgreSQL 配置缺少 ${field.toUpperCase()}`);
        }
      });
    }
  }

  /**
   * 验证安全配置
   * @param {Object} securityConfig - 安全配置
   */
  validateSecurity(securityConfig) {
    if (securityConfig.bcryptRounds < 10) {
      this.warnings.push('BCRYPT_ROUNDS 建议至少设置为10');
    }

    if (securityConfig.bcryptRounds > 15) {
      this.warnings.push('BCRYPT_ROUNDS 过高可能影响性能');
    }

    if (securityConfig.rateLimitMaxRequests > 1000) {
      this.warnings.push('RATE_LIMIT_MAX_REQUESTS 设置过高可能影响安全性');
    }
  }

  /**
   * 验证生产环境配置
   * @param {Object} config - 完整配置
   */
  validateProduction(config) {
    if (config.app.env !== 'production') {
      return;
    }

    // 生产环境特殊检查
    if (config.logging.level === 'debug') {
      this.warnings.push('生产环境不建议使用 debug 日志级别');
    }

    if (!config.wechat.webhookUrl) {
      this.warnings.push('生产环境建议配置企业微信通知');
    }

    if (!config.backup.enabled) {
      this.warnings.push('生产环境建议启用数据备份');
    }
  }

  /**
   * 获取嵌套对象的值
   * @param {Object} obj - 对象
   * @param {string} path - 路径，如 'jwt.secret'
   * @returns {*} 值
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * 验证时间字符串格式
   * @param {string} timeStr - 时间字符串
   * @returns {boolean} 是否有效
   */
  isValidTimeString(timeStr) {
    const timeRegex = /^\d+[smhd]$/;
    return timeRegex.test(timeStr);
  }

  /**
   * 执行完整验证
   * @param {Object} config - 配置对象
   * @returns {Object} 验证结果
   */
  validate(config) {
    this.errors = [];
    this.warnings = [];

    this.validateRequired(config);
    this.validateJWT(config.jwt);
    this.validateDatabase(config.database);
    this.validateSecurity(config.security);
    this.validateProduction(config);

    const result = {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };

    // 记录验证结果
    if (result.errors.length > 0) {
      logger.error('配置验证失败', { errors: result.errors });
    }

    if (result.warnings.length > 0) {
      logger.warn('配置验证警告', { warnings: result.warnings });
    }

    if (result.isValid && result.warnings.length === 0) {
      logger.info('配置验证通过');
    }

    return result;
  }

  /**
   * 生成配置报告
   * @param {Object} config - 配置对象
   * @returns {string} 配置报告
   */
  generateReport(config) {
    const validation = this.validate(config);
    
    let report = '=== 配置验证报告 ===\n';
    report += `环境: ${config.app.env}\n`;
    report += `端口: ${config.app.port}\n`;
    report += `数据库: ${config.database.client}\n`;
    report += `日志级别: ${config.logging.level}\n\n`;

    if (validation.errors.length > 0) {
      report += '❌ 错误:\n';
      validation.errors.forEach(error => {
        report += `  - ${error}\n`;
      });
      report += '\n';
    }

    if (validation.warnings.length > 0) {
      report += '⚠️  警告:\n';
      validation.warnings.forEach(warning => {
        report += `  - ${warning}\n`;
      });
      report += '\n';
    }

    if (validation.isValid) {
      report += '✅ 配置验证通过\n';
    } else {
      report += '❌ 配置验证失败，请修复上述错误\n';
    }

    return report;
  }
}

module.exports = ConfigValidator;
