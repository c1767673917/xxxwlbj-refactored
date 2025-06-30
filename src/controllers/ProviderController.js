/**
 * 供应商控制器
 * 处理供应商相关的HTTP请求
 */

const BaseController = require('./BaseController');
const { providerService } = require('../services');
const { getFieldConfig } = require('../config/fieldConfig');

class ProviderController extends BaseController {
  constructor() {
    super('ProviderController');
    // 使用集中的字段配置
    this.allowedSortFields = getFieldConfig('provider', 'sortFields') || ['name', 'createdAt', 'status'];
    this.allowedFilterFields = getFieldConfig('provider', 'filterFields') || ['status', 'name'];
  }

  /**
   * 获取供应商列表（管理员）
   * GET /api/providers
   */
  getProviders = this.asyncHandler(async (req, res) => {
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

    this.logOperation('get_providers_request', req, {
      adminId: user.id,
      options
    });

    const result = await providerService.getProviders(options, user.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取供应商详情
   * GET /api/providers/:id
   */
  getProviderById = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { id: providerId } = this.validatePathParams(req, ['id']);

    this.logOperation('get_provider_by_id_request', req, {
      providerId,
      userId: user.id
    });

    const result = await providerService.getProviderById(providerId, user.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 通过访问密钥获取供应商详情
   * GET /api/providers/details?accessKey=xxx
   */
  getProviderByKey = this.asyncHandler(async (req, res) => {
    const { accessKey } = this.validateQueryParams(req, ['accessKey']);

    this.logOperation('get_provider_by_key_request', req, {
      accessKey: accessKey.substring(0, 10) + '...'
    });

    const result = await providerService.getProviderByAccessKey(accessKey);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 创建供应商（管理员）
   * POST /api/providers
   */
  createProvider = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const requiredFields = ['name'];
    const providerData = this.validateRequestBody(req, requiredFields);

    this.logOperation('create_provider_request', req, {
      adminId: user.id,
      providerName: providerData.name
    });

    const result = await providerService.createProvider(providerData, user.role);

    this.sendSuccess(res, result.data, result.message, 201, result.meta);
  });

  /**
   * 更新供应商（管理员）
   * PUT /api/providers/:id
   */
  updateProvider = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { id: providerId } = this.validatePathParams(req, ['id']);
    const updateData = req.body;

    this.logOperation('update_provider_request', req, {
      adminId: user.id,
      providerId,
      updateFields: Object.keys(updateData)
    });

    const result = await providerService.updateProvider(providerId, updateData, user.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 删除供应商（管理员）
   * DELETE /api/providers/:id
   */
  deleteProvider = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { id: providerId } = this.validatePathParams(req, ['id']);

    this.logOperation('delete_provider_request', req, {
      adminId: user.id,
      providerId
    });

    const result = await providerService.deleteProvider(providerId, user.role);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取供应商的可用订单
   * GET /api/providers/orders?accessKey=xxx
   */
  getAvailableOrders = this.asyncHandler(async (req, res) => {
    const { accessKey } = this.validateQueryParams(req, ['accessKey']);

    this.logOperation('get_available_orders_request', req, {
      accessKey: accessKey.substring(0, 10) + '...'
    });

    const result = await providerService.getAvailableOrders(accessKey);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取供应商的报价历史
   * GET /api/providers/quotes?accessKey=xxx
   */
  getQuoteHistory = this.asyncHandler(async (req, res) => {
    const { accessKey } = this.validateQueryParams(req, ['accessKey']);

    this.logOperation('get_quote_history_request', req, {
      accessKey: accessKey.substring(0, 10) + '...'
    });

    const result = await providerService.getQuoteHistory(accessKey);

    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });
}

module.exports = ProviderController;
