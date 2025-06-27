/**
 * 创建认证审计日志表
 */

exports.up = function(knex) {
  return knex.schema.createTable('auth_logs', function(table) {
    table.increments('id').primary().comment('主键ID');
    table.string('provider', 100).comment('供应商名称');
    table.boolean('success').notNullable().comment('认证是否成功');
    table.string('ip', 45).comment('客户端IP地址');
    table.string('reason', 200).comment('认证结果原因');
    table.string('type', 50).defaultTo('provider_auth').comment('认证类型');
    table.timestamp('timestamp').defaultTo(knex.fn.now()).comment('认证时间');
    
    // 索引
    table.index(['provider', 'timestamp'], 'idx_auth_logs_provider_time');
    table.index(['success', 'timestamp'], 'idx_auth_logs_success_time');
    table.index('ip');
    table.index('timestamp');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('auth_logs');
};
