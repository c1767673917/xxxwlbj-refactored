/**
 * 导入控制器
 * 处理各种数据的导入功能
 */

const BaseController = require('./BaseController');
const ImportService = require('../services/ImportService');
const { getFieldConfig } = require('../config/fieldConfig');

class ImportController extends BaseController {
  constructor() {
    super('ImportController');
    this.importService = new ImportService();
  }

  /**
   * 导入订单数据
   * POST /api/import/orders
   */
  importOrders = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);

    // 检查是否有上传的文件
    if (!req.file) {
      return this.sendError(res, '请选择要导入的文件', 400, 'NO_FILE_UPLOADED');
    }

    this.logOperation('import_orders_request', req, {
      adminId: user.id,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });

    const result = await this.importService.importOrders(req.file, user.id);
    
    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取导入历史
   * GET /api/import/history
   */
  getImportHistory = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    
    // 提取查询参数
    const pagination = this.extractPaginationParams(req);
    const orderBy = this.extractSortParams(req, ['createdAt', 'status', 'fileName']);
    const filters = this.extractFilterParams(req, ['status', 'type', 'startDate', 'endDate']);

    const options = {
      ...pagination,
      orderBy,
      ...filters
    };

    this.logOperation('get_import_history_request', req, {
      adminId: user.id,
      options
    });

    const result = await this.importService.getImportHistory(options);
    
    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });

  /**
   * 获取导入模板
   * GET /api/import/template/:type
   */
  getImportTemplate = this.asyncHandler(async (req, res) => {
    const user = this.getCurrentUser(req);
    const { type } = this.validatePathParams(req, ['type']);

    // 验证模板类型
    const allowedTypes = ['orders', 'quotes', 'users'];
    if (!allowedTypes.includes(type)) {
      return this.sendError(res, '不支持的模板类型', 400, 'INVALID_TEMPLATE_TYPE');
    }

    this.logOperation('get_import_template_request', req, {
      adminId: user.id,
      templateType: type
    });

    const result = await this.importService.getImportTemplate(type);
    
    // 设置下载响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_import_template.xlsx"`);
    
    this.sendSuccess(res, result.data, result.message, 200, result.meta);
  });
}

module.exports = ImportController;
