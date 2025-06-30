/**
 * 用户活动记录数据访问层
 * 处理用户活动记录相关的数据库操作
 */

const BaseRepository = require('./BaseRepository');
const { logger } = require('../config/logger');

class UserActivityRepository extends BaseRepository {
  constructor() {
    super('user_activities', 'id', []);
  }

  /**
   * 创建用户活动记录
   * @param {Object} activityData - 活动记录数据
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object>} 创建的活动记录
   */
  async createActivity(activityData, trx = null) {
    try {
      const record = {
        id: activityData.id,
        user_id: activityData.userId,
        user_email: activityData.userEmail,
        user_name: activityData.userName,
        action: activityData.action,
        resource_type: activityData.resourceType || null,
        resource_id: activityData.resourceId || null,
        description: activityData.description,
        metadata: activityData.metadata ? JSON.stringify(activityData.metadata) : null,
        ip_address: activityData.ipAddress || null,
        user_agent: activityData.userAgent || null,
        method: activityData.method || null,
        url: activityData.url || null,
        status: activityData.status || 'success',
        error_message: activityData.errorMessage || null,
        created_at: activityData.createdAt || new Date().toISOString()
      };

      // 直接插入，不使用BaseRepository的create方法（避免自动添加updated_at字段）
      await this.db(this.tableName).insert(record);
      const result = await this.findById(record.id, trx);
      
      logger.debug('用户活动记录创建成功', {
        activityId: result.id,
        userId: result.user_id,
        action: result.action
      });

      return this.transformActivity(result);
    } catch (error) {
      logger.error('创建用户活动记录失败', {
        activityData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 分页查询用户活动记录
   * @param {Object} options - 查询选项
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object>} 分页结果
   */
  async findWithPagination(options = {}, trx = null) {
    try {
      const {
        page = 1,
        pageSize = 20,
        orderBy = [{ column: 'created_at', order: 'desc' }],
        userId = null,
        action = null,
        resourceType = null,
        status = null,
        startDate = null,
        endDate = null
      } = options;

      let query = this.db(this.tableName);

      if (trx) {
        query = query.transacting(trx);
      }

      // 应用过滤条件
      if (userId) {
        query = query.where('user_id', userId);
      }

      if (action) {
        query = query.where('action', 'like', `%${action}%`);
      }

      if (resourceType) {
        query = query.where('resource_type', resourceType);
      }

      if (status) {
        query = query.where('status', status);
      }

      if (startDate) {
        query = query.where('created_at', '>=', startDate);
      }

      if (endDate) {
        query = query.where('created_at', '<=', endDate);
      }

      // 获取总数
      const totalQuery = query.clone();
      const totalResult = await totalQuery.count('id as count').first();
      const total = parseInt(totalResult.count);

      // 应用排序和分页
      orderBy.forEach(sort => {
        query = query.orderBy(sort.column, sort.order);
      });

      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);

      // 执行查询
      const records = await query.select('*');

      // 转换数据格式
      const transformedRecords = records.map(record => this.transformActivity(record));

      const meta = {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      };

      logger.info('用户活动记录分页查询成功', {
        total,
        page,
        pageSize,
        filters: { userId, action, resourceType, status, startDate, endDate }
      });

      return {
        data: transformedRecords,
        meta
      };
    } catch (error) {
      logger.error('用户活动记录分页查询失败', {
        options,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取用户最近的活动记录
   * @param {string} userId - 用户ID
   * @param {number} limit - 限制数量
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Array>} 活动记录数组
   */
  async getRecentActivities(userId, limit = 10, trx = null) {
    try {
      let query = this.db(this.tableName)
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .limit(limit);

      if (trx) {
        query = query.transacting(trx);
      }

      const records = await query.select('*');
      const transformedRecords = records.map(record => this.transformActivity(record));

      logger.debug('获取用户最近活动记录成功', {
        userId,
        recordCount: transformedRecords.length,
        limit
      });

      return transformedRecords;
    } catch (error) {
      logger.error('获取用户最近活动记录失败', {
        userId,
        limit,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取活动统计信息
   * @param {Object} filters - 过滤条件
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object>} 统计信息
   */
  async getActivityStats(filters = {}, trx = null) {
    try {
      const {
        userId = null,
        startDate = null,
        endDate = null
      } = filters;

      let query = this.db(this.tableName);

      if (trx) {
        query = query.transacting(trx);
      }

      // 应用过滤条件
      if (userId) {
        query = query.where('user_id', userId);
      }

      if (startDate) {
        query = query.where('created_at', '>=', startDate);
      }

      if (endDate) {
        query = query.where('created_at', '<=', endDate);
      }

      // 获取总体统计
      const totalStats = await query.clone()
        .count('id as totalActivities')
        .countDistinct('user_id as activeUsers')
        .first();

      // 获取按操作类型分组的统计
      const actionStats = await query.clone()
        .select('action')
        .count('id as count')
        .groupBy('action')
        .orderBy('count', 'desc');

      // 获取按状态分组的统计
      const statusStats = await query.clone()
        .select('status')
        .count('id as count')
        .groupBy('status');

      const stats = {
        total: parseInt(totalStats.totalActivities),
        activeUsers: parseInt(totalStats.activeUsers),
        byAction: actionStats.reduce((acc, item) => {
          acc[item.action] = parseInt(item.count);
          return acc;
        }, {}),
        byStatus: statusStats.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        lastUpdated: new Date().toISOString()
      };

      logger.info('活动统计信息获取成功', { stats });
      return stats;
    } catch (error) {
      logger.error('获取活动统计信息失败', {
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 转换活动记录数据格式
   * @param {Object} record - 数据库记录
   * @returns {Object} 转换后的记录
   */
  transformActivity(record) {
    if (!record) return null;

    return {
      id: record.id,
      userId: record.user_id,
      userEmail: record.user_email,
      userName: record.user_name,
      action: record.action,
      resourceType: record.resource_type,
      resourceId: record.resource_id,
      description: record.description,
      metadata: record.metadata ? JSON.parse(record.metadata) : null,
      ipAddress: record.ip_address,
      userAgent: record.user_agent,
      method: record.method,
      url: record.url,
      status: record.status,
      errorMessage: record.error_message,
      createdAt: record.created_at
    };
  }

  /**
   * 删除过期的活动记录
   * @param {number} daysOld - 保留天数
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<number>} 删除的记录数
   */
  async deleteOldActivities(daysOld = 90, trx = null) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let query = this.db(this.tableName)
        .where('created_at', '<', cutoffDate.toISOString());

      if (trx) {
        query = query.transacting(trx);
      }

      const deletedCount = await query.del();

      logger.info('过期活动记录清理完成', {
        daysOld,
        cutoffDate: cutoffDate.toISOString(),
        deletedCount
      });

      return deletedCount;
    } catch (error) {
      logger.error('删除过期活动记录失败', {
        daysOld,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = UserActivityRepository;
