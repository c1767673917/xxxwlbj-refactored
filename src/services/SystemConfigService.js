/**
 * 系统配置服务
 * 处理系统配置的业务逻辑
 */

const BaseService = require('./BaseService');
const { systemConfigRepo } = require('../repositories');
const { SystemConfigRepository } = require('../repositories');

class SystemConfigService extends BaseService {
  constructor() {
    super('SystemConfigService');
    this.systemConfigRepo = systemConfigRepo;
  }

  /**
   * 获取系统配置
   * @param {string} configKey - 配置键（可选）
   * @returns {Promise<Object>} 配置数据
   */
  async getSystemConfig(configKey = null) {
    return this.handleAsyncOperation(async () => {
      if (configKey) {
        // 获取特定配置
        const config = await this.systemConfigRepo.findByKey(configKey);
        if (!config) {
          throw this.createBusinessError(`配置 ${configKey} 不存在`, 'CONFIG_NOT_FOUND', 404);
        }
        return {
          data: config.configValue,
          message: '获取配置成功'
        };
      } else {
        // 获取所有配置
        const allConfigs = await this.systemConfigRepo.getAllEnabled();
        
        // 合并所有配置为一个对象
        const mergedConfig = {};
        Object.values(allConfigs).forEach(config => {
          if (typeof config === 'object' && config !== null) {
            Object.assign(mergedConfig, config);
          }
        });

        return {
          data: mergedConfig,
          message: '获取系统配置成功'
        };
      }
    });
  }

  /**
   * 更新系统配置
   * @param {Object} configData - 配置数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateSystemConfig(configData) {
    return this.handleAsyncOperation(async () => {
      // 验证配置数据
      this.validateSystemConfig(configData);

      // 分类配置数据
      const basicConfig = this.extractBasicConfig(configData);
      const featuresConfig = this.extractFeaturesConfig(configData);

      // 更新配置
      const updatedConfigs = [];

      if (Object.keys(basicConfig).length > 0) {
        const config = await this.systemConfigRepo.upsertByKey(
          'SYSTEM_BASIC',
          basicConfig,
          {
            description: '系统基本配置',
            configType: 'system'
          }
        );
        updatedConfigs.push(config);
      }

      if (Object.keys(featuresConfig).length > 0) {
        const config = await this.systemConfigRepo.upsertByKey(
          'SYSTEM_FEATURES',
          featuresConfig,
          {
            description: '系统功能开关配置',
            configType: 'system'
          }
        );
        updatedConfigs.push(config);
      }

      this.logOperation('system_config_updated', {
        updatedKeys: updatedConfigs.map(c => c.configKey),
        basicConfigKeys: Object.keys(basicConfig),
        featuresConfigKeys: Object.keys(featuresConfig)
      });

      return {
        data: updatedConfigs,
        message: '系统配置更新成功'
      };
    });
  }

  /**
   * 初始化默认配置
   * @returns {Promise<Object>} 初始化结果
   */
  async initializeDefaultConfigs() {
    return this.handleAsyncOperation(async () => {
      await this.systemConfigRepo.initializeDefaults();

      this.logOperation('default_configs_initialized', {
        timestamp: new Date().toISOString()
      });

      return {
        data: null,
        message: '默认配置初始化成功'
      };
    });
  }

