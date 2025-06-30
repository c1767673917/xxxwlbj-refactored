/**
 * 管理员路由主入口
 * 统一管理所有管理员API路由
 */

const express = require('express');
const { auth, validation, security } = require('../../middleware');
const { userController } = require('../../controllers');
const adminUserRoutes = require('./users');
const adminOrderRoutes = require('./orders');
const adminSystemConfigRoutes = require('./systemConfig');

const router = express.Router();

// 管理员认证相关路由（无需预先认证）

// 管理员登录
router.post('/login',
  security.authRateLimit,
  validation.validateAdminLogin,
  userController.adminLogin
);

// 需要认证的管理员路由

// 管理员登出
router.post('/logout',
  auth.authenticateToken,
  auth.requireAdmin,
  userController.adminLogout
);

// 管理员修改密码
router.put('/password',
  auth.authenticateToken,
  auth.requireAdmin,
  validation.validateAdminPasswordChange,
  userController.adminChangePassword
);

// 获取管理员统计信息
router.get('/stats',
  auth.authenticateToken,
  auth.requireAdmin,
  userController.getAdminStats
);

// 管理员用户管理路由
router.use('/users', adminUserRoutes);

// 管理员订单管理路由
router.use('/orders', adminOrderRoutes);

// 管理员系统配置路由
router.use('/system-config', adminSystemConfigRoutes);

module.exports = router;
