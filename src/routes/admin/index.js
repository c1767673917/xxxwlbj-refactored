/**
 * 管理员路由主入口
 * 统一管理所有管理员API路由
 */

const express = require('express');
const adminUserRoutes = require('./users');
const adminOrderRoutes = require('./orders');

const router = express.Router();

// 管理员用户管理路由
router.use('/users', adminUserRoutes);

// 管理员订单管理路由
router.use('/orders', adminOrderRoutes);

module.exports = router;
