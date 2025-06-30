/**
 * 创建导入记录表
 * 用于跟踪数据导入的历史记录和状态
 */

exports.up = function(knex) {
  return knex.schema.createTable('import_records', function(table) {
    // 主键
    table.string('id', 36).primary();
    
    // 导入类型 (orders, quotes, users, etc.)
    table.string('type', 50).notNullable();
    
    // 文件信息
    table.string('file_name', 255).notNullable();
    table.integer('file_size').notNullable();
    
    // 导入状态 (processing, completed, failed)
    table.string('status', 20).notNullable().defaultTo('processing');
    
    // 执行导入的管理员ID
    table.string('admin_id', 36).notNullable();
    
    // 处理统计
    table.integer('records_processed').defaultTo(0);
    table.integer('records_succeeded').defaultTo(0);
    table.integer('records_failed').defaultTo(0);
    
    // 错误信息
    table.text('error_message').nullable();
    
    // 时间戳
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    
    // 索引
    table.index(['type', 'status']);
    table.index(['admin_id']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('import_records');
};
