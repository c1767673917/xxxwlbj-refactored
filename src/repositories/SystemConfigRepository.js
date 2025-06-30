/**
 * 系统配置仓库
 * 处理系统配置的数据库操作
 */

const BaseRepository = require('./BaseRepository');

class SystemConfigRepository extends BaseRepository {
  constructor() {
    super('system_configs', 'id', ['is_enabled']);
  }

  // 定义默认配置
  static get DEFAULT_CONFIGS() {
    return {
      // 系统基本配置
      SYSTEM_BASIC: {
        siteName: '物流报价平台',
        sessionTimeout: 15, // 分钟
        maxFileSize: 10, // MB
        allowedFileTypes: 'jpg,jpeg,png,pdf,doc,docx,xls,xlsx',
      },

      // 功能开关配置
      SYSTEM_FEATURES: {
        enableRegistration: false,
        enableEmailNotification: true,
        enableWechatNotification: true,
      },

      // 安全配置
      SYSTEM_SECURITY: {
        passwordMinLength: 6,
        passwordRequireSpecialChar: false,
        loginMaxAttempts: 5,
        loginLockoutDuration: 15, // 分钟
      },
    };
  }

  /**
   * 根据配置键获取配置
   * @param {string} configKey - 配置键
   * @returns {Promise<Object|null>} 配置对象
   */
  async findByKey(configKey) {
    try {
      const config = await this.query()
        .where({
          config_key: configKey,
          is_enabled: true
        })
        .first();

      if (!config) {
        return null;
      }

      // 解析JSON配置值
      let configValue;
      try {
        configValue = JSON.parse(config.config_value);
      } catch (error) {
        console.error('配置解析错误:', { configKey, error: error.message });
        configValue = config.config_value;
      }

      return {
        id: config.id,
        configKey: config.config_key,
        configValue: configValue,
        description: config.description,
        configType: config.config_type,
        isEnabled: Boolean(config.is_enabled),
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      };
    } catch (error) {
      console.error('查找配置失败:', { configKey, error: error.message });
      throw error;
    }
  }

  /**
   * 根据配置类型获取配置列表
   * @param {string} configType - 配置类型
   * @returns {Promise<Array>} 配置列表
   */
  async findByType(configType) {
    try {
      const configs = await this.query()
        .where({
          config_type: configType,
          is_enabled: true
        })
        .orderBy('config_key', 'asc');

      return configs.map(config => {
        // 解析JSON配置值
        let configValue;
        try {
          configValue = JSON.parse(config.config_value);
        } catch (error) {
          console.error('配置解析错误:', {
            configKey: config.config_key,
            error: error.message
          });
          configValue = config.config_value;
        }

        return {
          id: config.id,
          configKey: config.config_key,
          configValue: configValue,
          description: config.description,
          configType: config.config_type,
          isEnabled: Boolean(config.is_enabled),
          createdAt: config.created_at,
          updatedAt: config.updated_at,
        };
      });
    } catch (error) {
      console.error('查找配置类型失败:', { configType, error: error.message });
      throw error;
    }
  }

  /**
   * 创建或更新配置
   * @param {string} configKey - 配置键
   * @param {*} configValue - 配置值
   * @param {Object} options - 其他选项
   * @returns {Promise<Object>} 配置对象
   */
  async upsertByKey(configKey, configValue, options = {}) {
    try {
      const {
        description = null,
        configType = 'system',
        isEnabled = true
      } = options;

      // 序列化配置值
      let serializedValue;
      try {
        serializedValue = JSON.stringify(configValue);
      } catch (error) {
        console.error('配置序列化错误:', { configKey, error: error.message });
        serializedValue = String(configValue);
      }

      const now = new Date().toISOString();

      // 检查配置是否已存在
      const existingConfig = await this.query()
        .where({ config_key: configKey })
        .first();

      let config;
      let created = false;

      if (existingConfig) {
        // 更新现有配置
        await this.query()
          .where({ config_key: configKey })
          .update({
            config_value: serializedValue,
            description,
            config_type: configType,
            is_enabled: isEnabled ? 1 : 0,
            updated_at: now
          });

        config = await this.findByKey(configKey);
      } else {
        // 创建新配置
        await this.query()
          .insert({
            config_key: configKey,
            config_value: serializedValue,
            description,
            config_type: configType,
            is_enabled: isEnabled ? 1 : 0,
            created_at: now,
            updated_at: now
          });

        config = await this.findByKey(configKey);
        created = true;
      }

      console.log(created ? '配置已创建:' : '配置已更新:', {
        configKey,
        configType,
        hasValue: Boolean(configValue)
      });

      return config;
    } catch (error) {
      console.error('配置upsert失败:', { configKey, error: error.message });
      throw error;
    }
  }

