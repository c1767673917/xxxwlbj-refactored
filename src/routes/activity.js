/**
 * 用户活动记录路由
 * 处理用户活动记录相关的路由
 */

const express = require('express');
const { auth, validation } = require('../middleware');
const UserActivityController = require('../controllers/UserActivityController');

const router = express.Router();
const activityController = new UserActivityController();

// 所有活动相关路由都需要认证
router.use(auth.authenticateToken);

// 获取用户活动历史
router.get('/',
  validation.validatePagination,
  activityController.getUserActivities
);

// 获取活动统计信息（管理员）
router.get('/stats',
  auth.requireAdmin,
  activityController.getActivityStats
);

// 获取活动类型统计（管理员）
router.get('/type-stats',
  auth.requireAdmin,
  activityController.getActivityTypeStats
);

// 记录用户活动（内部API）
router.post('/record',
  activityController.recordActivity
);

// 批量记录用户活动（内部API）
router.post('/batch-record',
  activityController.recordBatchActivities
);

// 清理过期活动记录（管理员）
router.post('/cleanup',
  auth.requireAdmin,
  activityController.cleanupOldActivities
);

// 获取用户最近活动
router.get('/:userId/recent',
  activityController.getRecentActivities
);

// 获取用户活动时间线
router.get('/:userId/timeline',
  activityController.getUserActivityTimeline
);

module.exports = router;
