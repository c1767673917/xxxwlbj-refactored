/**
 * 管理员系统配置控制器
 * 处理管理员对系统配置的管理操作
 */

const BaseController = require('../BaseController');
const { systemConfigService } = require('../../services');

class AdminSystemConfigController extends BaseController {
  constructor() {
    super('AdminSystemConfigController');
  }

  /**
   * 获取系统配置
   * GET /api/admin/system-config
   */
  getSystemConfig = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { configKey } = req.query;

    this.logOperation('admin_get_system_config_request', req, {
      adminId: user.id,
      configKey: configKey || 'all'
    });

    const result = await systemConfigService.getSystemConfig(configKey);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 更新系统配置
   * PUT /api/admin/system-config
   */
  updateSystemConfig = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const configData = this.validateRequestBody(req);

    // 验证至少有一个配置字段
    const allowedFields = [
      'siteName', 'sessionTimeout', 'maxFileSize', 'allowedFileTypes',
      'enableRegistration', 'enableEmailNotification', 'enableWechatNotification'
    ];
    
    const hasValidField = allowedFields.some(field => configData[field] !== undefined);
    
    if (!hasValidField) {
      return this.sendError(res, '请提供至少一个可更新的配置字段', 400, 'NO_UPDATE_FIELDS');
    }

    this.logOperation('admin_update_system_config_request', req, {
      adminId: user.id,
      updateFields: Object.keys(configData).filter(key => allowedFields.includes(key))
    });

    const result = await systemConfigService.updateSystemConfig(configData);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 重置配置为默认值
   * POST /api/admin/system-config/reset
   */
  resetConfigToDefault = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { configKey } = this.validateRequestBody(req, ['configKey']);

    this.logOperation('admin_reset_config_request', req, {
      adminId: user.id,
      configKey
    });

    const result = await systemConfigService.resetConfigToDefault(configKey);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 初始化默认配置
   * POST /api/admin/system-config/initialize
   */
  initializeDefaultConfigs = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    this.logOperation('admin_initialize_default_configs_request', req, {
      adminId: user.id
    });

    const result = await systemConfigService.initializeDefaultConfigs();

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取特定类型的配置
   * GET /api/admin/system-config/type/:configType
   */
  getConfigsByType = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { configType } = this.validatePathParams(req, ['configType']);

    // 验证配置类型
    const allowedTypes = ['system', 'user', 'notification', 'security', 'file'];
    if (!allowedTypes.includes(configType)) {
      return this.sendError(res, '无效的配置类型', 400, 'INVALID_CONFIG_TYPE');
    }

    this.logOperation('admin_get_configs_by_type_request', req, {
      adminId: user.id,
      configType
    });

    const result = await systemConfigService.getConfigsByType(configType);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 验证系统配置（不保存，仅验证）
   * POST /api/admin/system-config/validate
   */
  validateSystemConfig = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const configData = this.validateRequestBody(req);

    this.logOperation('admin_validate_system_config_request', req, {
      adminId: user.id,
      configFields: Object.keys(configData)
    });

    try {
      // 使用服务层的验证方法
      systemConfigService.validateSystemConfig(configData);
      
      this.sendSuccess(res, null, '配置验证通过', 200);
    } catch (error) {
      // 如果是业务错误，返回验证失败信息
      if (error.code && error.statusCode) {
        return this.sendError(res, error.message, error.statusCode, error.code);
      }
      throw error;
    }
  });

  /**
   * 获取配置历史（如果需要的话，暂时返回空）
   * GET /api/admin/system-config/history
   */
  getConfigHistory = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const pagination = this.extractPaginationParams(req);

    this.logOperation('admin_get_config_history_request', req, {
      adminId: user.id,
      pagination
    });

    // 暂时返回空历史，后续可以实现配置变更历史功能
    const result = {
      data: [],
      message: '配置历史功能暂未实现'
    };

    this.sendSuccess(res, result.data, result.message, 200, {
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: 0,
        totalPages: 0
      }
    });
  });
}

module.exports = AdminSystemConfigController;
