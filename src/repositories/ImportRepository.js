/**
 * 导入记录数据访问层
 * 处理导入记录相关的数据库操作
 */

const BaseRepository = require('./BaseRepository');
const { logger } = require('../config/logger');

class ImportRepository extends BaseRepository {
  constructor() {
    super('import_records', 'id', []);
  }

  /**
   * 创建导入记录
   * @param {Object} importData - 导入记录数据
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object>} 创建的导入记录
   */
  async createImportRecord(importData, trx = null) {
    try {
      const record = {
        id: importData.id,
        type: importData.type,
        file_name: importData.fileName,
        file_size: importData.fileSize,
        status: importData.status,
        admin_id: importData.adminId,
        records_processed: importData.recordsProcessed || 0,
        records_succeeded: importData.recordsSucceeded || 0,
        records_failed: importData.recordsFailed || 0,
        error_message: importData.errorMessage || null,
        created_at: importData.createdAt,
        completed_at: importData.completedAt || null
      };

      const result = await this.create(record, trx);
      
      logger.info('导入记录创建成功', {
        importId: result.id,
        type: result.type,
        fileName: result.file_name
      });

      return this.transformImportRecord(result);
    } catch (error) {
      logger.error('创建导入记录失败', {
        importData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 更新导入记录
   * @param {string} importId - 导入记录ID
   * @param {Object} updateData - 更新数据
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object>} 更新后的导入记录
   */
  async updateImportRecord(importId, updateData, trx = null) {
    try {
      const dbUpdateData = {};
      
      if (updateData.status) dbUpdateData.status = updateData.status;
      if (updateData.recordsProcessed !== undefined) dbUpdateData.records_processed = updateData.recordsProcessed;
      if (updateData.recordsSucceeded !== undefined) dbUpdateData.records_succeeded = updateData.recordsSucceeded;
      if (updateData.recordsFailed !== undefined) dbUpdateData.records_failed = updateData.recordsFailed;
      if (updateData.errorMessage !== undefined) dbUpdateData.error_message = updateData.errorMessage;
      if (updateData.completedAt) dbUpdateData.completed_at = updateData.completedAt;

      const result = await this.updateById(importId, dbUpdateData, trx);
      
      logger.info('导入记录更新成功', {
        importId,
        updateData: dbUpdateData
      });

      return this.transformImportRecord(result);
    } catch (error) {
      logger.error('更新导入记录失败', {
        importId,
        updateData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 分页查询导入记录
   * @param {Object} options - 查询选项
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object>} 分页结果
   */
  async findWithPagination(options = {}, trx = null) {
    try {
      const {
        page = 1,
        pageSize = 20,
        orderBy = [{ column: 'created_at', order: 'desc' }],
        status,
        type,
        startDate,
        endDate
      } = options;

      let query = this.db(this.tableName);

      if (trx) {
        query = query.transacting(trx);
      }

      // 应用过滤条件
      if (status) {
        query = query.where('status', status);
      }

      if (type) {
        query = query.where('type', type);
      }

      if (startDate) {
        query = query.where('created_at', '>=', startDate);
      }

      if (endDate) {
        query = query.where('created_at', '<=', endDate);
      }

      // 获取总数
      const totalQuery = query.clone();
      const totalResult = await totalQuery.count('id as count').first();
      const total = parseInt(totalResult.count);

      // 应用排序和分页
      orderBy.forEach(sort => {
        query = query.orderBy(sort.column, sort.order);
      });

      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);

      // 执行查询
      const records = await query.select('*');

      // 转换数据格式
      const transformedRecords = records.map(record => this.transformImportRecord(record));

      const meta = {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      };

      logger.info('导入记录分页查询成功', {
        total,
        page,
        pageSize,
        filters: { status, type, startDate, endDate }
      });

      return {
        data: transformedRecords,
        meta
      };
    } catch (error) {
      logger.error('导入记录分页查询失败', {
        options,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 根据ID查找导入记录
   * @param {string} importId - 导入记录ID
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<Object|null>} 导入记录或null
   */
  async findById(importId, trx = null) {
    try {
      const record = await this.findOne({ id: importId }, trx);
      return record ? this.transformImportRecord(record) : null;
    } catch (error) {
      logger.error('根据ID查找导入记录失败', {
        importId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 转换导入记录数据格式
   * @param {Object} record - 数据库记录
   * @returns {Object} 转换后的记录
   */
  transformImportRecord(record) {
    if (!record) return null;

    return {
      id: record.id,
      type: record.type,
      fileName: record.file_name,
      fileSize: record.file_size,
      status: record.status,
      adminId: record.admin_id,
      recordsProcessed: record.records_processed || 0,
      recordsSucceeded: record.records_succeeded || 0,
      recordsFailed: record.records_failed || 0,
      errorMessage: record.error_message,
      createdAt: record.created_at,
      completedAt: record.completed_at
    };
  }

  /**
   * 删除过期的导入记录
   * @param {number} daysOld - 保留天数
   * @param {Object} trx - 可选的事务对象
   * @returns {Promise<number>} 删除的记录数
   */
  async deleteOldRecords(daysOld = 30, trx = null) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let query = this.db(this.tableName)
        .where('created_at', '<', cutoffDate.toISOString());

      if (trx) {
        query = query.transacting(trx);
      }

      const deletedCount = await query.del();

      logger.info('过期导入记录清理完成', {
        daysOld,
        cutoffDate: cutoffDate.toISOString(),
        deletedCount
      });

      return deletedCount;
    } catch (error) {
      logger.error('删除过期导入记录失败', {
        daysOld,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ImportRepository;
