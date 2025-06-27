/**
 * 管理员订单管理路由
 * 处理管理员对订单的管理操作
 */

const express = require('express');
const { auth, validation } = require('../../middleware');
const AdminOrderController = require('../../controllers/admin/AdminOrderController');

const router = express.Router();
const adminOrderController = new AdminOrderController();

// 所有路由都需要管理员权限
router.use(auth.authenticateToken);
router.use(auth.requireAdmin);

// 获取所有待处理订单
router.get('/pending',
  validation.validatePagination,
  validation.validateSorting,
  adminOrderController.getPendingOrders
);

// 获取所有订单列表
router.get('/all',
  validation.validatePagination,
  validation.validateSorting,
  adminOrderController.getAllOrders
);

// 获取订单详情
router.get('/:id',
  validation.validateOrderId,
  adminOrderController.getOrderById
);

// 更新订单状态
router.patch('/:id/status',
  validation.validateOrderId,
  adminOrderController.updateOrderStatus
);

// 分配订单给供应商
router.post('/:id/assign',
  validation.validateOrderId,
  adminOrderController.assignOrderToProvider
);

// 删除订单
router.delete('/:id',
  validation.validateOrderId,
  adminOrderController.deleteOrder
);

// 获取订单历史记录
router.get('/:id/history',
  validation.validateOrderId,
  adminOrderController.getOrderHistory
);

// 批量操作订单
router.post('/batch',
  adminOrderController.batchOperateOrders
);

// 导出订单数据
router.get('/export',
  adminOrderController.exportOrders
);

// 获取订单统计信息
router.get('/stats',
  adminOrderController.getAdminOrderStats
);

module.exports = router;
