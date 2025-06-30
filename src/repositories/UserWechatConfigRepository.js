/**
 * 用户微信配置数据访问层
 * 处理用户微信配置相关的数据库操作
 */

const BaseRepository = require('./BaseRepository');
const { logger } = require('../config/logger');

class UserWechatConfigRepository extends BaseRepository {
  constructor() {
    super('user_wechat_configs', 'id', ['created_at', 'updated_at']);
  }

  /**
   * 根据用户ID查找微信配置
   * @param {string} userId - 用户ID
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object|null>} 微信配置或null
   */
  async findByUserId(userId, trx = null) {
    try {
      let query = this.db(this.tableName)
        .where('user_id', userId)
        .first();

      if (trx) {
        query = query.transacting(trx);
      }

      const config = await query;
      
      if (config) {
        logger.debug('用户微信配置查找成功', {
          userId,
          configId: config.id
        });
        return this.transformWechatConfig(config);
      }

      return null;
    } catch (error) {
      logger.error('根据用户ID查找微信配置失败', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 创建或更新用户微信配置
   * @param {string} userId - 用户ID
   * @param {Object} configData - 配置数据
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object>} 创建或更新的配置
   */
  async upsertByUserId(userId, configData, trx = null) {
    try {
      // 先查找是否存在配置
      const existingConfig = await this.findByUserId(userId, trx);

      const dbConfigData = {
        enabled: configData.enabled || false,
        webhook_url: configData.webhookUrl || configData.webhook || null,
        secret: configData.secret || null,
        notify_order_created: configData.notifyOrderCreated !== undefined ? configData.notifyOrderCreated : true,
        notify_quote_received: configData.notifyQuoteReceived !== undefined ? configData.notifyQuoteReceived : true,
        notify_quote_selected: configData.notifyQuoteSelected !== undefined ? configData.notifyQuoteSelected : true,
        notify_order_completed: configData.notifyOrderCompleted !== undefined ? configData.notifyOrderCompleted : true
      };

      let result;

      if (existingConfig) {
        // 更新现有配置
        result = await this.updateById(existingConfig.id, dbConfigData, trx);
        logger.info('用户微信配置更新成功', {
          userId,
          configId: existingConfig.id
        });
      } else {
        // 创建新配置
        const newConfigData = {
          id: require('uuid').v4(),
          user_id: userId,
          ...dbConfigData
        };
        
        result = await this.create(newConfigData, trx);
        logger.info('用户微信配置创建成功', {
          userId,
          configId: result.id
        });
      }

      return this.transformWechatConfig(result);
    } catch (error) {
      logger.error('创建或更新用户微信配置失败', {
        userId,
        configData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 删除用户微信配置
   * @param {string} userId - 用户ID
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteByUserId(userId, trx = null) {
    try {
      let query = this.db(this.tableName)
        .where('user_id', userId);

      if (trx) {
        query = query.transacting(trx);
      }

      const deletedCount = await query.del();
      const success = deletedCount > 0;

      if (success) {
        logger.info('用户微信配置删除成功', { userId });
      } else {
        logger.warn('用户微信配置不存在，无需删除', { userId });
      }

      return success;
    } catch (error) {
      logger.error('删除用户微信配置失败', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取启用微信通知的用户配置
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Array>} 启用微信通知的用户配置列表
   */
  async findEnabledConfigs(trx = null) {
    try {
      let query = this.db(this.tableName)
        .where('enabled', true)
        .whereNotNull('webhook_url');

      if (trx) {
        query = query.transacting(trx);
      }

      const configs = await query;
      const transformedConfigs = configs.map(config => this.transformWechatConfig(config));

      logger.debug('获取启用微信通知的用户配置成功', {
        count: transformedConfigs.length
      });

      return transformedConfigs;
    } catch (error) {
      logger.error('获取启用微信通知的用户配置失败', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 根据通知类型获取启用的用户配置
   * @param {string} notificationType - 通知类型
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Array>} 启用指定通知类型的用户配置列表
   */
  async findEnabledConfigsByNotificationType(notificationType, trx = null) {
    try {
      const notificationFields = {
        'order_created': 'notify_order_created',
        'quote_received': 'notify_quote_received',
        'quote_selected': 'notify_quote_selected',
        'order_completed': 'notify_order_completed'
      };

      const fieldName = notificationFields[notificationType];
      if (!fieldName) {
        throw new Error(`不支持的通知类型: ${notificationType}`);
      }

      let query = this.db(this.tableName)
        .where('enabled', true)
        .where(fieldName, true)
        .whereNotNull('webhook_url');

      if (trx) {
        query = query.transacting(trx);
      }

      const configs = await query;
      const transformedConfigs = configs.map(config => this.transformWechatConfig(config));

      logger.debug('根据通知类型获取启用的用户配置成功', {
        notificationType,
        count: transformedConfigs.length
      });

      return transformedConfigs;
    } catch (error) {
      logger.error('根据通知类型获取启用的用户配置失败', {
        notificationType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 转换微信配置数据格式
   * @param {Object} config - 数据库配置记录
   * @returns {Object} 转换后的配置
   */
  transformWechatConfig(config) {
    if (!config) return null;

    return {
      id: config.id,
      userId: config.user_id,
      enabled: Boolean(config.enabled),
      webhookUrl: config.webhook_url,
      webhook: config.webhook_url, // 兼容前端字段名
      secret: config.secret,
      notifications: {
        orderCreated: Boolean(config.notify_order_created),
        quoteReceived: Boolean(config.notify_quote_received),
        quoteSelected: Boolean(config.notify_quote_selected),
        orderCompleted: Boolean(config.notify_order_completed)
      },
      // 兼容前端字段名
      notifyOrderCreated: Boolean(config.notify_order_created),
      notifyQuoteReceived: Boolean(config.notify_quote_received),
      notifyQuoteSelected: Boolean(config.notify_quote_selected),
      notifyOrderCompleted: Boolean(config.notify_order_completed),
      createdAt: config.created_at,
      updatedAt: config.updated_at
    };
  }

  /**
   * 获取微信配置统计信息
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object>} 统计信息
   */
  async getConfigStats(trx = null) {
    try {
      let query = this.db(this.tableName);

      if (trx) {
        query = query.transacting(trx);
      }

      // 获取总配置数
      const totalConfigs = await query.clone().count('id as count').first();
      
      // 获取启用的配置数
      const enabledConfigs = await query.clone()
        .where('enabled', true)
        .count('id as count')
        .first();

      // 获取有效的配置数（启用且有webhook URL）
      const validConfigs = await query.clone()
        .where('enabled', true)
        .whereNotNull('webhook_url')
        .count('id as count')
        .first();

      const stats = {
        total: parseInt(totalConfigs.count),
        enabled: parseInt(enabledConfigs.count),
        valid: parseInt(validConfigs.count),
        disabled: parseInt(totalConfigs.count) - parseInt(enabledConfigs.count),
        lastUpdated: new Date().toISOString()
      };

      logger.info('微信配置统计信息获取成功', { stats });
      return stats;
    } catch (error) {
      logger.error('获取微信配置统计信息失败', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = UserWechatConfigRepository;
