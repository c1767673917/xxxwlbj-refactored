/**
 * 用户活动记录业务逻辑服务
 * 处理用户活动记录相关的业务逻辑
 */

const BaseService = require('./BaseService');
const UserActivityRepository = require('../repositories/UserActivityRepository');
const { v4: uuidv4 } = require('uuid');

class UserActivityService extends BaseService {
  constructor() {
    super('UserActivityService');
    this.activityRepo = new UserActivityRepository();
  }

  /**
   * 记录用户活动
   * @param {Object} activityData - 活动数据
   * @returns {Promise<Object>} 记录结果
   */
  async recordActivity(activityData) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams(activityData, ['userId', 'action', 'description']);

      const activity = {
        id: uuidv4(),
        userId: activityData.userId,
        userEmail: activityData.userEmail || '',
        userName: activityData.userName || '',
        action: activityData.action,
        resourceType: activityData.resourceType || null,
        resourceId: activityData.resourceId || null,
        description: activityData.description,
        metadata: activityData.metadata || null,
        ipAddress: activityData.ipAddress || null,
        userAgent: activityData.userAgent || null,
        method: activityData.method || null,
        url: activityData.url || null,
        status: activityData.status || 'success',
        errorMessage: activityData.errorMessage || null,
        createdAt: new Date().toISOString()
      };

      const result = await this.activityRepo.createActivity(activity);

      this.logOperation('activity_recorded', {
        activityId: result.id,
        userId: result.userId,
        action: result.action
      });

      return this.buildResponse(result, '用户活动记录成功');
    }, 'recordActivity', { action: activityData.action, userId: activityData.userId });
  }

  /**
   * 获取用户活动历史
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 活动历史
   */
  async getUserActivities(options = {}) {
    return this.handleAsyncOperation(async () => {
      const result = await this.activityRepo.findWithPagination(options);

      this.logOperation('user_activities_retrieved', {
        recordCount: result.data.length,
        totalCount: result.meta.total,
        userId: options.userId
      });

      return this.buildResponse(result.data, '用户活动历史获取成功', result.meta);
    }, 'getUserActivities', { options });
  }

  /**
   * 获取用户最近活动
   * @param {string} userId - 用户ID
   * @param {number} limit - 限制数量
   * @returns {Promise<Object>} 最近活动
   */
  async getRecentActivities(userId, limit = 10) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userId }, ['userId']);

      const activities = await this.activityRepo.getRecentActivities(userId, limit);

      this.logOperation('recent_activities_retrieved', {
        userId,
        recordCount: activities.length,
        limit
      });

      return this.buildResponse(activities, '最近活动获取成功');
    }, 'getRecentActivities', { userId, limit });
  }

  /**
   * 获取活动统计信息
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 统计信息
   */
  async getActivityStats(filters = {}) {
    return this.handleAsyncOperation(async () => {
      const stats = await this.activityRepo.getActivityStats(filters);

      this.logOperation('activity_stats_retrieved', {
        totalActivities: stats.total,
        activeUsers: stats.activeUsers,
        filters
      });

      return this.buildResponse(stats, '活动统计信息获取成功');
    }, 'getActivityStats', { filters });
  }

  /**
   * 清理过期活动记录
   * @param {number} daysOld - 保留天数
   * @returns {Promise<Object>} 清理结果
   */
  async cleanupOldActivities(daysOld = 90) {
    return this.handleAsyncOperation(async () => {
      const deletedCount = await this.activityRepo.deleteOldActivities(daysOld);

      this.logOperation('old_activities_cleaned', {
        deletedCount,
        daysOld
      });

      return this.buildResponse({
        deletedCount,
        daysOld,
        cleanupDate: new Date().toISOString()
      }, `成功清理 ${deletedCount} 条过期活动记录`);
    }, 'cleanupOldActivities', { daysOld });
  }

  /**
   * 批量记录用户活动
   * @param {Array} activities - 活动数组
   * @returns {Promise<Object>} 批量记录结果
   */
  async recordBatchActivities(activities) {
    return this.handleAsyncOperation(async () => {
      if (!Array.isArray(activities) || activities.length === 0) {
        throw this.createBusinessError('活动数组不能为空', 'EMPTY_ACTIVITIES', 400);
      }

      const results = [];
      const errors = [];

      for (const activityData of activities) {
        try {
          const result = await this.recordActivity(activityData);
          results.push(result.data);
        } catch (error) {
          errors.push({
            activity: activityData,
            error: error.message
          });
        }
      }

      this.logOperation('batch_activities_recorded', {
        totalActivities: activities.length,
        successCount: results.length,
        errorCount: errors.length
      });

      return this.buildResponse({
        recorded: results,
        errors: errors,
        summary: {
          total: activities.length,
          success: results.length,
          failed: errors.length
        }
      }, `批量记录完成，成功 ${results.length} 条，失败 ${errors.length} 条`);
    }, 'recordBatchActivities', { count: activities.length });
  }

  /**
   * 获取用户活动时间线
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 活动时间线
   */
  async getUserActivityTimeline(userId, options = {}) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ userId }, ['userId']);

      const {
        startDate = null,
        endDate = null,
        limit = 50
      } = options;

      const queryOptions = {
        userId,
        startDate,
        endDate,
        pageSize: limit,
        page: 1,
        orderBy: [{ column: 'created_at', order: 'desc' }]
      };

      const result = await this.activityRepo.findWithPagination(queryOptions);

      // 按日期分组活动
      const timeline = this.groupActivitiesByDate(result.data);

      this.logOperation('user_activity_timeline_retrieved', {
        userId,
        recordCount: result.data.length,
        timelineDays: Object.keys(timeline).length
      });

      return this.buildResponse({
        timeline,
        summary: {
          totalActivities: result.meta.total,
          timelineDays: Object.keys(timeline).length,
          dateRange: {
            start: startDate,
            end: endDate
          }
        }
      }, '用户活动时间线获取成功');
    }, 'getUserActivityTimeline', { userId, options });
  }

  /**
   * 按日期分组活动
   * @param {Array} activities - 活动数组
   * @returns {Object} 按日期分组的活动
   */
  groupActivitiesByDate(activities) {
    const timeline = {};

    activities.forEach(activity => {
      const date = new Date(activity.createdAt).toISOString().split('T')[0];
      
      if (!timeline[date]) {
        timeline[date] = [];
      }
      
      timeline[date].push(activity);
    });

    return timeline;
  }

  /**
   * 获取活动类型统计
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Object>} 活动类型统计
   */
  async getActivityTypeStats(filters = {}) {
    return this.handleAsyncOperation(async () => {
      const stats = await this.activityRepo.getActivityStats(filters);

      // 计算百分比
      const total = stats.total;
      const actionStatsWithPercentage = Object.entries(stats.byAction).map(([action, count]) => ({
        action,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(2) : 0
      })).sort((a, b) => b.count - a.count);

      this.logOperation('activity_type_stats_retrieved', {
        totalActivities: total,
        actionTypes: actionStatsWithPercentage.length,
        filters
      });

      return this.buildResponse({
        total,
        actionStats: actionStatsWithPercentage,
        statusStats: stats.byStatus,
        activeUsers: stats.activeUsers,
        lastUpdated: stats.lastUpdated
      }, '活动类型统计获取成功');
    }, 'getActivityTypeStats', { filters });
  }
}

module.exports = UserActivityService;
