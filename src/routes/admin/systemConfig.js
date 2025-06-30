/**
 * 管理员系统配置路由
 * 处理管理员对系统配置的管理操作
 */

const express = require('express');
const { auth, validation } = require('../../middleware');
const AdminSystemConfigController = require('../../controllers/admin/AdminSystemConfigController');

const router = express.Router();
const adminSystemConfigController = new AdminSystemConfigController();

// 所有路由都需要管理员权限
router.use(auth.authenticateToken);
router.use(auth.requireAdmin);

// 获取系统配置
router.get('/',
  adminSystemConfigController.getSystemConfig
);

// 更新系统配置
router.put('/',
  validation.validateSystemConfig,
  adminSystemConfigController.updateSystemConfig
);

// 验证系统配置（不保存）
router.post('/validate',
  adminSystemConfigController.validateSystemConfig
);

// 重置配置为默认值
router.post('/reset',
  adminSystemConfigController.resetConfigToDefault
);

// 初始化默认配置
router.post('/initialize',
  adminSystemConfigController.initializeDefaultConfigs
);

// 获取特定类型的配置
router.get('/type/:configType',
  adminSystemConfigController.getConfigsByType
);

// 获取配置历史
router.get('/history',
  validation.validatePagination,
  adminSystemConfigController.getConfigHistory
);

module.exports = router;
