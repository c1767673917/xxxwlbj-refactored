const knex = require('knex');
const knexConfig = require('../../knexfile');
const logger = require('./logger');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

// 创建数据库连接
const db = knex(config);

// 数据库连接测试
async function testConnection() {
  try {
    await db.raw('SELECT 1');
    logger.info('数据库连接成功', { environment });
    return true;
  } catch (error) {
    logger.error('数据库连接失败', { error: error.message, environment });
    throw error;
  }
}

// 优雅关闭数据库连接
async function closeConnection() {
  try {
    await db.destroy();
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接失败', { error: error.message });
    throw error;
  }
}

// 事务管理器
class TransactionManager {
  async executeTransaction(callback) {
    const trx = await db.transaction();
    
    try {
      const result = await callback(trx);
      await trx.commit();
      return result;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async executeWithRetry(callback, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeTransaction(callback);
      } catch (error) {
        lastError = error;

        // 检查是否应该重试
        if (this.shouldRetry(error) && attempt < maxRetries) {
          const delay = this.calculateRetryDelay(error, attempt);

          logger.warn('事务执行失败，准备重试', {
            error: error.message,
            code: error.code,
            attempt: attempt,
            maxRetries: maxRetries,
            delay: delay
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * 判断错误是否应该重试
   * @param {Error} error - 错误对象
   * @returns {boolean} 是否应该重试
   */
  shouldRetry(error) {
    if (!error.code) return false;

    // SQLite特定的可重试错误
    const retryableCodes = [
      'SQLITE_BUSY',      // 数据库忙碌
      'SQLITE_LOCKED',    // 数据库锁定
      'SQLITE_PROTOCOL',  // 协议错误
      'SQLITE_SCHEMA'     // 模式变更
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * 计算重试延迟时间
   * @param {Error} error - 错误对象
   * @param {number} attempt - 当前尝试次数
   * @returns {number} 延迟时间（毫秒）
   */
  calculateRetryDelay(error, attempt) {
    let baseDelay = 100; // 基础延迟100ms

    // 根据错误类型调整基础延迟
    switch (error.code) {
      case 'SQLITE_BUSY':
        baseDelay = 200;
        break;
      case 'SQLITE_LOCKED':
        baseDelay = 500;
        break;
      case 'SQLITE_PROTOCOL':
        baseDelay = 300;
        break;
      case 'SQLITE_SCHEMA':
        baseDelay = 1000;
        break;
    }

    // 指数退避算法，但限制最大延迟
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 100; // 添加随机抖动避免雷群效应

    return Math.min(exponentialDelay + jitter, 5000); // 最大延迟5秒
  }
}

const transactionManager = new TransactionManager();

module.exports = {
  db,
  testConnection,
  closeConnection,
  transactionManager,
};
