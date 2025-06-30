/**
 * 导入业务逻辑服务
 * 处理各种数据的导入功能
 */

const BaseService = require('./BaseService');
const { orderRepo, userRepo } = require('../repositories');
const ImportRepository = require('../repositories/ImportRepository');
const fs = require('fs').promises;
const path = require('path');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');

class ImportService extends BaseService {
  constructor() {
    super('ImportService');
    this.importRepo = new ImportRepository();
  }

  /**
   * 导入订单数据
   * @param {Object} file - 上传的文件对象
   * @param {string} adminId - 管理员ID
   * @returns {Promise<Object>} 导入结果
   */
  async importOrders(file, adminId) {
    return this.handleAsyncOperation(async () => {
      this.validateRequiredParams({ file, adminId }, ['file', 'adminId']);

      // 创建导入记录
      const importRecord = {
        id: uuidv4(),
        type: 'orders',
        fileName: file.originalname,
        fileSize: file.size,
        status: 'processing',
        adminId,
        createdAt: new Date().toISOString()
      };

      await this.importRepo.createImportRecord(importRecord);

      try {
        // 解析文件
        const data = await this.parseFile(file);
        
        // 验证数据格式
        const validationResult = this.validateOrderData(data);
        if (!validationResult.isValid) {
          await this.importRepo.updateImportRecord(importRecord.id, {
            status: 'failed',
            errorMessage: validationResult.errors.join('; '),
            completedAt: new Date().toISOString()
          });
          
          throw this.createBusinessError(
            `数据验证失败: ${validationResult.errors.join('; ')}`,
            'VALIDATION_FAILED',
            400
          );
        }

        // 导入数据
        const importResult = await this.processOrderImport(data, adminId);

        // 更新导入记录
        await this.importRepo.updateImportRecord(importRecord.id, {
          status: 'completed',
          recordsProcessed: importResult.processed,
          recordsSucceeded: importResult.succeeded,
          recordsFailed: importResult.failed,
          completedAt: new Date().toISOString()
        });

        // 清理临时文件
        await this.cleanupFile(file.path);

        this.logOperation('orders_imported', {
          importId: importRecord.id,
          fileName: file.originalname,
          processed: importResult.processed,
          succeeded: importResult.succeeded,
          failed: importResult.failed
        });

        return this.buildResponse({
          importId: importRecord.id,
          processed: importResult.processed,
          succeeded: importResult.succeeded,
          failed: importResult.failed,
          errors: importResult.errors
        }, `订单导入完成，成功导入 ${importResult.succeeded} 条记录`);

      } catch (error) {
        // 更新导入记录为失败状态
        await this.importRepo.updateImportRecord(importRecord.id, {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date().toISOString()
        });

        // 清理临时文件
        await this.cleanupFile(file.path);
        
        throw error;
      }
    }, 'importOrders', { fileName: file.originalname, adminId });
  }

  /**
   * 解析上传的文件
   * @param {Object} file - 文件对象
   * @returns {Promise<Array>} 解析后的数据
   */
  async parseFile(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (ext === '.csv') {
      return this.parseCSV(file.path);
    } else if (ext === '.xlsx' || ext === '.xls') {
      return this.parseExcel(file.path);
    } else {
      throw this.createBusinessError('不支持的文件格式', 'UNSUPPORTED_FILE_FORMAT', 400);
    }
  }

  /**
   * 解析CSV文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<Array>} 解析后的数据
   */
  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = require('fs').createReadStream(filePath);
      
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * 解析Excel文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<Array>} 解析后的数据
   */
  async parseExcel(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet);
    } catch (error) {
      throw this.createBusinessError('Excel文件解析失败', 'EXCEL_PARSE_ERROR', 400);
    }
  }

  /**
   * 验证订单数据
   * @param {Array} data - 订单数据
   * @returns {Object} 验证结果
   */
  validateOrderData(data) {
    const errors = [];
    const requiredFields = ['warehouse', 'goods', 'deliveryAddress'];

    if (!Array.isArray(data) || data.length === 0) {
      errors.push('文件中没有有效数据');
      return { isValid: false, errors };
    }

    data.forEach((row, index) => {
      const rowNumber = index + 1;
      
      // 检查必需字段
      requiredFields.forEach(field => {
        if (!row[field] || String(row[field]).trim() === '') {
          errors.push(`第${rowNumber}行缺少必需字段: ${field}`);
        }
      });

      // 验证字段长度
      if (row.warehouse && String(row.warehouse).length > 100) {
        errors.push(`第${rowNumber}行仓库名称过长（最多100字符）`);
      }
      
      if (row.goods && String(row.goods).length > 500) {
        errors.push(`第${rowNumber}行货物描述过长（最多500字符）`);
      }
      
      if (row.deliveryAddress && String(row.deliveryAddress).length > 200) {
        errors.push(`第${rowNumber}行配送地址过长（最多200字符）`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 处理订单导入
   * @param {Array} data - 订单数据
   * @param {string} adminId - 管理员ID
   * @returns {Promise<Object>} 导入结果
   */
  async processOrderImport(data, adminId) {
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const errors = [];

    for (const row of data) {
      processed++;
      
      try {
        // 创建订单数据（使用数据库字段名）
        const orderData = {
          warehouse: String(row.warehouse).trim(),
          goods: String(row.goods).trim(),
          delivery_address: String(row.deliveryAddress).trim(),
          status: 'active', // 使用数据库中定义的状态值
          user_id: adminId // 使用正确的字段名
        };

        // 创建订单
        await orderRepo.create(orderData);
        succeeded++;

      } catch (error) {
        failed++;
        errors.push(`第${processed}行导入失败: ${error.message}`);
        
        this.logOperation('order_import_row_failed', {
          rowNumber: processed,
          error: error.message,
          data: row
        });
      }
    }

    return {
      processed,
      succeeded,
      failed,
      errors
    };
  }

  /**
   * 获取导入历史
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 导入历史
   */
  async getImportHistory(options = {}) {
    return this.handleAsyncOperation(async () => {
      const result = await this.importRepo.findWithPagination(options);

      this.logOperation('import_history_retrieved', {
        recordCount: result.data.length,
        totalCount: result.meta.total
      });

      return this.buildResponse(result.data, '导入历史获取成功', result.meta);
    }, 'getImportHistory', { options });
  }

  /**
   * 获取导入模板
   * @param {string} type - 模板类型
   * @returns {Promise<Object>} 模板文件
   */
  async getImportTemplate(type) {
    return this.handleAsyncOperation(async () => {
      let templateData = [];

      switch (type) {
        case 'orders':
          templateData = [
            {
              warehouse: '示例仓库',
              goods: '示例货物描述',
              deliveryAddress: '示例配送地址'
            }
          ];
          break;
        case 'quotes':
          templateData = [
            {
              orderId: '订单ID',
              provider: '供应商名称',
              price: '报价金额',
              deliveryTime: '配送时间'
            }
          ];
          break;
        case 'users':
          templateData = [
            {
              email: 'user@example.com',
              name: '用户姓名',
              role: 'user'
            }
          ];
          break;
      }

      // 生成Excel模板
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      this.logOperation('import_template_generated', {
        templateType: type,
        sampleRows: templateData.length
      });

      return this.buildResponse({
        buffer,
        fileName: `${type}_import_template.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }, '导入模板生成成功');
    }, 'getImportTemplate', { type });
  }

  /**
   * 清理临时文件
   * @param {string} filePath - 文件路径
   */
  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      this.logOperation('file_cleanup_failed', {
        filePath,
        error: error.message
      });
    }
  }
}

module.exports = ImportService;
