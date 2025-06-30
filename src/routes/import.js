/**
 * 导入相关路由
 * 处理各种数据的导入功能
 */

const express = require('express');
const { auth, validation } = require('../middleware');
const ImportController = require('../controllers/ImportController');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const importController = new ImportController();

// 配置文件上传
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持CSV和Excel文件格式'));
    }
  }
});

// 导入订单数据
router.post('/orders',
  auth.authenticateToken,
  auth.requireAdmin,
  upload.single('file'),
  validation.validateFileUpload,
  importController.importOrders
);

// 获取导入历史
router.get('/history',
  auth.authenticateToken,
  auth.requireAdmin,
  validation.validatePagination,
  importController.getImportHistory
);

// 获取导入模板
router.get('/template/:type',
  auth.authenticateToken,
  auth.requireAdmin,
  importController.getImportTemplate
);

module.exports = router;
