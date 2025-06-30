/**
 * 创建用户微信配置表
 * 用于存储用户的微信通知配置
 */

exports.up = function(knex) {
  return knex.schema.createTable('user_wechat_configs', function(table) {
    // 主键
    table.string('id', 36).primary();
    
    // 用户ID（外键）
    table.string('user_id', 36).notNullable().unique();
    
    // 微信配置
    table.boolean('enabled').defaultTo(false).comment('是否启用微信通知');
    table.string('webhook_url', 500).nullable().comment('微信Webhook URL');
    table.string('secret', 255).nullable().comment('加密密钥');
    
    // 通知设置
    table.boolean('notify_order_created').defaultTo(true).comment('订单创建通知');
    table.boolean('notify_quote_received').defaultTo(true).comment('报价接收通知');
    table.boolean('notify_quote_selected').defaultTo(true).comment('报价选择通知');
    table.boolean('notify_order_completed').defaultTo(true).comment('订单完成通知');
    
    // 时间戳
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // 外键约束（注释掉以支持管理员用户）
    // table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // 索引
    table.index(['user_id']);
    table.index(['enabled']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('user_wechat_configs');
};
