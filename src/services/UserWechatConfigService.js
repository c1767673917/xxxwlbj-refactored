/**
 * 用户微信配置业务逻辑服务
 * 处理用户微信配置相关的业务逻辑
 */

const BaseService = require('./BaseService');
const UserWechatConfigRepository = require('../repositories/UserWechatConfigRepository');
const { userRepo } = require('../repositories');

class UserWechatConfigService extends BaseService {
  constructor() {
    super('UserWechatConfigService');
    this.wechatConfigRepo = new UserWechatConfigRepository();
  }

  /**
   * 获取用户微信配置
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 微信配置
   */
  async getUserWechatConfig(userId) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userId }, ['userId']);

      // 验证用户是否存在（管理员用户特殊处理）
      if (userId !== 'admin') {
        const user = await userRepo.findById(userId);
        if (!user) {
          throw this.createBusinessError('用户不存在', 'USER_NOT_FOUND', 404);
        }
      }

      let config = await this.wechatConfigRepo.findByUserId(userId);
      
      // 如果配置不存在，返回默认配置
      if (!config) {
        config = {
          userId,
          enabled: false,
          webhookUrl: null,
          webhook: null,
          secret: null,
          notifications: {
            orderCreated: true,
            quoteReceived: true,
            quoteSelected: true,
            orderCompleted: true
          },
          notifyOrderCreated: true,
          notifyQuoteReceived: true,
          notifyQuoteSelected: true,
          notifyOrderCompleted: true
        };
      }

      this.logOperation('user_wechat_config_retrieved', {
        userId,
        enabled: config.enabled
      });

      return this.buildResponse(config, '用户微信配置获取成功');
    }, 'getUserWechatConfig', { userId });
  }

  /**
   * 更新用户微信配置
   * @param {string} userId - 用户ID
   * @param {Object} configData - 配置数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateUserWechatConfig(userId, configData) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userId }, ['userId']);

      // 验证用户是否存在（管理员用户特殊处理）
      if (userId !== 'admin') {
        const user = await userRepo.findById(userId);
        if (!user) {
          throw this.createBusinessError('用户不存在', 'USER_NOT_FOUND', 404);
        }
      }

      // 验证配置数据
      this.validateWechatConfig(configData);

      // 更新配置
      const updatedConfig = await this.wechatConfigRepo.upsertByUserId(userId, configData);

      this.logOperation('user_wechat_config_updated', {
        userId,
        enabled: updatedConfig.enabled,
        hasWebhook: Boolean(updatedConfig.webhookUrl)
      });

      return this.buildResponse(updatedConfig, '用户微信配置更新成功');
    }, 'updateUserWechatConfig', { userId });
  }

  /**
   * 删除用户微信配置
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteUserWechatConfig(userId) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userId }, ['userId']);

      // 验证用户是否存在（管理员用户特殊处理）
      if (userId !== 'admin') {
        const user = await userRepo.findById(userId);
        if (!user) {
          throw this.createBusinessError('用户不存在', 'USER_NOT_FOUND', 404);
        }
      }

      const deleted = await this.wechatConfigRepo.deleteByUserId(userId);

      this.logOperation('user_wechat_config_deleted', {
        userId,
        deleted
      });

      return this.buildResponse({ deleted }, deleted ? '用户微信配置删除成功' : '用户微信配置不存在');
    }, 'deleteUserWechatConfig', { userId });
  }

  /**
   * 测试微信配置
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 测试结果
   */
  async testWechatConfig(userId) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userId }, ['userId']);

      const config = await this.wechatConfigRepo.findByUserId(userId);
      if (!config || !config.enabled || !config.webhookUrl) {
        throw this.createBusinessError('微信配置未启用或缺少Webhook URL', 'INVALID_WECHAT_CONFIG', 400);
      }

      // 发送测试消息
      const testMessage = {
        msgtype: 'text',
        text: {
          content: `🧪 微信通知测试\n\n用户: ${userId}\n时间: ${new Date().toLocaleString('zh-CN')}\n\n如果您收到此消息，说明微信通知配置正常！`
        }
      };

      try {
        const response = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testMessage)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.errcode && result.errcode !== 0) {
          throw new Error(`微信API错误: ${result.errmsg} (code: ${result.errcode})`);
        }

        this.logOperation('wechat_config_test_success', {
          userId,
          webhookUrl: config.webhookUrl
        });

        return this.buildResponse({
          success: true,
          message: '测试消息发送成功',
          response: result
        }, '微信配置测试成功');

      } catch (error) {
        this.logOperation('wechat_config_test_failed', {
          userId,
          webhookUrl: config.webhookUrl,
          error: error.message
        });

        throw this.createBusinessError(
          `微信配置测试失败: ${error.message}`,
          'WECHAT_TEST_FAILED',
          400
        );
      }
    }, 'testWechatConfig', { userId });
  }

  /**
   * 获取启用微信通知的用户配置
   * @param {string} notificationType - 通知类型（可选）
   * @returns {Promise<Object>} 启用的配置列表
   */
  async getEnabledWechatConfigs(notificationType = null) {
    return this.handleAsyncOperation(async () => {
      let configs;
      
      if (notificationType) {
        configs = await this.wechatConfigRepo.findEnabledConfigsByNotificationType(notificationType);
      } else {
        configs = await this.wechatConfigRepo.findEnabledConfigs();
      }

      this.logOperation('enabled_wechat_configs_retrieved', {
        notificationType,
        count: configs.length
      });

      return this.buildResponse(configs, '启用的微信配置获取成功');
    }, 'getEnabledWechatConfigs', { notificationType });
  }

  /**
   * 获取微信配置统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getWechatConfigStats() {
    return this.handleAsyncOperation(async () => {
      const stats = await this.wechatConfigRepo.getConfigStats();

      this.logOperation('wechat_config_stats_retrieved', {
        totalConfigs: stats.total,
        enabledConfigs: stats.enabled
      });

      return this.buildResponse(stats, '微信配置统计信息获取成功');
    }, 'getWechatConfigStats');
  }

  /**
   * 验证微信配置数据
   * @param {Object} configData - 配置数据
   */
  validateWechatConfig(configData) {
    // 如果启用了微信通知，必须提供webhook URL
    if (configData.enabled && !configData.webhookUrl && !configData.webhook) {
      throw this.createBusinessError('启用微信通知时必须提供Webhook URL', 'WEBHOOK_URL_REQUIRED', 400);
    }

    // 验证webhook URL格式
    const webhookUrl = configData.webhookUrl || configData.webhook;
    if (webhookUrl) {
      try {
        new URL(webhookUrl);
      } catch (error) {
        throw this.createBusinessError('Webhook URL格式无效', 'INVALID_WEBHOOK_URL', 400);
      }

      // 验证是否是微信webhook URL
      if (!webhookUrl.includes('qyapi.weixin.qq.com')) {
        throw this.createBusinessError('请提供有效的企业微信Webhook URL', 'INVALID_WECHAT_WEBHOOK', 400);
      }
    }

    // 验证密钥长度
    if (configData.secret && configData.secret.length > 255) {
      throw this.createBusinessError('密钥长度不能超过255个字符', 'SECRET_TOO_LONG', 400);
    }
  }

  /**
   * 批量更新用户微信配置
   * @param {Array} updates - 更新数组，每个元素包含userId和configData
   * @returns {Promise<Object>} 批量更新结果
   */
  async batchUpdateWechatConfigs(updates) {
    return this.handleAsyncOperation(async () => {
      if (!Array.isArray(updates) || updates.length === 0) {
        throw this.createBusinessError('更新数组不能为空', 'EMPTY_UPDATES', 400);
      }

      const results = [];
      const errors = [];

      for (const update of updates) {
        try {
          const { userId, configData } = update;
          const result = await this.updateUserWechatConfig(userId, configData);
          results.push({
            userId,
            success: true,
            data: result.data
          });
        } catch (error) {
          errors.push({
            userId: update.userId,
            success: false,
            error: error.message
          });
        }
      }

      this.logOperation('batch_wechat_configs_updated', {
        totalUpdates: updates.length,
        successCount: results.length,
        errorCount: errors.length
      });

      return this.buildResponse({
        results,
        errors,
        summary: {
          total: updates.length,
          success: results.length,
          failed: errors.length
        }
      }, `批量更新完成，成功 ${results.length} 个，失败 ${errors.length} 个`);
    }, 'batchUpdateWechatConfigs', { count: updates.length });
  }
}

module.exports = UserWechatConfigService;
