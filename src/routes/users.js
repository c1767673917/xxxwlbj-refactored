/**
 * 用户相关路由
 * 处理用户信息管理功能
 */

const express = require('express');
const { auth, validation } = require('../middleware');
const { userController } = require('../controllers');

const router = express.Router();

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

// 管理员路由已迁移到 /admin/users

module.exports = router;