  /**
   * 批量创建或更新配置
   * @param {Array} configs - 配置数组
   * @returns {Promise<Array>} 配置列表
   */
  async batchUpsert(configs) {
    try {
      const results = [];
      
      for (const config of configs) {
        const result = await this.upsertByKey(
          config.configKey,
          config.configValue,
          {
            description: config.description,
            configType: config.configType,
            isEnabled: config.isEnabled
          }
        );
        results.push(result);
      }

      console.log('批量配置已更新:', {
        count: configs.length,
        keys: configs.map(c => c.configKey)
      });

      return results;
    } catch (error) {
      console.error('批量配置更新失败:', { error: error.message });
      throw error;
    }
  }

  /**
   * 删除配置（软删除 - 设置为禁用）
   * @param {string} configKey - 配置键
   * @returns {Promise<boolean>} 是否成功
   */
  async softDeleteByKey(configKey) {
    try {
      const affectedRows = await this.query()
        .where({ config_key: configKey })
        .update({
          is_enabled: 0,
          updated_at: new Date().toISOString()
        });

      const success = affectedRows > 0;

      if (success) {
        console.log('配置已软删除:', { configKey });
      }

      return success;
    } catch (error) {
      console.error('配置软删除失败:', { configKey, error: error.message });
      throw error;
    }
  }

  /**
   * 获取所有启用的配置
   * @returns {Promise<Object>} 配置对象（键值对形式）
   */
  async getAllEnabled() {
    try {
      const configs = await this.query()
        .where({ is_enabled: true })
        .orderBy('config_key', 'asc');

      const result = {};
      configs.forEach(config => {
        // 解析JSON配置值
        let configValue;
        try {
          configValue = JSON.parse(config.config_value);
        } catch (error) {
          console.error('配置解析错误:', {
            configKey: config.config_key,
            error: error.message
          });
          configValue = config.config_value;
        }

        result[config.config_key] = configValue;
      });

      return result;
    } catch (error) {
      console.error('获取所有配置失败:', { error: error.message });
      throw error;
    }
  }

  /**
   * 初始化默认配置
   * @returns {Promise<void>}
   */
  async initializeDefaults() {
    try {
      const defaultConfigs = [
        {
          configKey: 'SYSTEM_BASIC',
          configValue: SystemConfigRepository.DEFAULT_CONFIGS.SYSTEM_BASIC,
          description: '系统基本配置',
          configType: 'system'
        },
        {
          configKey: 'SYSTEM_FEATURES',
          configValue: SystemConfigRepository.DEFAULT_CONFIGS.SYSTEM_FEATURES,
          description: '系统功能开关配置',
          configType: 'system'
        },
        {
          configKey: 'SYSTEM_SECURITY',
          configValue: SystemConfigRepository.DEFAULT_CONFIGS.SYSTEM_SECURITY,
          description: '系统安全配置',
          configType: 'security'
        }
      ];

      await this.batchUpsert(defaultConfigs);

      console.log('默认配置已初始化:', {
        count: defaultConfigs.length
      });
    } catch (error) {
      console.error('初始化默认配置失败:', { error: error.message });
      throw error;
    }
  }
}

module.exports = SystemConfigRepository;
