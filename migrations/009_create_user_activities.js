/**
 * 创建用户活动记录表
 * 用于跟踪用户的各种操作和活动
 */

exports.up = function(knex) {
  return knex.schema.createTable('user_activities', function(table) {
    // 主键
    table.string('id', 36).primary();
    
    // 用户信息
    table.string('user_id', 36).notNullable();
    table.string('user_email', 255).notNullable();
    table.string('user_name', 100).notNullable();
    
    // 活动信息
    table.string('action', 100).notNullable(); // 操作类型
    table.string('resource_type', 50).nullable(); // 资源类型 (order, quote, user, etc.)
    table.string('resource_id', 50).nullable(); // 资源ID
    table.text('description').notNullable(); // 活动描述
    table.json('metadata').nullable(); // 额外的元数据
    
    // 请求信息
    table.string('ip_address', 45).nullable(); // IP地址
    table.string('user_agent', 500).nullable(); // 用户代理
    table.string('method', 10).nullable(); // HTTP方法
    table.string('url', 500).nullable(); // 请求URL
    
    // 结果信息
    table.string('status', 20).defaultTo('success'); // success, failed, error
    table.text('error_message').nullable(); // 错误信息
    
    // 时间戳
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // 外键约束
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // 索引
    table.index(['user_id', 'created_at']);
    table.index(['action']);
    table.index(['resource_type', 'resource_id']);
    table.index(['status']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('user_activities');
};
