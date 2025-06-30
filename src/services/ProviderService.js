/**
 * 供应商业务逻辑服务
 * 处理供应商相关的业务逻辑
 */

const BaseService = require('./BaseService');
const { providerRepo, orderRepo, quoteRepo } = require('../repositories');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class ProviderService extends BaseService {
  constructor() {
    super('ProviderService');
    this.allowedSortFields = ['name', 'createdAt', 'status', 'lastUsedAt'];
  }

  /**
   * 获取供应商列表
   * @param {Object} options - 查询选项
   * @param {string} userRole - 用户角色
   * @returns {Promise<Object>} 供应商列表
   */
  async getProviders(options = {}, userRole) {
    return this.handleAsyncOperation(async () => {
      // 验证管理员权限
      if (userRole !== 'admin') {
        throw this.createBusinessError('无权限查看供应商列表', 'ACCESS_DENIED', 403);
      }

      // 构建查询选项
      const queryOptions = {
        page: options.page || 1,
        pageSize: Math.min(options.pageSize || 20, 100),
        orderBy: options.orderBy || [{ column: 'createdAt', order: 'desc' }]
      };

      // 添加过滤条件
      if (options.status) {
        queryOptions.status = options.status;
      }
      if (options.search) {
        queryOptions.search = options.search;
      }

      const result = await providerRepo.findWithPagination(queryOptions);

      this.logOperation('providers_retrieved', {
        userRole,
        totalCount: result.total,
        pageSize: queryOptions.pageSize
      });

      return this.buildResponse(result.data, '获取供应商列表成功', result.meta);
    }, 'getProviders', { userRole });
  }

  /**
   * 根据ID获取供应商详情
   * @param {string} providerId - 供应商ID
   * @param {string} userRole - 用户角色
   * @returns {Promise<Object>} 供应商详情
   */
  async getProviderById(providerId, userRole) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ providerId }, ['providerId']);

      // 验证权限
      if (userRole !== 'admin' && userRole !== 'provider') {
        throw this.createBusinessError('无权限查看供应商详情', 'ACCESS_DENIED', 403);
      }

      const provider = await providerRepo.findById(providerId);
      if (!provider) {
        throw this.createBusinessError('供应商不存在', 'PROVIDER_NOT_FOUND', 404);
      }

      // 移除敏感信息
      const { api_key_hash, ...safeProvider } = provider;

      this.logOperation('provider_retrieved', {
        providerId,
        userRole
      });

      return this.buildResponse(safeProvider, '获取供应商详情成功');
    }, 'getProviderById', { providerId });
  }

  /**
   * 通过访问密钥获取供应商详情
   * @param {string} accessKey - 访问密钥
   * @returns {Promise<Object>} 供应商详情
   */
  async getProviderByAccessKey(accessKey) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ accessKey }, ['accessKey']);

      const provider = await providerRepo.validateAccess(accessKey);
      if (!provider) {
        throw this.createBusinessError('无效的访问密钥', 'INVALID_ACCESS_KEY', 401);
      }

      // 移除敏感信息
      const { api_key_hash, ...safeProvider } = provider;

      this.logOperation('provider_retrieved_by_key', {
        providerId: provider.id
      });

      return this.buildResponse(safeProvider, '获取供应商详情成功');
    }, 'getProviderByAccessKey');
  }

  /**
   * 创建供应商
   * @param {Object} providerData - 供应商数据
   * @param {string} userRole - 用户角色
   * @returns {Promise<Object>} 创建的供应商
   */
  async createProvider(providerData, userRole) {
    return this.handleAsyncOperation(async () => {
      // 验证管理员权限
      if (userRole !== 'admin') {
        throw this.createBusinessError('无权限创建供应商', 'ACCESS_DENIED', 403);
      }

      this.validateRequiredParams(providerData, ['name']);

      // 清理和验证数据
      const cleanData = {
        id: uuidv4(),
        name: providerData.name.trim(),
        wechat_webhook_url: providerData.wechatWebhookUrl?.trim() || null,
        status: 'active'
      };

      // 验证供应商名称长度
      if (cleanData.name.length < 2 || cleanData.name.length > 100) {
        throw this.createBusinessError('供应商名称长度必须在2-100字符之间');
      }

      // 检查名称是否已存在
      const existingProvider = await providerRepo.findByName(cleanData.name);
      if (existingProvider) {
        throw this.createBusinessError('供应商名称已存在', 'PROVIDER_NAME_EXISTS', 400);
      }

      // 生成访问密钥
      const accessKey = providerData.customAccessKey || this.generateAccessKey();
      cleanData.api_key_hash = await bcrypt.hash(accessKey, 12);

      // 创建供应商
      const newProvider = await providerRepo.create(cleanData);

      this.logOperation('provider_created', {
        providerId: newProvider.id,
        providerName: newProvider.name,
        createdBy: userRole
      });

      // 返回结果包含访问密钥（仅此一次）
      const { api_key_hash, ...safeProvider } = newProvider;
      return this.buildResponse({
        ...safeProvider,
        accessKey // 仅在创建时返回
      }, '供应商创建成功');
    }, 'createProvider', { name: providerData.name });
  }

  /**
   * 生成访问密钥
   * @returns {string} 访问密钥
   */
  generateAccessKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 更新供应商
   * @param {string} providerId - 供应商ID
   * @param {Object} updateData - 更新数据
   * @param {string} userRole - 用户角色
   * @returns {Promise<Object>} 更新后的供应商
   */
  async updateProvider(providerId, updateData, userRole) {
    return this.handleAsyncOperation(async () => {
      // 验证管理员权限
      if (userRole !== 'admin') {
        throw this.createBusinessError('无权限更新供应商', 'ACCESS_DENIED', 403);
      }

      this.validateRequiredParams({ providerId }, ['providerId']);

      // 获取现有供应商
      const existingProvider = await providerRepo.findById(providerId);
      if (!existingProvider) {
        throw this.createBusinessError('供应商不存在', 'PROVIDER_NOT_FOUND', 404);
      }

      // 过滤允许更新的字段
      const allowedFields = ['name', 'wechatWebhookUrl', 'status'];
      const cleanUpdateData = {};
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          if (field === 'name') {
            cleanUpdateData.name = updateData[field].trim();
          } else if (field === 'wechatWebhookUrl') {
            cleanUpdateData.wechat_webhook_url = updateData[field]?.trim() || null;
          } else if (field === 'status') {
            cleanUpdateData.status = updateData[field];
          }
        }
      }

      if (Object.keys(cleanUpdateData).length === 0) {
        throw this.createBusinessError('没有有效的更新字段', 'NO_VALID_FIELDS', 400);
      }

      // 验证名称唯一性
      if (cleanUpdateData.name && cleanUpdateData.name !== existingProvider.name) {
        const nameExists = await providerRepo.findByName(cleanUpdateData.name);
        if (nameExists) {
          throw this.createBusinessError('供应商名称已存在', 'PROVIDER_NAME_EXISTS', 400);
        }
      }

      // 更新供应商
      const updatedProvider = await providerRepo.updateById(providerId, cleanUpdateData);

      this.logOperation('provider_updated', {
        providerId,
        updatedFields: Object.keys(cleanUpdateData),
        updatedBy: userRole
      });

      // 移除敏感信息
      const { api_key_hash, ...safeProvider } = updatedProvider;
      return this.buildResponse(safeProvider, '供应商更新成功');
    }, 'updateProvider', { providerId });
  }

  /**
   * 删除供应商
   * @param {string} providerId - 供应商ID
   * @param {string} userRole - 用户角色
   * @returns {Promise<Object>} 删除结果
   */
  async deleteProvider(providerId, userRole) {
    return this.handleAsyncOperation(async () => {
      // 验证管理员权限
      if (userRole !== 'admin') {
        throw this.createBusinessError('无权限删除供应商', 'ACCESS_DENIED', 403);
      }

      this.validateRequiredParams({ providerId }, ['providerId']);

      // 获取供应商信息
      const existingProvider = await providerRepo.findById(providerId);
      if (!existingProvider) {
        throw this.createBusinessError('供应商不存在', 'PROVIDER_NOT_FOUND', 404);
      }

      // 检查是否有关联的报价
      const hasQuotes = await quoteRepo.hasProviderQuotes(providerId);
      if (hasQuotes) {
        // 如果有报价，只是禁用供应商而不是删除
        const updatedProvider = await providerRepo.updateById(providerId, { status: 'inactive' });

        this.logOperation('provider_disabled_with_quotes', {
          providerId,
          providerName: existingProvider.name,
          reason: 'has_quotes'
        });

        const { api_key_hash, ...safeProvider } = updatedProvider;
        return this.buildResponse(safeProvider, '供应商已禁用（因为有关联报价）');
      }

      // 删除供应商
      await providerRepo.deleteById(providerId);

      this.logOperation('provider_deleted', {
        providerId,
        providerName: existingProvider.name
      });

      return this.buildResponse({ providerId }, '供应商删除成功');
    }, 'deleteProvider', { providerId });
  }

  /**
   * 获取供应商的可用订单
   * @param {string} accessKey - 访问密钥
   * @returns {Promise<Object>} 可用订单列表
   */
  async getAvailableOrders(accessKey) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ accessKey }, ['accessKey']);

      // 验证供应商访问权限
      const provider = await providerRepo.validateAccess(accessKey);
      if (!provider) {
        throw this.createBusinessError('无效的访问密钥', 'INVALID_ACCESS_KEY', 401);
      }

      // 获取活跃状态的订单
      const orders = await orderRepo.findAvailableOrders();

      this.logOperation('available_orders_retrieved', {
        providerId: provider.id,
        orderCount: orders.length
      });

      return this.buildResponse(orders, '获取可用订单成功');
    }, 'getAvailableOrders');
  }

  /**
   * 获取供应商的报价历史
   * @param {string} accessKey - 访问密钥
   * @returns {Promise<Object>} 报价历史
   */
  async getQuoteHistory(accessKey) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ accessKey }, ['accessKey']);

      // 验证供应商访问权限
      const provider = await providerRepo.validateAccess(accessKey);
      if (!provider) {
        throw this.createBusinessError('无效的访问密钥', 'INVALID_ACCESS_KEY', 401);
      }

      // 获取供应商的报价历史
      const quotes = await quoteRepo.findByProvider(provider.name, {
        orderBy: [{ column: 'createdAt', direction: 'desc' }],
        limit: 100
      });

      this.logOperation('quote_history_retrieved', {
        providerId: provider.id,
        quoteCount: quotes.length
      });

      return this.buildResponse(quotes, '获取报价历史成功');
    }, 'getQuoteHistory');
  }
}

module.exports = ProviderService;
