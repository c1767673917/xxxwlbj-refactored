/**
 * 管理员订单控制器
 * 处理管理员对订单的管理操作
 */

const BaseController = require('../BaseController');
const { orderService } = require('../../services');
const { getFieldConfig } = require('../../config/fieldConfig');

class AdminOrderController extends BaseController {
  constructor() {
    super('AdminOrderController');
    // 使用集中的字段配置
    this.allowedSortFields = getFieldConfig('order', 'sortFields');
    this.allowedFilterFields = getFieldConfig('order', 'filterFields');
  }

  /**
   * 获取所有待处理订单（管理员）
   * GET /api/orders/admin/pending
   */
  getPendingOrders = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    
    // 提取查询参数
    const pagination = this.extractPaginationParams(req);
    const orderBy = this.extractSortParams(req, this.allowedSortFields);
    const filters = this.extractFilterParams(req, this.allowedFilterFields);

    const options = {
      ...pagination,
      orderBy,
      ...filters,
      status: 'pending' // 只获取待处理订单
    };

    this.logOperation('admin_get_pending_orders_request', req, {
      adminId: user.id,
      options
    });

    const result = await orderService.getOrderList(options, user.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取所有订单列表（管理员）
   * GET /api/orders/admin/all
   */
  getAllOrders = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    
    // 提取查询参数
    const pagination = this.extractPaginationParams(req);
    const orderBy = this.extractSortParams(req, this.allowedSortFields);
    const filters = this.extractFilterParams(req, this.allowedFilterFields);

    const options = {
      ...pagination,
      orderBy,
      ...filters
    };

    this.logOperation('admin_get_all_orders_request', req, {
      adminId: user.id,
      options
    });

    const result = await orderService.getOrderList(options, user.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 批量操作订单（管理员）
   * POST /api/orders/admin/batch
   */
  batchOperateOrders = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { orderIds, operation } = this.validateRequestBody(req, ['orderIds', 'operation']);

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return this.sendError(res, '订单ID列表不能为空', 400, 'INVALID_ORDER_IDS');
    }

    const validOperations = ['approve', 'reject', 'cancel', 'complete'];
    if (!validOperations.includes(operation)) {
      return this.sendError(res, '无效的操作类型', 400, 'INVALID_OPERATION');
    }

    this.logOperation('admin_batch_operate_orders_request', req, {
      adminId: user.id,
      orderIds,
      operation
    });

    const result = await orderService.batchUpdateOrders(orderIds, operation, user.id);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 导出订单数据（管理员功能）
   * GET /api/orders/admin/export
   */
  exportOrders = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    // 提取过滤参数
    const exportFilterFields = getFieldConfig('order', 'exportFilterFields');
    const filters = this.extractFilterParams(req, exportFilterFields);
    const format = req.query.format || 'csv';

    this.logOperation('admin_export_orders_request', req, {
      adminId: user.id,
      filters,
      format
    });

    const result = await orderService.exportOrders(filters, format);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取全局订单统计信息（管理员）
   * GET /api/orders/admin/stats
   */
  getAdminOrderStats = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    this.logOperation('admin_get_order_stats_request', req, {
      adminId: user.id
    });

    const result = await orderService.getAdminOrderStats();

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 更新订单状态（管理员）
   * PATCH /api/orders/admin/:id/status
   */
  updateOrderStatus = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { id: orderId } = this.validatePathParams(req, ['id']);
    const { status, reason } = this.validateRequestBody(req, ['status']);

    this.logOperation('admin_update_order_status_request', req, {
      adminId: user.id,
      orderId,
      status,
      reason
    });

    const result = await orderService.updateOrderStatus(orderId, status, user.id, user.role, reason);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 分配订单给供应商（管理员）
   * POST /api/orders/admin/:id/assign
   */
  assignOrderToProvider = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { id: orderId } = this.validatePathParams(req, ['id']);
    const { providerId } = this.validateRequestBody(req, ['providerId']);

    this.logOperation('admin_assign_order_request', req, {
      adminId: user.id,
      orderId,
      providerId
    });

    const result = await orderService.assignOrderToProvider(orderId, providerId, user.id);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取订单详情（管理员）
   * GET /api/orders/admin/:id
   */
  getOrderById = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { id: orderId } = this.validatePathParams(req, ['id']);

    this.logOperation('admin_get_order_by_id_request', req, {
      adminId: user.id,
      orderId
    });

    const result = await orderService.getOrderById(orderId, user.id, user.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 删除订单（管理员）
   * DELETE /api/orders/admin/:id
   */
  deleteOrder = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { id: orderId } = this.validatePathParams(req, ['id']);

    this.logOperation('admin_delete_order_request', req, {
      adminId: user.id,
      orderId
    });

    const result = await orderService.deleteOrder(orderId, user.id, user.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取订单历史记录（管理员）
   * GET /api/orders/admin/:id/history
   */
  getOrderHistory = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { id: orderId } = this.validatePathParams(req, ['id']);

    this.logOperation('admin_get_order_history_request', req, {
      adminId: user.id,
      orderId
    });

    const result = await orderService.getOrderHistory(orderId, user.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });
}

module.exports = AdminOrderController;
