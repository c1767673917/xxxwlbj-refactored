/**
 * 订单相关路由
 * 处理订单的创建、查询、更新等功能
 */

const express = require('express');
const { auth, validation } = require('../middleware');
const { orderController } = require('../controllers');

const router = express.Router();

// 获取订单列表（用户自己的订单）
router.get('/',
  auth.authenticateToken,
  validation.validatePagination,
  validation.validateSearch,
  validation.validateSorting,
  orderController.getUserOrders
);

// 创建订单
router.post('/',
  auth.authenticateToken,
  validation.validateOrderCreation,
  orderController.createOrder
);

// 获取订单详情
router.get('/:id',
  auth.authenticateToken,
  validation.validateOrderId,
  orderController.getOrderById
);

// 更新整个订单
router.put('/:id',
  auth.authenticateToken,
  validation.validateOrderId,
  validation.validateOrderUpdate,
  orderController.updateOrder
);

// 更新订单状态
router.patch('/:id/status',
  auth.authenticateToken,
  validation.validateOrderId,
  orderController.updateOrderStatus
);

// 关闭订单
router.post('/:id/close',
  auth.authenticateToken,
  validation.validateOrderId,
  orderController.closeOrder
);

// 删除订单
router.delete('/:id',
  auth.authenticateToken,
  validation.validateOrderId,
  orderController.deleteOrder
);

// 获取用户订单统计信息
router.get('/stats',
  auth.authenticateToken,
  orderController.getUserOrderStats
);

// 管理员路由已迁移到 /admin/orders

module.exports = router;
