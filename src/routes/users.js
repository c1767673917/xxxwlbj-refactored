/**
 * 用户相关路由
 * 处理用户信息管理功能
 */

const express = require('express');
const { auth, validation } = require('../middleware');
const { userController } = require('../controllers');
const UserActivityController = require('../controllers/UserActivityController');

const router = express.Router();
const activityController = new UserActivityController();

// 获取用户个人信息
router.get('/profile',
  auth.authenticateToken,
  userController.getProfile
);

// 更新用户个人信息
router.patch('/profile',
  auth.authenticateToken,
  userController.updateProfile
);

// 用户活动相关路由

// 获取用户活动历史
router.get('/activity',
  auth.authenticateToken,
  validation.validatePagination,
  activityController.getUserActivities
);

// 获取用户最近活动
router.get('/:userId/recent-activities',
  auth.authenticateToken,
  activityController.getRecentActivities
);

// 获取用户活动时间线
router.get('/:userId/activity-timeline',
  auth.authenticateToken,
  activityController.getUserActivityTimeline
);

// 微信配置相关路由

// 获取用户微信配置
router.get('/:userId/wechat',
  auth.authenticateToken,
  userController.getUserWechatConfig
);

// 更新用户微信配置
router.put('/:userId/wechat',
  auth.authenticateToken,
  userController.updateUserWechatConfig
);

// 删除用户微信配置
router.delete('/:userId/wechat',
  auth.authenticateToken,
  userController.deleteUserWechatConfig
);

// 测试用户微信配置
router.post('/:userId/wechat/test',
  auth.authenticateToken,
  userController.testUserWechatConfig
);

// 管理员路由已迁移到 /admin/users

module.exports = router;
