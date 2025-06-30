/**
 * 管理员用户管理路由
 * 处理管理员对用户的管理操作
 */

const express = require('express');
const { auth, validation } = require('../../middleware');
const AdminUserController = require('../../controllers/admin/AdminUserController');

const router = express.Router();
const adminUserController = new AdminUserController();

// 所有路由都需要管理员权限
router.use(auth.authenticateToken);
router.use(auth.requireAdmin);

// 获取用户列表
router.get('/list',
  validation.validatePagination,
  validation.validateSearch,
  validation.validateSorting,
  adminUserController.getUserList
);

// 获取所有用户列表
router.get('/all',
  validation.validatePagination,
  validation.validateSearch,
  adminUserController.getAllUsers
);

// 创建用户
router.post('/',
  validation.validateUserCreation,
  adminUserController.createUser
);

// 获取用户详情
router.get('/:userId',
  adminUserController.getUserById
);

// 更新用户信息
router.put('/:userId',
  adminUserController.updateUser
);

// 删除用户
router.delete('/:userId',
  adminUserController.deleteUser
);

// 激活/禁用用户
router.post('/:userId/toggle-status',
  adminUserController.toggleUserStatus
);

// 重置用户密码
router.post('/:userId/reset-password',
  adminUserController.resetUserPassword
);

// 批量操作用户
router.post('/batch',
  adminUserController.batchOperateUsers
);

// 导出用户数据
router.get('/export',
  adminUserController.exportUsers
);

// 获取用户统计信息
router.get('/stats',
  adminUserController.getUserStats
);

// 获取全局用户统计信息
router.get('/global-stats',
  adminUserController.getGlobalUserStats
);

module.exports = router;
