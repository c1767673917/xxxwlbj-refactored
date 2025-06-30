/**
 * 主路由文件
 * 统一管理所有API路由
 */

const express = require('express');
const authRoutes = require('./auth');
const orderRoutes = require('./orders');
const quoteRoutes = require('./quotes');
const userRoutes = require('./users');
const adminRoutes = require('./admin');
const providerRoutes = require('./providers');
const exportRoutes = require('./export');
const importRoutes = require('./import');
const activityRoutes = require('./activity');

const router = express.Router();

// 认证相关路由
router.use('/auth', authRoutes);

// 订单相关路由
router.use('/orders', orderRoutes);

// 报价相关路由
router.use('/quotes', quoteRoutes);

// 用户相关路由
router.use('/users', userRoutes);

// 管理员相关路由
router.use('/admin', adminRoutes);

// 供应商相关路由
router.use('/providers', providerRoutes);

// 导出相关路由
router.use('/export', exportRoutes);

// 导入相关路由
router.use('/import', importRoutes);

// 用户活动相关路由
router.use('/activity', activityRoutes);

module.exports = router;
