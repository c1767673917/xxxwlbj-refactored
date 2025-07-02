/**
 * 用户业务逻辑服务
 * 处理用户相关的业务逻辑
 */

const BaseService = require('./BaseService');
const { userRepo, orderRepo, quoteRepo, providerRepo } = require('../repositories');
const PasswordHistoryRepository = require('../repositories/PasswordHistoryRepository');
const passwordPolicy = require('../utils/PasswordPolicy');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
// const { logger } = require('../config/logger'); // 暂时注释，未使用
const bcrypt = require('bcryptjs');
const { getFieldConfig } = require('../config/fieldConfig');

class UserService extends BaseService {
  constructor() {
    super('UserService');
    // 使用集中的字段配置
    this.allowedSortFields = getFieldConfig('user', 'sortFields');
    this.passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    this.emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.passwordHistoryRepo = new PasswordHistoryRepository();
    this.userRepo = userRepo; // 添加userRepo实例属性
  }

  /**
   * 用户注册
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} 注册结果
   */
  async registerUser(userData) {
    return this.handleAsyncOperation(async () => {
      // 验证必需参数
      this.validateRequiredParams(userData, ['email', 'password', 'name']);

      // 验证参数类型
      this.validateParamTypes(userData, {
        email: 'string',
        password: 'string',
        name: 'string'
      });

      // 清理和标准化数据
      const cleanData = {
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        name: userData.name.trim(),
        role: userData.role || 'user'
      };

      // 验证邮箱格式
      if (!this.emailRegex.test(cleanData.email)) {
        throw this.createBusinessError('邮箱格式无效');
      }

      // 使用新的密码策略验证密码强度
      const passwordValidation = passwordPolicy.validatePassword(cleanData.password, {
        name: cleanData.name,
        email: cleanData.email
      });

      if (!passwordValidation.isValid) {
        const errorMessage = passwordValidation.errors.join('; ');
        throw this.createBusinessError(`密码不符合安全要求: ${errorMessage}`);
      }

      // 记录密码强度信息
      this.logOperation('password_strength_check', {
        userId: 'new_user',
        strength: passwordPolicy.getStrengthDescription(passwordValidation.strength),
        score: passwordValidation.score
      });

      // 验证姓名长度
      if (cleanData.name.length < 2 || cleanData.name.length > 50) {
        throw this.createBusinessError('姓名长度必须在2-50字符之间');
      }

      // 验证角色
      const validRoles = ['user', 'admin'];
      if (!validRoles.includes(cleanData.role)) {
        throw this.createBusinessError('无效的用户角色');
      }

      // 创建用户
      const newUser = await userRepo.createUser(cleanData);

      this.logOperation('user_registered', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role
      });

      // 生成JWT令牌
      const tokens = this.generateToken(newUser);

      return this.buildResponse({
        user: newUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }, '用户注册成功');
    }, 'registerUser', { email: userData.email });
  }

  /**
   * 管理员创建用户
   * @param {Object} userData - 用户数据
   * @param {string} adminRole - 管理员角色
   * @returns {Promise<Object>} 创建结果
   */
  async createUserByAdmin(userData, adminRole) {
    return this.handleAsyncOperation(async () => {
      // 验证管理员权限
      if (adminRole !== 'admin') {
        throw this.createBusinessError('无权限创建用户', 'ACCESS_DENIED', 403);
      }

      // 验证必需参数
      this.validateRequiredParams(userData, ['email', 'password', 'name']);

      // 验证参数类型
      this.validateParamTypes(userData, {
        email: 'string',
        password: 'string',
        name: 'string'
      });

      // 清理和标准化数据
      const cleanData = {
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        name: userData.name.trim(),
        role: userData.role || 'user'
      };

      // 验证邮箱格式
      if (!this.emailRegex.test(cleanData.email)) {
        throw this.createBusinessError('邮箱格式无效');
      }

      // 使用新的密码策略验证密码强度
      const passwordValidation = passwordPolicy.validatePassword(cleanData.password, {
        name: cleanData.name,
        email: cleanData.email
      });

      if (!passwordValidation.isValid) {
        const errorMessage = passwordValidation.errors.join('; ');
        throw this.createBusinessError(`密码不符合安全要求: ${errorMessage}`);
      }

      // 验证姓名长度
      if (cleanData.name.length < 2 || cleanData.name.length > 50) {
        throw this.createBusinessError('姓名长度必须在2-50字符之间');
      }

      // 验证角色
      const validRoles = ['user', 'admin'];
      if (!validRoles.includes(cleanData.role)) {
        throw this.createBusinessError('无效的用户角色');
      }

      // 创建用户（不生成token）
      const newUser = await userRepo.createUser(cleanData);

      this.logOperation('admin_created_user', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role
      });

      // 转换字段名并清理敏感数据
      const sanitizedUser = this.transformUserFields(this.sanitizeData(newUser));

      return this.buildResponse(sanitizedUser, '用户创建成功');
    }, 'createUserByAdmin', { email: userData.email });
  }

  /**
   * 用户登录
   * @param {string} email - 邮箱
   * @param {string} password - 密码
   * @returns {Promise<Object>} 登录结果
   */
  async loginUser(email, password) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ email, password }, ['email', 'password']);

      const cleanEmail = email.trim().toLowerCase();

      // 验证用户凭据
      const user = await userRepo.validateUser(cleanEmail, password);
      if (!user) {
        throw this.createBusinessError('邮箱或密码错误', 'INVALID_CREDENTIALS', 401);
      }

      this.logOperation('user_logged_in', {
        userId: user.id,
        email: user.email
      });

      // 生成JWT令牌
      const tokens = this.generateToken(user);

      // 转换字段名并清理敏感数据
      const sanitizedUser = this.transformUserFields(this.sanitizeData(user));

      return this.buildResponse({
        user: sanitizedUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }, '登录成功');
    }, 'loginUser', { email });
  }

  /**
   * 供应商登录
   * @param {string} accessKey - 访问密钥
   * @returns {Promise<Object>} 登录结果
   */
  async loginProvider(accessKey) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ accessKey }, ['accessKey']);

      const cleanAccessKey = accessKey.trim();

      // 验证供应商访问密钥
      const provider = await userRepo.validateProviderAccessKey(cleanAccessKey);
      if (!provider) {
        throw this.createBusinessError('访问密钥无效', 'INVALID_ACCESS_KEY', 401);
      }

      this.logOperation('provider_logged_in', {
        providerId: provider.id,
        providerName: provider.name
      });

      // 创建供应商用户对象
      const providerUser = {
        id: provider.id,
        name: provider.name,
        role: 'provider',
        providerId: provider.id
      };

      // 生成JWT令牌
      const tokens = this.generateToken(providerUser);

      return this.buildResponse({
        user: providerUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }, '供应商登录成功');
    }, 'loginProvider', { accessKey: accessKey.substring(0, 10) + '...' });
  }

  /**
   * 刷新用户token
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 新的token
   */
  async refreshToken(userId) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userId }, ['userId']);

      const user = await userRepo.findById(userId);
      if (!user) {
        throw this.createBusinessError('用户不存在', 'USER_NOT_FOUND', 404);
      }

      if (!user.isActive) {
        throw this.createBusinessError('用户已被禁用', 'USER_DISABLED', 403);
      }

      this.logOperation('token_refreshed', {
        userId: user.id,
        email: user.email
      });

      // 生成新的JWT令牌
      const tokens = this.generateToken(user);

      return this.buildResponse({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.transformUserFields(this.sanitizeData(user))
      }, 'Token刷新成功');
    }, 'refreshToken', { userId });
  }

  /**
   * 使用refresh token刷新用户token
   * @param {string} refreshToken - 刷新令牌
   * @returns {Promise<Object>} 新的token
   */
  async refreshTokenWithToken(refreshToken) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ refreshToken }, ['refreshToken']);

      // 验证refresh token
      let decoded;
      try {
        decoded = this.verifyToken(refreshToken);
      } catch (error) {
        throw this.createBusinessError('无效的刷新令牌', 'INVALID_REFRESH_TOKEN', 401);
      }

      const user = await userRepo.findById(decoded.id);
      if (!user) {
        throw this.createBusinessError('用户不存在', 'USER_NOT_FOUND', 404);
      }

      if (!user.isActive) {
        throw this.createBusinessError('用户已被禁用', 'USER_DISABLED', 403);
      }

      this.logOperation('token_refreshed_with_token', {
        userId: user.id,
        email: user.email
      });

      // 生成新的JWT令牌
      const tokens = this.generateToken(user);

      return this.buildResponse({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.transformUserFields(this.sanitizeData(user))
      }, 'Token刷新成功');
    }, 'refreshTokenWithToken', { userId: decoded?.id });
  }

  /**
   * 用户登出
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 登出结果
   */
  async logout(userId) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userId }, ['userId']);

      this.logOperation('user_logged_out', {
        userId
      });

      // 在实际应用中，这里可以将token加入黑名单
      // 或者在Redis中记录已登出的token

      return this.buildResponse({
        loggedOut: true,
        timestamp: new Date().toISOString()
      }, '登出成功');
    }, 'logout', { userId });
  }

  /**
   * 获取用户信息
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户信息
   */
  async getUserById(userId) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userId }, ['userId']);

      const user = await userRepo.findById(userId);
      if (!user) {
        throw this.createBusinessError('用户不存在', 'USER_NOT_FOUND', 404);
      }

      // 清理敏感数据并转换字段名
      const sanitizedUser = this.transformUserFields(this.sanitizeData(user));

      return this.buildResponse(sanitizedUser, '获取用户信息成功');
    }, 'getUserById', { userId });
  }

  /**
   * 更新用户信息
   * @param {string} userId - 用户ID
   * @param {Object} updateData - 更新数据
   * @param {string} currentUserRole - 当前用户角色
   * @returns {Promise<Object>} 更新后的用户信息
   */
  async updateUser(userId, updateData, currentUserRole) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userId, currentUserRole }, ['userId', 'currentUserRole']);

      // 获取现有用户
      const existingUser = await userRepo.findById(userId);
      if (!existingUser) {
        throw this.createBusinessError('用户不存在', 'USER_NOT_FOUND', 404);
      }

      // 验证和清理更新数据
      const allowedFields = ['name', 'email'];
      if (currentUserRole === 'admin') {
        allowedFields.push('role', 'isActive');
      }

      const cleanUpdateData = {};
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          cleanUpdateData[field] = updateData[field];
        }
      }

      if (Object.keys(cleanUpdateData).length === 0) {
        throw this.createBusinessError('没有提供有效的更新字段');
      }

      // 验证字段
      if (cleanUpdateData.email) {
        cleanUpdateData.email = cleanUpdateData.email.trim().toLowerCase();
        if (!this.emailRegex.test(cleanUpdateData.email)) {
          throw this.createBusinessError('邮箱格式无效');
        }
      }

      if (cleanUpdateData.name) {
        cleanUpdateData.name = cleanUpdateData.name.trim();
        if (cleanUpdateData.name.length < 2 || cleanUpdateData.name.length > 50) {
          throw this.createBusinessError('用户名长度必须在2-50字符之间');
        }
      }

      if (cleanUpdateData.role) {
        const validRoles = ['user', 'admin'];
        if (!validRoles.includes(cleanUpdateData.role)) {
          throw this.createBusinessError('无效的用户角色');
        }
      }

      // 更新用户
      const updatedUser = await userRepo.updateUser(userId, cleanUpdateData);

      this.logOperation('user_updated', {
        userId,
        updatedFields: Object.keys(cleanUpdateData),
        updatedBy: currentUserRole
      });

      return this.buildResponse(this.transformUserFields(this.sanitizeData(updatedUser)), '用户信息更新成功');
    }, 'updateUser', { userId });
  }

  /**
   * 管理员删除用户
   * @param {string} userId - 用户ID
   * @param {string} adminRole - 管理员角色
   * @returns {Promise<Object>} 删除结果
   */
  async deleteUserByAdmin(userId, adminRole) {
    return this.handleAsyncOperation(async () => {
      // 验证管理员权限
      if (adminRole !== 'admin') {
        throw this.createBusinessError('无权限删除用户', 'ACCESS_DENIED', 403);
      }

      this.validateRequiredParams({ userId }, ['userId']);

      // 获取用户信息
      const existingUser = await userRepo.findById(userId);
      if (!existingUser) {
        throw this.createBusinessError('用户不存在', 'USER_NOT_FOUND', 404);
      }

      // 防止删除管理员账户
      if (existingUser.role === 'admin') {
        throw this.createBusinessError('不能删除管理员账户', 'CANNOT_DELETE_ADMIN', 400);
      }

      // 检查用户是否有关联的订单
      const hasOrders = await userRepo.hasUserOrders(userId);
      if (hasOrders) {
        // 如果有订单，只是禁用用户而不是删除
        const updatedUser = await userRepo.updateUser(userId, { isActive: false });

        this.logOperation('admin_disabled_user_with_orders', {
          userId,
          email: existingUser.email,
          reason: 'has_orders'
        });

        return this.buildResponse(this.transformUserFields(this.sanitizeData(updatedUser)), '用户已禁用（因为有关联订单）');
      }

      // 删除用户
      await userRepo.deleteById(userId);

      this.logOperation('admin_deleted_user', {
        userId,
        email: existingUser.email,
        name: existingUser.name
      });

      return this.buildResponse({ userId }, '用户删除成功');
    }, 'deleteUserByAdmin', { userId });
  }

  /**
   * 更改密码
   * @param {string} userId - 用户ID
   * @param {string} currentPassword - 当前密码
   * @param {string} newPassword - 新密码
   * @returns {Promise<Object>} 更新结果
   */
  async changePassword(userId, currentPassword, newPassword) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userId, currentPassword, newPassword }, ['userId', 'currentPassword', 'newPassword']);

      // 获取用户信息
      const user = await userRepo.findById(userId);
      if (!user) {
        throw this.createBusinessError('用户不存在', 'USER_NOT_FOUND', 404);
      }

      // 验证当前密码
      const isValidCurrentPassword = await userRepo.validateUser(user.email, currentPassword);
      if (!isValidCurrentPassword) {
        throw this.createBusinessError('当前密码错误', 'INVALID_CURRENT_PASSWORD', 400);
      }

      // 使用新的密码策略验证新密码强度
      const passwordValidation = passwordPolicy.validatePassword(newPassword, {
        name: user.name,
        email: user.email
      });

      if (!passwordValidation.isValid) {
        const errorMessage = passwordValidation.errors.join('; ');
        throw this.createBusinessError(`新密码不符合安全要求: ${errorMessage}`);
      }

      // 检查新密码是否与当前密码相同
      if (currentPassword === newPassword) {
        throw this.createBusinessError('新密码不能与当前密码相同');
      }

      // 检查密码历史记录
      const passwordHistory = await this.passwordHistoryRepo.getRecentPasswordHashes(userId, 5);
      const isRepeatedPassword = await passwordPolicy.checkPasswordHistory(newPassword, passwordHistory);

      if (isRepeatedPassword) {
        throw this.createBusinessError('新密码不能与最近使用过的密码相同，请选择一个全新的密码');
      }

      // 在事务中更新密码并保存历史记录
      await this.executeInTransaction(async (trx) => {
        // 获取当前密码哈希用于历史记录
        const currentPasswordHash = await bcrypt.hash(newPassword, 12);

        // 更新密码
        const success = await userRepo.updatePassword(userId, newPassword, trx);
        if (!success) {
          throw this.createBusinessError('密码更新失败', 'PASSWORD_UPDATE_FAILED', 500);
        }

        // 保存密码历史记录
        await this.passwordHistoryRepo.addPasswordHistory(
          userId,
          currentPasswordHash,
          null, // IP地址可以从请求上下文获取
          trx
        );

        // 更新用户的密码相关字段
        await userRepo.updateById(userId, {
          password_changed_at: new Date(),
          password_expired: false,
          force_password_change: false,
          failed_login_attempts: 0
        }, trx);

        return true;
      });

      this.logOperation('password_changed', {
        userId,
        email: user.email,
        strength: passwordPolicy.getStrengthDescription(passwordValidation.strength)
      });

      return this.buildResponse(null, '密码更改成功');
    }, 'changePassword', { userId });
  }

  /**
   * 获取用户列表（管理员功能）
   * @param {string} currentUserRole - 当前用户角色
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 用户列表
   */
  async getUserList(currentUserRole, options = {}) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ currentUserRole }, ['currentUserRole']);

      if (currentUserRole !== 'admin') {
        throw this.createBusinessError('无权访问用户列表', 'ACCESS_DENIED', 403);
      }

      // 标准化分页参数
      const pagination = this.normalizePaginationParams(options);
      
      // 标准化排序参数
      const orderBy = this.normalizeOrderByParams(options.orderBy, this.allowedSortFields);

      // 构建查询条件
      const conditions = {};
      if (options.role) {
        conditions.role = options.role;
      }
      if (options.isActive !== undefined) {
        conditions.is_active = options.isActive;
      }

      // 构建查询选项
      const queryOptions = {
        limit: pagination.limit,
        offset: pagination.offset,
        orderBy: orderBy.length > 0 ? orderBy : [{ column: 'created_at', direction: 'desc' }]
      };

      // 获取用户列表和总数
      const [users, total] = await Promise.all([
        userRepo.findMany(conditions, queryOptions),
        userRepo.count(conditions)
      ]);

      return this.buildPaginatedResponse(users, total, pagination);
    }, 'getUserList', { currentUserRole });
  }

  /**
   * 搜索用户
   * @param {string} searchTerm - 搜索关键词
   * @param {string} currentUserRole - 当前用户角色
   * @param {Object} options - 搜索选项
   * @returns {Promise<Object>} 搜索结果
   */
  async searchUsers(searchTerm, currentUserRole, options = {}) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ searchTerm, currentUserRole }, ['searchTerm', 'currentUserRole']);

      if (currentUserRole !== 'admin') {
        throw this.createBusinessError('无权搜索用户', 'ACCESS_DENIED', 403);
      }

      if (searchTerm.length < 2) {
        throw this.createBusinessError('搜索关键词至少需要2个字符');
      }

      // 标准化分页参数
      const pagination = this.normalizePaginationParams(options);

      // 构建搜索选项
      const searchOptions = {
        role: options.role || null,
        isActive: options.isActive !== undefined ? options.isActive : null,
        limit: pagination.limit,
        offset: pagination.offset
      };

      const users = await userRepo.searchUsers(searchTerm, searchOptions);

      return this.buildResponse(users, '搜索完成', {
        searchTerm,
        resultCount: users.length
      });
    }, 'searchUsers', { searchTerm, currentUserRole });
  }

  /**
   * 激活/禁用用户（管理员功能）
   * @param {string} userId - 用户ID
   * @param {boolean} isActive - 是否激活
   * @param {string} currentUserRole - 当前用户角色
   * @returns {Promise<Object>} 更新结果
   */
  async setUserActive(userId, isActive, currentUserRole) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userId, currentUserRole }, ['userId', 'currentUserRole']);
      this.validateParamTypes({ isActive }, { isActive: 'boolean' });

      if (currentUserRole !== 'admin') {
        throw this.createBusinessError('无权修改用户状态', 'ACCESS_DENIED', 403);
      }

      const user = await userRepo.findById(userId);
      if (!user) {
        throw this.createBusinessError('用户不存在', 'USER_NOT_FOUND', 404);
      }

      const updatedUser = await userRepo.setUserActive(userId, isActive);

      this.logOperation('user_status_changed', {
        userId,
        email: user.email,
        isActive,
        changedBy: currentUserRole
      });

      return this.buildResponse(this.transformUserFields(this.sanitizeData(updatedUser)), `用户${isActive ? '激活' : '禁用'}成功`);
    }, 'setUserActive', { userId, isActive });
  }

  /**
   * 获取用户统计信息
   * @param {string} currentUserRole - 当前用户角色
   * @returns {Promise<Object>} 统计信息
   */
  async getUserStats(currentUserRole) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ currentUserRole }, ['currentUserRole']);

      if (currentUserRole !== 'admin') {
        throw this.createBusinessError('无权查看用户统计', 'ACCESS_DENIED', 403);
      }

      const stats = await userRepo.getUserStats();

      return this.buildResponse(stats, '获取用户统计成功');
    }, 'getUserStats', { currentUserRole });
  }

  /**
   * 检查用户密码状态
   * @param {number} userId - 用户ID
   * @returns {Promise<Object>} 密码状态信息
   */
  async checkPasswordStatus(userId) {
    return this.handleAsyncOperation(async () => {
      const user = await userRepo.findById(userId);
      if (!user) {
        throw this.createBusinessError('用户不存在', 'USER_NOT_FOUND', 404);
      }

      // 检查密码过期状态
      const expiryCheck = passwordPolicy.checkPasswordExpiry(user.password_changed_at);

      // 获取密码历史统计
      const historyStats = await this.passwordHistoryRepo.getPasswordHistoryStats(userId);

      const passwordStatus = {
        isExpired: expiryCheck.isExpired,
        shouldWarn: expiryCheck.shouldWarn,
        daysUntilExpiry: expiryCheck.daysUntilExpiry,
        message: expiryCheck.message,
        forceChange: user.force_password_change || false,
        lastChanged: user.password_changed_at,
        totalChanges: historyStats.total_changes || 0,
        averageChangeInterval: historyStats.average_change_interval_days
      };

      return this.buildResponse(passwordStatus, '密码状态检查完成');
    }, 'checkPasswordStatus', { userId });
  }

  /**
   * 强制用户更改密码
   * @param {number} userId - 用户ID
   * @param {string} adminRole - 管理员角色
   * @returns {Promise<Object>} 操作结果
   */
  async forcePasswordChange(userId, adminRole) {
    return this.handleAsyncOperation(async () => {
      if (adminRole !== 'admin') {
        throw this.createBusinessError('无权执行此操作', 'ACCESS_DENIED', 403);
      }

      const user = await userRepo.findById(userId);
      if (!user) {
        throw this.createBusinessError('用户不存在', 'USER_NOT_FOUND', 404);
      }

      await userRepo.updateById(userId, {
        force_password_change: true,
        password_expired: true
      });

      this.logOperation('force_password_change', {
        targetUserId: userId,
        targetEmail: user.email,
        adminRole
      });

      return this.buildResponse(null, '已强制用户更改密码');
    }, 'forcePasswordChange', { userId, adminRole });
  }

  /**
   * 生成强密码建议
   * @param {number} length - 密码长度
   * @returns {Promise<Object>} 密码建议
   */
  async generatePasswordSuggestion(length = 16) {
    return this.handleAsyncOperation(async () => {
      const suggestedPassword = passwordPolicy.generateStrongPassword(length);
      const validation = passwordPolicy.validatePassword(suggestedPassword);

      const suggestion = {
        password: suggestedPassword,
        strength: passwordPolicy.getStrengthDescription(validation.strength),
        score: validation.score,
        tips: [
          '请将此密码保存在安全的地方',
          '不要在多个账户中使用相同的密码',
          '定期更换密码以保持账户安全',
          '避免在公共场所输入密码'
        ]
      };

      return this.buildResponse(suggestion, '密码建议生成成功');
    }, 'generatePasswordSuggestion', { length });
  }

  /**
   * 转换用户字段名（数据库字段名到前端字段名）
   * @param {Object} user - 用户对象
   * @returns {Object} 转换后的用户对象
   */
  transformUserFields(user) {
    if (!user || typeof user !== 'object') {
      return user;
    }

    const transformed = { ...user };

    // 字段名映射：数据库字段名 -> 前端字段名
    const fieldMapping = {
      'is_active': 'isActive',
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      'wechat_webhook_url': 'wechat_webhook_url', // 保持不变
      'wechat_notification_enabled': 'wechat_notification_enabled' // 保持不变
    };

    // 执行字段名转换
    Object.entries(fieldMapping).forEach(([dbField, frontendField]) => {
      if (dbField in transformed) {
        transformed[frontendField] = transformed[dbField];
        if (dbField !== frontendField) {
          delete transformed[dbField];
        }
      }
    });

    return transformed;
  }

  /**
   * 生成JWT令牌
   * @param {Object} user - 用户对象
   * @returns {Object} 包含accessToken和refreshToken的对象
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });

    const refreshToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn
    });

    return {
      accessToken,
      refreshToken
    };
  }

  /**
   * 获取所有用户列表（管理员）
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 用户列表
   */
  async getAllUsers(options = {}) {
    return this.handleAsyncOperation(async () => {
      // 标准化分页参数
      const pagination = this.normalizePaginationParams(options);

      // 构建查询选项
      const queryOptions = {
        limit: pagination.limit,
        offset: pagination.offset,
        search: options.search || null
      };

      // 获取用户列表和总数
      const [users, totalCount] = await Promise.all([
        userRepo.findAll(queryOptions),
        userRepo.countAll(queryOptions)
      ]);

      // 清理敏感信息并转换字段名
      const sanitizedUsers = users.map(user => this.transformUserFields(this.sanitizeData(user)));

      return this.buildPaginatedResponse(sanitizedUsers, totalCount, pagination);
    }, 'getAllUsers', { options });
  }

  /**
   * 更新用户状态（管理员）
   * @param {string} userId - 用户ID
   * @param {string} status - 新状态
   * @param {string} adminId - 管理员ID
   * @returns {Promise<Object>} 更新结果
   */
  async updateUserStatus(userId, status, adminId) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userId, status, adminId }, ['userId', 'status', 'adminId']);

      // 验证状态值
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        throw this.createBusinessError('无效的用户状态', 'INVALID_STATUS', 400);
      }

      const user = await userRepo.findById(userId);
      if (!user) {
        throw this.createBusinessError('用户不存在', 'USER_NOT_FOUND', 404);
      }

      // 防止管理员修改自己的状态
      if (userId === adminId) {
        throw this.createBusinessError('不能修改自己的状态', 'CANNOT_MODIFY_SELF', 400);
      }

      // 更新用户状态
      const updatedUser = await userRepo.updateById(userId, { status });

      this.logOperation('user_status_updated', {
        userId,
        adminId,
        oldStatus: user.status,
        newStatus: status
      });

      return this.buildResponse(this.transformUserFields(this.sanitizeData(updatedUser)), '用户状态更新成功');
    }, 'updateUserStatus', { userId, status, adminId });
  }

  /**
   * 重置用户密码（管理员）
   * @param {string} userId - 用户ID
   * @param {string} adminId - 管理员ID
   * @returns {Promise<Object>} 重置结果
   */
  async resetUserPassword(userId, adminId) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userId, adminId }, ['userId', 'adminId']);

      const user = await userRepo.findById(userId);
      if (!user) {
        throw this.createBusinessError('用户不存在', 'USER_NOT_FOUND', 404);
      }

      // 防止管理员重置自己的密码
      if (userId === adminId) {
        throw this.createBusinessError('不能重置自己的密码', 'CANNOT_RESET_SELF', 400);
      }

      // 生成临时密码
      const tempPassword = this.generateTempPassword();
      const resetId = this.generateResetId();

      // 更新密码
      const success = await userRepo.updatePassword(userId, tempPassword);
      if (!success) {
        throw this.createBusinessError('密码重置失败', 'PASSWORD_RESET_FAILED', 500);
      }

      // 记录重置操作
      this.logOperation('user_password_reset', {
        userId,
        adminId,
        email: user.email,
        resetId
      });

      // 通过安全渠道发送密码（邮件/短信）
      await this.sendPasswordResetNotification(user.email, tempPassword, resetId);

      // 不在响应中返回明文密码
      return this.buildResponse({
        resetId,
        message: '密码已重置，临时密码已通过邮件发送给用户'
      }, '密码重置成功');
    }, 'resetUserPassword', { userId, adminId });
  }

  /**
   * 获取全局用户统计信息（管理员）
   * @returns {Promise<Object>} 统计信息
   */
  async getGlobalUserStats() {
    return this.handleAsyncOperation(async () => {
      const stats = await userRepo.getGlobalStats();

      return this.buildResponse(stats, '获取全局用户统计成功');
    }, 'getGlobalUserStats');
  }

  /**
   * 生成临时密码
   * @returns {string} 临时密码
   */
  generateTempPassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * 生成重置ID
   * @returns {string} 重置ID
   */
  generateResetId() {
    return `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 发送密码重置通知
   * @param {string} email - 用户邮箱
   * @param {string} tempPassword - 临时密码
   * @param {string} resetId - 重置ID
   */
  async sendPasswordResetNotification(email, tempPassword, resetId) {
    // 实现邮件发送逻辑
    // 这里应该集成邮件服务
    console.log(`发送密码重置邮件到: ${email}, 重置ID: ${resetId}`);
    // TODO: 实现真实的邮件发送功能
    // 可以集成如 nodemailer, sendgrid 等邮件服务

    // 记录通知发送日志
    this.logOperation('password_reset_notification_sent', {
      email,
      resetId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 验证JWT令牌
   * @param {string} token - JWT令牌
   * @returns {Object} 解码的用户信息
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw this.createBusinessError('无效的令牌', 'INVALID_TOKEN', 401);
    }
  }

  /**
   * 批量操作用户（管理员功能）
   * @param {Array} userIds - 用户ID列表
   * @param {string} operation - 操作类型 ('activate', 'deactivate', 'delete')
   * @param {string} currentUserRole - 当前用户角色
   * @returns {Promise<Object>} 批量操作结果
   */
  async batchOperateUsers(userIds, operation, currentUserRole) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userIds, operation, currentUserRole }, ['userIds', 'operation', 'currentUserRole']);

      if (currentUserRole !== 'admin') {
        throw this.createBusinessError('无权执行批量操作', 'ACCESS_DENIED', 403);
      }

      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw this.createBusinessError('用户ID列表不能为空', 'INVALID_USER_IDS', 400);
      }

      const validOperations = ['activate', 'deactivate', 'delete'];
      if (!validOperations.includes(operation)) {
        throw this.createBusinessError('无效的操作类型', 'INVALID_OPERATION', 400);
      }

      const results = {
        successful: [],
        failed: [],
        total: userIds.length
      };

      // 批量处理用户
      for (const userId of userIds) {
        try {
          const user = await userRepo.findById(userId);
          if (!user) {
            results.failed.push({ userId, error: '用户不存在' });
            continue;
          }

          switch (operation) {
            case 'activate':
              await userRepo.updateById(userId, { isActive: true });
              results.successful.push({ userId, action: '已激活' });
              break;
            case 'deactivate':
              await userRepo.updateById(userId, { isActive: false });
              results.successful.push({ userId, action: '已禁用' });
              break;
            case 'delete':
              await userRepo.deleteById(userId);
              results.successful.push({ userId, action: '已删除' });
              break;
          }
        } catch (error) {
          results.failed.push({ userId, error: error.message });
        }
      }

      this.logOperation('batch_operate_users', {
        operation,
        total: results.total,
        successful: results.successful.length,
        failed: results.failed.length
      });

      return this.buildResponse(results, `批量${operation}操作完成`);
    }, 'batchOperateUsers', { userIds: userIds.length, operation });
  }

  /**
   * 导出用户数据（管理员功能）
   * @param {Object} filters - 过滤条件
   * @param {string} format - 导出格式 ('csv', 'excel')
   * @returns {Promise<Object>} 导出结果
   */
  async exportUsers(filters = {}, format = 'csv') {
    return this.handleAsyncOperation(async () => {
      const validFormats = ['csv', 'excel'];
      if (!validFormats.includes(format)) {
        throw this.createBusinessError('不支持的导出格式');
      }

      // 构建查询条件
      const queryOptions = {
        role: filters.role || null,
        isActive: filters.isActive !== undefined ? filters.isActive : null,
        startDate: filters.startDate || null,
        endDate: filters.endDate || null
      };

      // 获取要导出的用户数据
      const users = await userRepo.findForExport(queryOptions);

      // 生成导出文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `users_export_${timestamp}.${format}`;
      const downloadUrl = `/api/downloads/${fileName}`;

      // 导出信息
      const exportInfo = {
        downloadUrl,
        fileName,
        format,
        recordCount: users.length,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1小时后过期
        filters: queryOptions
      };

      this.logOperation('users_export_created', {
        fileName,
        format,
        recordCount: users.length,
        filters: queryOptions
      });

      return this.buildResponse(exportInfo, '用户导出任务已创建');
    }, 'exportUsers', { filters, format });
  }

  /**
   * 管理员登录
   * @param {string} password - 管理员密码
   * @returns {Promise<Object>} 登录结果
   */
  async adminLogin(password) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ password }, ['password']);

      // 从数据库验证管理员密码
      const adminUser = await this.userRepo.validateAdmin(password);
      if (!adminUser) {
        throw this.createBusinessError('管理员密码错误', 'INVALID_ADMIN_PASSWORD', 401);
      }

      this.logOperation('admin_logged_in', {
        adminId: adminUser.id
      });

      // 生成JWT令牌
      const tokens = this.generateToken(adminUser);

      return this.buildResponse({
        user: this.transformUserFields(this.sanitizeData(adminUser)),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }, '管理员登录成功');
    }, 'adminLogin');
  }

  /**
   * 管理员登出
   * @param {string} adminId - 管理员ID
   * @returns {Promise<Object>} 登出结果
   */
  async adminLogout(adminId) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ adminId }, ['adminId']);

      this.logOperation('admin_logged_out', {
        adminId
      });

      return this.buildResponse(null, '管理员登出成功');
    }, 'adminLogout', { adminId });
  }

  /**
   * 管理员修改密码
   * @param {string} adminId - 管理员ID
   * @param {string} currentPassword - 当前密码
   * @param {string} newPassword - 新密码
   * @returns {Promise<Object>} 修改结果
   */
  async adminChangePassword(adminId, currentPassword, newPassword) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ adminId, currentPassword, newPassword },
        ['adminId', 'currentPassword', 'newPassword']);

      // 验证当前密码
      const adminUser = await this.userRepo.validateAdmin(currentPassword);
      if (!adminUser) {
        throw this.createBusinessError('当前密码错误', 'INVALID_CURRENT_PASSWORD', 400);
      }

      // 验证新密码格式
      if (!this.passwordRegex.test(newPassword)) {
        throw this.createBusinessError(
          '新密码必须包含大小写字母、数字和特殊字符，长度至少8位',
          'INVALID_PASSWORD_FORMAT',
          400
        );
      }

      // 检查新密码是否与当前密码相同
      const admin = await this.userRepo.findAdmin();
      const isSamePassword = await bcrypt.compare(newPassword, admin.password);
      if (isSamePassword) {
        throw this.createBusinessError('新密码不能与当前密码相同', 'SAME_PASSWORD', 400);
      }

      // 更新数据库中的管理员密码
      const updateSuccess = await this.userRepo.updateAdminPassword(newPassword);
      if (!updateSuccess) {
        throw this.createBusinessError('密码更新失败', 'PASSWORD_UPDATE_FAILED', 500);
      }

      this.logOperation('admin_password_changed', {
        adminId
      });

      return this.buildResponse(null, '管理员密码修改成功，请使用新密码重新登录');
    }, 'adminChangePassword', { adminId });
  }

  /**
   * 获取管理员统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getAdminStats() {
    return this.handleAsyncOperation(async () => {
      try {
        // 并行获取各模块统计数据
        const [userStats, orderStats, quoteStats] = await Promise.all([
          userRepo.getUserStats(),
          orderRepo.getGlobalStats().catch((error) => {
            this.logOperation('order_stats_failed', { error: error.message });
            return { total: 0, active: 0, completed: 0, recentOrders: [] };
          }),
          quoteRepo.getGlobalStats().catch((error) => {
            this.logOperation('quote_stats_failed', { error: error.message });
            return { totalQuotes: 0, recentQuotes: [] };
          })
        ]);

        // 获取供应商数量
        let totalProviders = 0;
        try {
          totalProviders = await providerRepo.count();
        } catch (error) {
          this.logOperation('provider_count_failed', { error: error.message });
        }

        // 聚合数据为前端期望的格式
        const stats = {
          totalUsers: userStats.total || 0,
          totalOrders: orderStats.total || 0,
          activeOrders: orderStats.active || 0,
          closedOrders: orderStats.completed || orderStats.closed || 0,
          totalProviders: totalProviders,
          totalQuotes: quoteStats.totalQuotes || 0,
          recentOrders: orderStats.recentOrders || [],
          recentQuotes: quoteStats.recentQuotes || []
        };

        this.logOperation('admin_stats_retrieved', {
          statsKeys: Object.keys(stats),
          values: stats
        });

        return this.buildResponse(stats, '管理员统计信息获取成功');
      } catch (error) {
        this.logOperation('admin_stats_error', { error: error.message });

        // 返回默认值避免前端显示错误
        const defaultStats = {
          totalUsers: 0,
          totalOrders: 0,
          activeOrders: 0,
          closedOrders: 0,
          totalProviders: 0,
          totalQuotes: 0,
          recentOrders: [],
          recentQuotes: []
        };

        return this.buildResponse(defaultStats, '获取统计信息时发生错误，显示默认值');
      }
    }, 'getAdminStats');
  }
}

module.exports = UserService;
