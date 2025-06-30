/**
 * 用户控制器
 * 处理用户相关的HTTP请求（非管理员功能）
 */

const BaseController = require('./BaseController');
const { userService } = require('../services');
const UserWechatConfigService = require('../services/UserWechatConfigService');
const { getFieldConfig } = require('../config/fieldConfig');

class UserController extends BaseController {
  constructor() {
    super('UserController');
    this.wechatConfigService = new UserWechatConfigService();
    // 使用集中的字段配置
    this.allowedSortFields = getFieldConfig('user', 'sortFields');
    this.allowedFilterFields = getFieldConfig('user', 'filterFields');
  }

  /**
   * 用户注册
   * POST /api/auth/register
   */
  register = this.asyncHandler(async (req, res) => {
    const requiredFields = getFieldConfig('user', 'requiredFields');
    const userData = this.validateRequestBody(req, requiredFields);

    this.logOperation('user_register_request', req, {
      email: userData.email,
      name: userData.name
    });

    const result = await userService.registerUser(userData);
    
    this.sendSuccess(res, result.data, result.message, 201, result.meta);
  });

  /**
   * 用户登录
   * POST /api/auth/login
   */
  login = this.asyncHandler(async (req, res) => {
    const { email, password } = this.validateRequestBody(req, ['email', 'password']);

    this.logOperation('user_login_request', req, { email });

    const result = await userService.loginUser(email, password);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 供应商登录
   * POST /api/auth/login/provider
   */
  loginProvider = this.asyncHandler(async (req, res) => {
    const { accessKey } = this.validateRequestBody(req, ['accessKey']);

    this.logOperation('provider_login_request', req, { accessKey: accessKey.substring(0, 10) + '...' });

    const result = await userService.loginProvider(accessKey);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取当前用户信息
   * GET /api/auth/me
   */
  getCurrentUserInfo = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    this.logOperation('get_current_user_request', req, { userId: user.id });

    const result = await userService.getUserById(user.id);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 刷新token
   * POST /api/auth/refresh
   */
  refreshToken = this.asyncHandler(async (req, res) => {
    const { refreshToken } = this.validateRequestBody(req, ['refreshToken']);

    this.logOperation('refresh_token_request', req, { refreshToken: refreshToken.substring(0, 20) + '...' });

    const result = await userService.refreshTokenWithToken(refreshToken);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 用户登出
   * POST /api/auth/logout
   */
  logout = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    this.logOperation('logout_request', req, { userId: user.id });

    const result = await userService.logout(user.id);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 更新当前用户信息
   * PUT /api/auth/me
   */
  updateCurrentUser = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const updateData = this.validateRequestBody(req);

    // 验证至少有一个可更新的字段
    const allowedFields = ['name', 'email'];
    const hasValidField = allowedFields.some(field => updateData[field] !== undefined);
    
    if (!hasValidField) {
      return this.sendError(res, '请提供至少一个可更新的字段', 400, 'NO_UPDATE_FIELDS');
    }

    this.logOperation('update_current_user_request', req, {
      userId: user.id,
      updateFields: Object.keys(updateData)
    });

    const result = await userService.updateUser(user.id, updateData, user.role);
    
    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 更改密码
   * POST /api/auth/change-password
   */
  changePassword = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { currentPassword, newPassword } = this.validateRequestBody(req, ['currentPassword', 'newPassword']);

    this.logOperation('change_password_request', req, { userId: user.id });

    const result = await userService.changePassword(user.id, currentPassword, newPassword);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 检查密码状态
   * GET /api/auth/password-status
   */
  checkPasswordStatus = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    this.logOperation('check_password_status_request', req, { userId: user.id });

    const result = await userService.checkPasswordStatus(user.id);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 生成密码建议
   * GET /api/auth/password-suggestion
   */
  generatePasswordSuggestion = this.asyncHandler(async (req, res) => {
    const { length } = req.query;
    const passwordLength = length ? parseInt(length, 10) : 16;

    if (passwordLength < 12 || passwordLength > 128) {
      return this.sendError(res, '密码长度必须在12-128之间', 400, 'INVALID_LENGTH');
    }

    this.logOperation('generate_password_suggestion_request', req, { length: passwordLength });

    const result = await userService.generatePasswordSuggestion(passwordLength);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取用户个人资料
   * GET /api/users/profile
   */
  getProfile = this.getCurrentUserInfo;

  /**
   * 更新用户个人资料
   * PATCH /api/users/profile
   */
  updateProfile = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const updateData = this.validateRequestBody(req);

    // 验证至少有一个可更新的字段
    const allowedFields = ['name', 'email', 'phone'];
    const hasValidField = allowedFields.some(field => updateData[field] !== undefined);
    
    if (!hasValidField) {
      return this.sendError(res, '请提供至少一个可更新的字段', 400, 'NO_UPDATE_FIELDS');
    }

    this.logOperation('update_profile_request', req, {
      userId: user.id,
      updateFields: Object.keys(updateData)
    });

    const result = await userService.updateUser(user.id, updateData, user.role);
    
    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 管理员登录
   * POST /api/admin/login
   */
  adminLogin = this.asyncHandler(async (req, res) => {
    const { password } = this.validateRequestBody(req, ['password']);

    this.logOperation('admin_login_request', req, {
      ip: req.ip || req.connection.remoteAddress
    });

    const result = await userService.adminLogin(password);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 管理员登出
   * POST /api/admin/logout
   */
  adminLogout = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    this.logOperation('admin_logout_request', req, {
      adminId: user.id
    });

    const result = await userService.adminLogout(user.id);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 管理员修改密码
   * PUT /api/admin/password
   */
  adminChangePassword = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { currentPassword, newPassword } = this.validateRequestBody(req, ['currentPassword', 'newPassword']);

    this.logOperation('admin_change_password_request', req, {
      adminId: user.id
    });

    const result = await userService.adminChangePassword(user.id, currentPassword, newPassword);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取管理员统计信息
   * GET /api/admin/stats
   */
  getAdminStats = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    this.logOperation('get_admin_stats_request', req, {
      adminId: user.id
    });

    const result = await userService.getAdminStats();

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取用户微信配置
   * GET /api/users/:userId/wechat
   */
  getUserWechatConfig = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { userId } = this.validatePathParams(req, ['userId']);

    // 权限检查：只能查看自己的配置，除非是管理员
    if (user.role !== 'admin' && userId !== user.id) {
      return this.sendError(res, '无权查看其他用户的微信配置', 403, 'FORBIDDEN');
    }

    this.logOperation('get_user_wechat_config_request', req, {
      currentUserId: user.id,
      targetUserId: userId
    });

    const result = await this.wechatConfigService.getUserWechatConfig(userId);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 更新用户微信配置
   * PUT /api/users/:userId/wechat
   */
  updateUserWechatConfig = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { userId } = this.validatePathParams(req, ['userId']);
    const configData = this.validateRequestBody(req, []);

    // 权限检查：只能修改自己的配置，除非是管理员
    if (user.role !== 'admin' && userId !== user.id) {
      return this.sendError(res, '无权修改其他用户的微信配置', 403, 'FORBIDDEN');
    }

    this.logOperation('update_user_wechat_config_request', req, {
      currentUserId: user.id,
      targetUserId: userId,
      enabled: configData.enabled
    });

    const result = await this.wechatConfigService.updateUserWechatConfig(userId, configData);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 删除用户微信配置
   * DELETE /api/users/:userId/wechat
   */
  deleteUserWechatConfig = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { userId } = this.validatePathParams(req, ['userId']);

    // 权限检查：只能删除自己的配置，除非是管理员
    if (user.role !== 'admin' && userId !== user.id) {
      return this.sendError(res, '无权删除其他用户的微信配置', 403, 'FORBIDDEN');
    }

    this.logOperation('delete_user_wechat_config_request', req, {
      currentUserId: user.id,
      targetUserId: userId
    });

    const result = await this.wechatConfigService.deleteUserWechatConfig(userId);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 测试用户微信配置
   * POST /api/users/:userId/wechat/test
   */
  testUserWechatConfig = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { userId } = this.validatePathParams(req, ['userId']);

    // 权限检查：只能测试自己的配置，除非是管理员
    if (user.role !== 'admin' && userId !== user.id) {
      return this.sendError(res, '无权测试其他用户的微信配置', 403, 'FORBIDDEN');
    }

    this.logOperation('test_user_wechat_config_request', req, {
      currentUserId: user.id,
      targetUserId: userId
    });

    const result = await this.wechatConfigService.testWechatConfig(userId);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取用户列表（管理员功能）
   * GET /api/admin/users/list
   */
  getUserList = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    // 检查管理员权限
    if (user.role !== 'admin') {
      return this.sendError(res, '权限不足，只有管理员可以查看用户列表', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // 提取分页和过滤参数
    const pagination = this.extractPaginationParams(req);
    const filters = this.extractFilterParams(req, ['role', 'isActive', 'search']);
    const sorting = this.extractSortingParams(req, ['created_at', 'name', 'email']);

    const options = {
      ...pagination,
      ...filters,
      orderBy: sorting.length > 0 ? sorting : [{ column: 'created_at', direction: 'desc' }]
    };

    this.logOperation('get_user_list_request', req, {
      userId: user.id,
      options
    });

    const result = await userService.getUserList(user.role, options);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 根据ID获取用户信息（管理员功能）
   * GET /api/admin/users/:userId
   */
  getUserById = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { userId } = this.validatePathParams(req, ['userId']);

    // 检查管理员权限
    if (user.role !== 'admin') {
      return this.sendError(res, '权限不足，只有管理员可以查看用户详情', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    this.logOperation('get_user_by_id_request', req, {
      currentUserId: user.id,
      targetUserId: userId
    });

    const result = await userService.getUserById(userId);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 更新用户信息（管理员功能）
   * PUT /api/admin/users/:userId
   */
  updateUser = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { userId } = this.validatePathParams(req, ['userId']);

    // 检查管理员权限
    if (user.role !== 'admin') {
      return this.sendError(res, '权限不足，只有管理员可以更新用户信息', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // 提取可更新的字段
    const allowedFields = ['name', 'email', 'role', 'isActive'];
    const updateData = this.extractFields(req.body, allowedFields);

    if (Object.keys(updateData).length === 0) {
      return this.sendError(res, '请提供至少一个可更新的字段', 400, 'NO_UPDATE_FIELDS');
    }

    this.logOperation('update_user_request', req, {
      currentUserId: user.id,
      targetUserId: userId,
      updateFields: Object.keys(updateData)
    });

    const result = await userService.updateUser(userId, updateData, user.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 切换用户状态（管理员功能）
   * PATCH /api/admin/users/:userId/status
   */
  toggleUserStatus = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { userId } = this.validatePathParams(req, ['userId']);
    const { isActive } = req.body;

    // 检查管理员权限
    if (user.role !== 'admin') {
      return this.sendError(res, '权限不足，只有管理员可以修改用户状态', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // 验证isActive参数
    if (typeof isActive !== 'boolean') {
      return this.sendError(res, 'isActive必须是布尔值', 400, 'INVALID_PARAMETER');
    }

    this.logOperation('toggle_user_status_request', req, {
      currentUserId: user.id,
      targetUserId: userId,
      isActive
    });

    const result = await userService.setUserActive(userId, isActive, user.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 导出用户数据（管理员功能）
   * GET /api/admin/users/export
   */
  exportUsers = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    // 检查管理员权限
    if (user.role !== 'admin') {
      return this.sendError(res, '权限不足，只有管理员可以导出用户数据', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // 提取过滤参数
    const filters = this.extractFilterParams(req, ['role', 'isActive', 'startDate', 'endDate']);

    this.logOperation('export_users_request', req, {
      userId: user.id,
      filters
    });

    const result = await userService.exportUsers(filters);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });
}

module.exports = UserController;
