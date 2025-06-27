/**
 * 用户控制器
 * 处理用户相关的HTTP请求（非管理员功能）
 */

const BaseController = require('./BaseController');
const { userService } = require('../services');
const { getFieldConfig } = require('../config/fieldConfig');

class UserController extends BaseController {
  constructor() {
    super('UserController');
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










}

module.exports = UserController;
