/**
 * 管理员用户控制器
 * 处理管理员对用户的管理操作
 */

const BaseController = require('../BaseController');
const { userService } = require('../../services');
const { getFieldConfig } = require('../../config/fieldConfig');

class AdminUserController extends BaseController {
  constructor() {
    super('AdminUserController');
    // 使用集中的字段配置
    this.allowedSortFields = getFieldConfig('user', 'sortFields');
    this.allowedFilterFields = getFieldConfig('user', 'filterFields');
  }

  /**
   * 获取用户列表（管理员功能）
   * GET /api/users/admin/list
   */
  getUserList = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    // 提取查询参数
    const pagination = this.extractPaginationParams(req);
    const orderBy = this.extractSortParams(req, this.allowedSortFields);
    const filters = this.extractFilterParams(req, this.allowedFilterFields);

    const options = {
      ...pagination,
      orderBy,
      ...filters
    };

    this.logOperation('admin_get_user_list_request', req, {
      adminId: user.id,
      options
    });

    const result = await userService.getUserList(options, user.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 根据ID获取用户信息（管理员功能）
   * GET /api/users/admin/:userId
   */
  getUserById = this.asyncHandler(async (req, res) => {
    const currentUser = this.getCurrentUser(req);
    const { userId } = this.validatePathParams(req, ['userId']);

    this.logOperation('admin_get_user_by_id_request', req, {
      adminId: currentUser.id,
      targetUserId: userId
    });

    const result = await userService.getUserById(userId);
    
    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 更新用户信息（管理员功能）
   * PUT /api/users/admin/:userId
   */
  updateUser = this.asyncHandler(async (req, res) => {
    const currentUser = this.getCurrentUser(req);
    const { userId } = this.validatePathParams(req, ['userId']);
    const updateData = this.validateRequestBody(req);

    // 验证至少有一个可更新的字段
    const allowedFields = getFieldConfig('user', 'updateFields', 'admin');
    const hasValidField = allowedFields.some(field => updateData[field] !== undefined);
    
    if (!hasValidField) {
      return this.sendError(res, '请提供至少一个可更新的字段', 400, 'NO_UPDATE_FIELDS');
    }

    this.logOperation('admin_update_user_request', req, {
      adminId: currentUser.id,
      targetUserId: userId,
      updateFields: Object.keys(updateData)
    });

    const result = await userService.updateUser(userId, updateData, currentUser.role);
    
    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 激活/禁用用户（管理员功能）
   * POST /api/users/admin/:userId/toggle-status
   */
  toggleUserStatus = this.asyncHandler(async (req, res) => {
    const currentUser = this.getCurrentUser(req);
    const { userId } = this.validatePathParams(req, ['userId']);
    const { isActive } = this.validateRequestBody(req, ['isActive']);

    if (typeof isActive !== 'boolean') {
      return this.sendError(res, 'isActive 必须是布尔值', 400, 'INVALID_BOOLEAN');
    }

    this.logOperation('admin_toggle_user_status_request', req, {
      adminId: currentUser.id,
      targetUserId: userId,
      isActive
    });

    const result = await userService.setUserActive(userId, isActive, currentUser.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取所有用户列表（管理员）
   * GET /api/users/admin/all
   */
  getAllUsers = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    // 提取查询参数
    const pagination = this.extractPaginationParams(req);
    const search = req.query.search;

    const options = {
      ...pagination,
      search
    };

    this.logOperation('admin_get_all_users_request', req, {
      adminId: user.id,
      options
    });

    const result = await userService.getAllUsers(options);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 重置用户密码（管理员功能）
   * POST /api/users/admin/:userId/reset-password
   */
  resetUserPassword = this.asyncHandler(async (req, res) => {
    const currentUser = this.getCurrentUser(req);
    const { userId } = this.validatePathParams(req, ['userId']);

    this.logOperation('admin_reset_user_password_request', req, {
      adminId: currentUser.id,
      targetUserId: userId
    });

    const result = await userService.resetUserPassword(userId, currentUser.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 批量操作用户（管理员功能）
   * POST /api/users/admin/batch
   */
  batchOperateUsers = this.asyncHandler(async (req, res) => {
    const currentUser = this.getCurrentUser(req);
    const { userIds, operation } = this.validateRequestBody(req, ['userIds', 'operation']);

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return this.sendError(res, '用户ID列表不能为空', 400, 'INVALID_USER_IDS');
    }

    const validOperations = ['activate', 'deactivate', 'delete'];
    if (!validOperations.includes(operation)) {
      return this.sendError(res, '无效的操作类型', 400, 'INVALID_OPERATION');
    }

    this.logOperation('admin_batch_operate_users_request', req, {
      adminId: currentUser.id,
      userIds,
      operation
    });

    const result = await userService.batchOperateUsers(userIds, operation, currentUser.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 导出用户数据（管理员功能）
   * GET /api/users/admin/export
   */
  exportUsers = this.asyncHandler(async (req, res) => {
    const currentUser = this.getCurrentUser(req);

    // 提取过滤参数
    const exportFilterFields = getFieldConfig('user', 'exportFilterFields');
    const filters = this.extractFilterParams(req, exportFilterFields);
    const format = req.query.format || 'csv';

    this.logOperation('admin_export_users_request', req, {
      adminId: currentUser.id,
      filters,
      format
    });

    const result = await userService.exportUsers(filters, format);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取用户统计信息（管理员）
   * GET /api/users/admin/stats
   */
  getUserStats = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    this.logOperation('admin_get_user_stats_request', req, {
      adminId: user.id
    });

    const result = await userService.getUserStats();

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取全局用户统计信息（管理员）
   * GET /api/users/admin/global-stats
   */
  getGlobalUserStats = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    this.logOperation('admin_get_global_user_stats_request', req, {
      adminId: user.id
    });

    const result = await userService.getGlobalUserStats();

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });
}

module.exports = AdminUserController;
