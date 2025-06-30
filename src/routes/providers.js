/**
 * 供应商管理路由
 * 处理供应商的CRUD操作
 */

const express = require('express');
const { auth, validation } = require('../middleware');
const { providerController } = require('../controllers');

const router = express.Router();

// 获取供应商列表（管理员）
router.get('/',
  auth.authenticateToken,
  auth.requireAdmin,
  validation.validatePagination,
  validation.validateSearch,
  providerController.getProviders
);

// 获取供应商详情
router.get('/:id',
  auth.authenticateToken,
  validation.validateProviderId,
  providerController.getProviderById
);

// 通过访问密钥获取供应商详情（公开接口）
router.get('/details',
  validation.validateProviderAccessKey,
  providerController.getProviderByKey
);

// 创建供应商（管理员）
router.post('/',
  auth.authenticateToken,
  auth.requireAdmin,
  validation.validateProviderCreation,
  providerController.createProvider
);

// 更新供应商（管理员）
router.put('/:id',
  auth.authenticateToken,
  auth.requireAdmin,
  validation.validateProviderId,
  validation.validateProviderUpdate,
  providerController.updateProvider
);

// 删除供应商（管理员）
router.delete('/:id',
  auth.authenticateToken,
  auth.requireAdmin,
  validation.validateProviderId,
  providerController.deleteProvider
);

// 获取供应商的可用订单（供应商接口）
router.get('/orders',
  validation.validateProviderAccessKey,
  providerController.getAvailableOrders
);

// 获取供应商的报价历史（供应商接口）
router.get('/quotes',
  validation.validateProviderAccessKey,
  providerController.getQuoteHistory
);

module.exports = router;
