/**
 * 创建物流供应商表
 */

exports.up = function(knex) {
  return knex.schema.createTable('providers', function(table) {
    table.string('id', 36).primary().comment('供应商ID (UUID)');
    table.string('name', 100).unique().notNullable().comment('供应商名称');
    table.string('api_key_hash', 255).notNullable().comment('API密钥哈希值');
    table.string('wechat_webhook_url', 500).comment('企业微信Webhook地址');
    table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active').comment('供应商状态');
    table.timestamp('last_used_at').comment('最后使用时间');
    table.timestamps(true, true);

    // 索引
    table.index('name');
    table.index(['name', 'status'], 'idx_provider_name_status');
    table.index('status');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('providers');
};