  /**
   * 验证系统配置数据
   * @param {Object} configData - 配置数据
   */
  validateSystemConfig(configData) {
    this.validateRequiredParams({ configData }, ['configData']);

    if (typeof configData !== 'object' || configData === null) {
      throw this.createBusinessError('配置数据必须是对象', 'INVALID_CONFIG_DATA', 400);
    }

    // 验证站点名称
    if (configData.siteName !== undefined) {
      if (typeof configData.siteName !== 'string' || configData.siteName.trim().length === 0) {
        throw this.createBusinessError('站点名称不能为空', 'INVALID_SITE_NAME', 400);
      }
      if (configData.siteName.length > 100) {
        throw this.createBusinessError('站点名称长度不能超过100个字符', 'SITE_NAME_TOO_LONG', 400);
      }
    }

    // 验证会话超时时间
    if (configData.sessionTimeout !== undefined) {
      const timeout = parseInt(configData.sessionTimeout);
      if (isNaN(timeout) || timeout < 5 || timeout > 120) {
        throw this.createBusinessError('会话超时时间必须在5-120分钟之间', 'INVALID_SESSION_TIMEOUT', 400);
      }
    }

    // 验证最大文件大小
    if (configData.maxFileSize !== undefined) {
      const fileSize = parseInt(configData.maxFileSize);
      if (isNaN(fileSize) || fileSize < 1 || fileSize > 100) {
        throw this.createBusinessError('最大文件大小必须在1-100MB之间', 'INVALID_MAX_FILE_SIZE', 400);
      }
    }

    // 验证允许的文件类型
    if (configData.allowedFileTypes !== undefined) {
      if (typeof configData.allowedFileTypes !== 'string' || configData.allowedFileTypes.trim().length === 0) {
        throw this.createBusinessError('允许的文件类型不能为空', 'INVALID_ALLOWED_FILE_TYPES', 400);
      }
    }

    // 验证布尔值配置
    const booleanFields = ['enableRegistration', 'enableEmailNotification', 'enableWechatNotification'];
    booleanFields.forEach(field => {
      if (configData[field] !== undefined && typeof configData[field] !== 'boolean') {
        throw this.createBusinessError(`${field} 必须是布尔值`, 'INVALID_BOOLEAN_CONFIG', 400);
      }
    });
  }

  /**
   * 提取基本配置
   * @param {Object} configData - 配置数据
   * @returns {Object} 基本配置
   */
  extractBasicConfig(configData) {
    const basicFields = ['siteName', 'sessionTimeout', 'maxFileSize', 'allowedFileTypes'];
    const basicConfig = {};

    basicFields.forEach(field => {
      if (configData[field] !== undefined) {
        basicConfig[field] = configData[field];
      }
    });

    return basicConfig;
  }

  /**
   * 提取功能配置
   * @param {Object} configData - 配置数据
   * @returns {Object} 功能配置
   */
  extractFeaturesConfig(configData) {
    const featureFields = ['enableRegistration', 'enableEmailNotification', 'enableWechatNotification'];
    const featuresConfig = {};

    featureFields.forEach(field => {
      if (configData[field] !== undefined) {
        featuresConfig[field] = configData[field];
      }
    });

    return featuresConfig;
  }

  /**
   * 获取特定类型的配置
   * @param {string} configType - 配置类型
   * @returns {Promise<Object>} 配置列表
   */
  async getConfigsByType(configType) {
    return this.handleAsyncOperation(async () => {
      const configs = await this.systemConfigRepo.findByType(configType);

      return {
        data: configs,
        message: `获取${configType}类型配置成功`
      };
    });
  }

  /**
   * 重置配置为默认值
   * @param {string} configKey - 配置键
   * @returns {Promise<Object>} 重置结果
   */
  async resetConfigToDefault(configKey) {
    return this.handleAsyncOperation(async () => {
      const defaultValue = SystemConfigRepository.DEFAULT_CONFIGS[configKey];
      if (!defaultValue) {
        throw this.createBusinessError(`默认配置 ${configKey} 不存在`, 'DEFAULT_CONFIG_NOT_FOUND', 404);
      }

      const config = await this.systemConfigRepo.upsertByKey(
        configKey,
        defaultValue,
        {
          description: `${configKey} 默认配置`,
          configType: 'system'
        }
      );

      this.logOperation('config_reset_to_default', {
        configKey,
        timestamp: new Date().toISOString()
      });

      return {
        data: config,
        message: '配置已重置为默认值'
      };
    });
  }
}

module.exports = SystemConfigService;
