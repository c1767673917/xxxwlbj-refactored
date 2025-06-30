/**
 * 导出相关路由
 * 处理各种数据的导出功能
 */

const express = require('express');
const { auth, validation } = require('../middleware');
const { quoteController } = require('../controllers');

const router = express.Router();

// 导出报价数据
router.get('/quotes',
  auth.authenticateToken,
  auth.requireAdmin,
  validation.validatePagination,
  quoteController.exportQuotes
);

module.exports = router;
