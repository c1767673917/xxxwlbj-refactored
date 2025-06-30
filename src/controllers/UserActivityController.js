/**
 * 用户活动记录控制器
 * 处理用户活动记录相关的HTTP请求
 */

const BaseController = require('./BaseController');
const UserActivityService = require('../services/UserActivityService');
const { getFieldConfig } = require('../config/fieldConfig');

class UserActivityController extends BaseController {
  constructor() {
    super('UserActivityController');
    this.activityService = new UserActivityService();
    
    // 获取字段配置
    this.allowedSortFields = getFieldConfig('userActivity', 'sortFields') || ['createdAt', 'action', 'status'];
    this.allowedFilterFields = getFieldConfig('userActivity', 'filterFields') || ['userId', 'action', 'resourceType', 'status', 'startDate', 'endDate'];
  }

  /**
   * 获取用户活动历史
   * GET /api/users/activity
   */
  getUserActivities = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    
    // 提取查询参数
    const pagination = this.extractPaginationParams(req);
    const orderBy = this.extractSortParams(req, this.allowedSortFields);
    const filters = this.extractFilterParams(req, this.allowedFilterFields);

    // 如果不是管理员，只能查看自己的活动
    if (user.role !== 'admin' && filters.userId && filters.userId !== user.id) {
      return this.sendError(res, '无权查看其他用户的活动记录', 403, 'FORBIDDEN');
    }

    // 如果没有指定用户ID且不是管理员，默认查看自己的活动
    if (!filters.userId && user.role !== 'admin') {
      filters.userId = user.id;
    }

    const options = {
      ...pagination,
      orderBy,
      ...filters
    };

    this.logOperation('get_user_activities_request', req, {
      userId: user.id,
      userRole: user.role,
      options
    });

    const result = await this.activityService.getUserActivities(options);
    
    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取用户最近活动
   * GET /api/users/:userId/recent-activities
   */
  getRecentActivities = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { userId } = this.validatePathParams(req, ['userId']);
    const { limit = 10 } = req.query;

    // 权限检查：只能查看自己的活动，除非是管理员
    if (user.role !== 'admin' && userId !== user.id) {
      return this.sendError(res, '无权查看其他用户的活动记录', 403, 'FORBIDDEN');
    }

    this.logOperation('get_recent_activities_request', req, {
      currentUserId: user.id,
      targetUserId: userId,
      limit: parseInt(limit)
    });

    const result = await this.activityService.getRecentActivities(userId, parseInt(limit));
    
    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取活动统计信息（管理员）
   * GET /api/users/activity/stats
   */
  getActivityStats = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    
    // 只有管理员可以查看全局统计
    if (user.role !== 'admin') {
      return this.sendError(res, '需要管理员权限', 403, 'ADMIN_REQUIRED');
    }

    const filters = this.extractFilterParams(req, ['userId', 'startDate', 'endDate']);

    this.logOperation('get_activity_stats_request', req, {
      adminId: user.id,
      filters
    });

    const result = await this.activityService.getActivityStats(filters);
    
    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取用户活动时间线
   * GET /api/users/:userId/activity-timeline
   */
  getUserActivityTimeline = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { userId } = this.validatePathParams(req, ['userId']);
    const { startDate, endDate, limit = 50 } = req.query;

    // 权限检查：只能查看自己的时间线，除非是管理员
    if (user.role !== 'admin' && userId !== user.id) {
      return this.sendError(res, '无权查看其他用户的活动时间线', 403, 'FORBIDDEN');
    }

    const options = {
      startDate: startDate || null,
      endDate: endDate || null,
      limit: parseInt(limit)
    };

    this.logOperation('get_user_activity_timeline_request', req, {
      currentUserId: user.id,
      targetUserId: userId,
      options
    });

    const result = await this.activityService.getUserActivityTimeline(userId, options);
    
    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取活动类型统计（管理员）
   * GET /api/users/activity/type-stats
   */
  getActivityTypeStats = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    
    // 只有管理员可以查看活动类型统计
    if (user.role !== 'admin') {
      return this.sendError(res, '需要管理员权限', 403, 'ADMIN_REQUIRED');
    }

    const filters = this.extractFilterParams(req, ['userId', 'startDate', 'endDate']);

    this.logOperation('get_activity_type_stats_request', req, {
      adminId: user.id,
      filters
    });

    const result = await this.activityService.getActivityTypeStats(filters);
    
    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 记录用户活动（内部API）
   * POST /api/users/activity/record
   */
  recordActivity = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const activityData = this.validateRequestBody(req, ['action', 'description']);

    // 补充用户信息
    const enrichedActivityData = {
      ...activityData,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.originalUrl
    };

    this.logOperation('record_activity_request', req, {
      userId: user.id,
      action: activityData.action
    });

    const result = await this.activityService.recordActivity(enrichedActivityData);
    
    this.sendSuccess(res, result.data, result.message, 201, result.meta);
  });

  /**
   * 清理过期活动记录（管理员）
   * POST /api/users/activity/cleanup
   */
  cleanupOldActivities = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    
    // 只有管理员可以执行清理操作
    if (user.role !== 'admin') {
      return this.sendError(res, '需要管理员权限', 403, 'ADMIN_REQUIRED');
    }

    const { daysOld = 90 } = req.body;

    if (typeof daysOld !== 'number' || daysOld < 1) {
      return this.sendError(res, '保留天数必须是大于0的数字', 400, 'INVALID_DAYS');
    }

    this.logOperation('cleanup_old_activities_request', req, {
      adminId: user.id,
      daysOld
    });

    const result = await this.activityService.cleanupOldActivities(daysOld);
    
    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 批量记录用户活动（内部API）
   * POST /api/users/activity/batch-record
   */
  recordBatchActivities = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { activities } = this.validateRequestBody(req, ['activities']);

    if (!Array.isArray(activities)) {
      return this.sendError(res, '活动数据必须是数组', 400, 'INVALID_ACTIVITIES');
    }

    // 为每个活动补充用户信息
    const enrichedActivities = activities.map(activity => ({
      ...activity,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.originalUrl
    }));

    this.logOperation('record_batch_activities_request', req, {
      userId: user.id,
      activityCount: activities.length
    });

    const result = await this.activityService.recordBatchActivities(enrichedActivities);
    
    this.sendSuccess(res, result.data, result.message, 201, result.meta);
  });
}

module.exports = UserActivityController;
