/**
 * 用户数据访问层
 * 处理用户相关的数据库操作
 */

const BaseRepository = require('./BaseRepository');
const { logger } = require('../config/logger');
const bcrypt = require('bcryptjs');

class UserRepository extends BaseRepository {
  constructor() {
    // 指定用户表的布尔字段
    super('users', 'id', ['is_active']);
  }

  /**
   * 根据邮箱查找用户
   * @param {string} email - 用户邮箱
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object|null>} 用户对象或null
   */
  async findByEmail(email, trx = null) {
    try {
      return await this.findOne({ email: email.toLowerCase() }, trx);
    } catch (error) {
      logger.error('根据邮箱查找用户失败', {
        email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 创建用户
   * @param {Object} userData - 用户数据
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object>} 创建的用户对象
   */
  async createUser(userData, trx = null) {
    try {
      const { email, password, name, role = 'user' } = userData;

      // 检查邮箱是否已存在
      const existingUser = await this.findByEmail(email, trx);
      if (existingUser) {
        throw new Error('邮箱已被注册');
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 12);

      const newUser = {
        id: this.generateUserId(),
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role,
        is_active: true
      };

      const createdUser = await this.create(newUser, trx);
      
      // 返回用户信息时不包含密码
      const { password: _password, ...userWithoutPassword } = createdUser;
      return userWithoutPassword;
    } catch (error) {
      logger.error('创建用户失败', {
        email: userData.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 验证用户密码
   * @param {string} email - 用户邮箱
   * @param {string} password - 密码
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object|null>} 验证成功返回用户对象，失败返回null
   */
  async validateUser(email, password, trx = null) {
    try {
      const user = await this.findByEmail(email, trx);
      if (!user) {
        return null;
      }

      // 检查用户是否激活
      if (!user.is_active) {
        throw new Error('用户账户已被禁用');
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return null;
      }

      // 返回用户信息时不包含密码
      const { password: _password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      logger.error('验证用户失败', {
        email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 验证供应商访问密钥
   * @param {string} accessKey - 访问密钥
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object|null>} 验证成功返回供应商对象，失败返回null
   */
  async validateProviderAccessKey(accessKey, trx = null) {
    try {
      const query = this.db('providers').where('status', 'active');

      if (trx) {
        query.transacting(trx);
      }

      const providers = await query.select('*');

      // 遍历所有活跃的供应商，验证访问密钥
      for (const provider of providers) {
        const isValidKey = await bcrypt.compare(accessKey, provider.api_key_hash);
        if (isValidKey) {
          // 更新最后使用时间
          await this.db('providers')
            .where('id', provider.id)
            .update({ last_used_at: new Date() });

          return {
            id: provider.id,
            name: provider.name,
            status: provider.status,
            wechatWebhookUrl: provider.wechat_webhook_url
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('验证供应商访问密钥失败', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 更新用户密码
   * @param {string} userId - 用户ID
   * @param {string} newPassword - 新密码
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<boolean>} 是否更新成功
   */
  async updatePassword(userId, newPassword, trx = null) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      const updatedUser = await this.updateById(userId, {
        password: hashedPassword
      }, trx);

      return !!updatedUser;
    } catch (error) {
      logger.error('更新用户密码失败', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 更新用户信息
   * @param {string} userId - 用户ID
   * @param {Object} updateData - 更新数据
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object|null>} 更新后的用户对象
   */
  async updateUser(userId, updateData, trx = null) {
    try {
      // 过滤掉不允许直接更新的字段
      const { password: _password, id: _id, created_at: _created_at, ...allowedData } = updateData;

      // 如果更新邮箱，需要检查是否重复
      if (allowedData.email) {
        allowedData.email = allowedData.email.toLowerCase();
        const existingUser = await this.findByEmail(allowedData.email, trx);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('邮箱已被其他用户使用');
        }
      }

      const updatedUser = await this.updateById(userId, allowedData, trx);
      
      if (updatedUser) {
        // 返回用户信息时不包含密码
        const { password: _password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
      }

      return null;
    } catch (error) {
      logger.error('更新用户信息失败', {
        userId,
        updateData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 激活/禁用用户
   * @param {string} userId - 用户ID
   * @param {boolean} isActive - 是否激活
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object|null>} 更新后的用户对象
   */
  async setUserActive(userId, isActive, trx = null) {
    try {
      const updatedUser = await this.updateById(userId, {
        is_active: isActive
      }, trx);

      if (updatedUser) {
        const { password: _password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
      }

      return null;
    } catch (error) {
      logger.error('设置用户状态失败', {
        userId,
        isActive,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 根据角色查找用户
   * @param {string} role - 用户角色
   * @param {Object} options - 查询选项
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Array>} 用户数组
   */
  async findByRole(role, options = {}, trx = null) {
    try {
      const {
        isActive = null,
        limit = null,
        offset = null,
        orderBy = [{ column: 'created_at', direction: 'desc' }]
      } = options;

      const conditions = { role };
      if (isActive !== null) {
        conditions.is_active = isActive;
      }

      const users = await this.findMany(conditions, {
        orderBy,
        limit,
        offset,
        select: ['id', 'email', 'name', 'role', 'is_active', 'created_at', 'updated_at']
      }, trx);

      return users;
    } catch (error) {
      logger.error('根据角色查找用户失败', {
        role,
        options,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取活跃用户列表
   * @param {Object} options - 查询选项
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Array>} 活跃用户数组
   */
  async getActiveUsers(options = {}, trx = null) {
    try {
      const {
        role = null,
        limit = null,
        offset = null,
        orderBy = [{ column: 'created_at', direction: 'desc' }]
      } = options;

      const conditions = { is_active: true };
      if (role) {
        conditions.role = role;
      }

      return await this.findMany(conditions, {
        orderBy,
        limit,
        offset,
        select: ['id', 'email', 'name', 'role', 'is_active', 'created_at', 'updated_at']
      }, trx);
    } catch (error) {
      logger.error('获取活跃用户列表失败', {
        options,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 搜索用户
   * @param {string} searchTerm - 搜索关键词
   * @param {Object} options - 搜索选项
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Array>} 搜索结果
   */
  async searchUsers(searchTerm, options = {}, trx = null) {
    try {
      const {
        role = null,
        isActive = null,
        limit = 50,
        offset = 0
      } = options;

      let query = this.query(trx)
        .select(['id', 'email', 'name', 'role', 'is_active', 'created_at', 'updated_at'])
        .where(function() {
          this.where('email', 'like', `%${searchTerm}%`)
            .orWhere('name', 'like', `%${searchTerm}%`);
        });

      if (role) {
        query = query.where('role', role);
      }

      if (isActive !== null) {
        query = query.where('is_active', isActive);
      }

      return await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);
    } catch (error) {
      logger.error('搜索用户失败', {
        searchTerm,
        options,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取用户统计信息
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object>} 统计信息
   */
  async getUserStats(trx = null) {
    try {
      const stats = await this.query(trx)
        .select('role', 'is_active')
        .count('* as count')
        .groupBy('role', 'is_active');

      const result = {
        total: 0,
        active: 0,
        inactive: 0,
        byRole: {}
      };

      stats.forEach(stat => {
        const count = parseInt(stat.count, 10);
        result.total += count;

        if (stat.is_active) {
          result.active += count;
        } else {
          result.inactive += count;
        }

        if (!result.byRole[stat.role]) {
          result.byRole[stat.role] = { active: 0, inactive: 0, total: 0 };
        }

        if (stat.is_active) {
          result.byRole[stat.role].active += count;
        } else {
          result.byRole[stat.role].inactive += count;
        }
        result.byRole[stat.role].total += count;
      });

      return result;
    } catch (error) {
      logger.error('获取用户统计信息失败', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取全局用户统计信息（更详细的统计）
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object>} 全局统计信息
   */
  async getGlobalStats(trx = null) {
    try {
      // 获取基础统计
      const basicStats = await this.getUserStats(trx);

      // 获取最近注册用户统计
      const recentRegistrations = await this.query(trx)
        .where('created_at', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // 最近30天
        .count('* as count')
        .first();

      // 获取最近活跃用户统计
      const recentActiveUsers = await this.query(trx)
        .where('last_login_at', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // 最近7天
        .count('* as count')
        .first();

      return {
        ...basicStats,
        recentRegistrations: parseInt(recentRegistrations?.count || 0, 10),
        recentActiveUsers: parseInt(recentActiveUsers?.count || 0, 10),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('获取全局用户统计信息失败', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 生成用户ID
   * @returns {string} 用户ID
   */
  generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 检查邮箱是否可用
   * @param {string} email - 邮箱
   * @param {string} excludeUserId - 排除的用户ID（用于更新时检查）
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<boolean>} 是否可用
   */
  async isEmailAvailable(email, excludeUserId = null, trx = null) {
    try {
      const existingUser = await this.findByEmail(email, trx);
      
      if (!existingUser) {
        return true;
      }

      // 如果是更新操作，排除当前用户
      if (excludeUserId && existingUser.id === excludeUserId) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('检查邮箱可用性失败', {
        email,
        excludeUserId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取用于导出的用户数据
   * @param {Object} filters - 过滤条件
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Array>} 用户数组
   */
  async findForExport(filters = {}, trx = null) {
    try {
      const {
        role = null,
        isActive = null,
        startDate = null,
        endDate = null
      } = filters;

      let query = this.query(trx)
        .select([
          'id',
          'email',
          'name',
          'role',
          'is_active',
          'created_at',
          'updated_at',
          'last_login_at'
        ]);

      if (role) {
        query = query.where('role', role);
      }

      if (isActive !== null) {
        query = query.where('is_active', isActive);
      }

      if (startDate && endDate) {
        query = query.whereBetween('created_at', [startDate, endDate]);
      } else if (startDate) {
        query = query.where('created_at', '>=', startDate);
      } else if (endDate) {
        query = query.where('created_at', '<=', endDate);
      }

      return await query.orderBy('created_at', 'desc');
    } catch (error) {
      logger.error('获取导出用户数据失败', {
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 检查用户是否有关联的订单
   * @param {string} userId - 用户ID
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<boolean>} 是否有关联订单
   */
  async hasUserOrders(userId, trx = null) {
    try {
      const query = this.db('orders').where('user_id', userId);

      if (trx) {
        query.transacting(trx);
      }

      const orderCount = await query.count('id as count').first();
      return parseInt(orderCount.count) > 0;
    } catch (error) {
      logger.error('检查用户订单失败', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 查找管理员用户
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object|null>} 管理员用户对象或null
   */
  async findAdmin(trx = null) {
    try {
      const admin = await this.findOne({ role: 'admin' }, trx);
      return admin;
    } catch (error) {
      logger.error('查找管理员用户失败', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 验证管理员密码
   * @param {string} password - 密码
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object|null>} 验证成功返回管理员对象，失败返回null
   */
  async validateAdmin(password, trx = null) {
    try {
      const admin = await this.findAdmin(trx);
      if (!admin) {
        return null;
      }

      // 检查管理员是否激活
      if (!admin.is_active) {
        throw new Error('管理员账户已被禁用');
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return null;
      }

      // 返回管理员信息时不包含密码
      const { password: _password, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    } catch (error) {
      logger.error('验证管理员失败', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 更新管理员密码
   * @param {string} newPassword - 新密码
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateAdminPassword(newPassword, trx = null) {
    try {
      const admin = await this.findAdmin(trx);
      if (!admin) {
        throw new Error('管理员用户不存在');
      }

      // 加密新密码
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // 更新密码
      const affectedRows = await this.query(trx)
        .where('id', admin.id)
        .update({
          password: hashedPassword,
          updated_at: new Date().toISOString()
        });

      logger.info('管理员密码更新成功', {
        adminId: admin.id
      });

      return affectedRows > 0;
    } catch (error) {
      logger.error('更新管理员密码失败', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取用户统计信息
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object>} 用户统计信息
   */
  async getUserStats(trx = null) {
    try {
      const query = this.db(this.tableName);

      if (trx) {
        query.transacting(trx);
      }

      // 获取总用户数
      const totalUsers = await query.clone().count('id as count').first();

      // 获取活跃用户数（如果is_active字段存在）
      let activeUsers = { count: 0 };
      try {
        activeUsers = await query.clone()
          .where('is_active', true)
          .count('id as count')
          .first();
      } catch (error) {
        // 如果没有is_active字段，假设所有用户都是活跃的
        logger.warn('is_active字段不存在，假设所有用户都是活跃的');
        activeUsers = totalUsers;
      }

      // 获取按角色分组的用户数
      const usersByRole = await query.clone()
        .select('role')
        .count('id as count')
        .groupBy('role');

      // 获取最近30天注册的用户数
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentUsers = await query.clone()
        .where('created_at', '>=', thirtyDaysAgo.toISOString())
        .count('id as count')
        .first();

      // 获取最近登录的用户数（如果有last_login_at字段）
      let recentlyActiveUsers = { count: 0 };
      try {
        recentlyActiveUsers = await query.clone()
          .where('last_login_at', '>=', thirtyDaysAgo.toISOString())
          .count('id as count')
          .first();
      } catch (error) {
        // 如果没有last_login_at字段，忽略错误
        logger.warn('last_login_at字段不存在，跳过最近活跃用户统计');
      }

      const stats = {
        total: parseInt(totalUsers.count),
        active: parseInt(activeUsers.count),
        inactive: parseInt(totalUsers.count) - parseInt(activeUsers.count),
        recentRegistrations: parseInt(recentUsers.count),
        recentlyActive: parseInt(recentlyActiveUsers.count),
        byRole: usersByRole.reduce((acc, item) => {
          acc[item.role] = parseInt(item.count);
          return acc;
        }, {}),
        lastUpdated: new Date().toISOString()
      };

      logger.info('用户统计信息获取成功', { stats });
      return stats;
    } catch (error) {
      logger.error('获取用户统计信息失败', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = UserRepository;
