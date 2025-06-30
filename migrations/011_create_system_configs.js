/**
 * 创建系统配置表
 * 用于存储系统级别的配置信息
 */

exports.up = function(knex) {
  return knex.schema.createTable('system_configs', function(table) {
    // 主键
    table.increments('id').primary();
    
    // 配置键名（唯一）
    table.string('config_key', 100).notNullable().unique();
    
    // 配置值（JSON格式存储）
    table.text('config_value').notNullable();
    
    // 配置描述
    table.string('description', 500).nullable();
    
    // 配置类型
    table.enum('config_type', ['system', 'user', 'notification', 'security', 'file'])
         .notNullable()
         .defaultTo('system');
    
    // 是否启用
    table.boolean('is_enabled').notNullable().defaultTo(true);
    
    // 时间戳
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // 索引
    table.index(['config_key'], 'idx_system_configs_key');
    table.index(['config_type'], 'idx_system_configs_type');
    table.index(['is_enabled'], 'idx_system_configs_enabled');
    table.index(['created_at'], 'idx_system_configs_created');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('system_configs');
};

// 迁移完成后插入默认配置
exports.seed = async function(knex) {
  // 检查是否已有配置数据
  const existingConfigs = await knex('system_configs').select('id').limit(1);
  if (existingConfigs.length > 0) {
    return; // 已有数据，跳过种子数据插入
  }

  // 插入默认配置
  const defaultConfigs = [
    {
      config_key: 'SYSTEM_BASIC',
      config_value: JSON.stringify({
        siteName: '物流报价平台',
        sessionTimeout: 15,
        maxFileSize: 10,
        allowedFileTypes: 'jpg,jpeg,png,pdf,doc,docx,xls,xlsx'
      }),
      description: '系统基本配置',
      config_type: 'system',
      is_enabled: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      config_key: 'SYSTEM_FEATURES',
      config_value: JSON.stringify({
        enableRegistration: false,
        enableEmailNotification: true,
        enableWechatNotification: true
      }),
      description: '系统功能开关配置',
      config_type: 'system',
      is_enabled: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      config_key: 'SYSTEM_SECURITY',
      config_value: JSON.stringify({
        passwordMinLength: 6,
        passwordRequireSpecialChar: false,
        loginMaxAttempts: 5,
        loginLockoutDuration: 15
      }),
      description: '系统安全配置',
      config_type: 'security',
      is_enabled: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  await knex('system_configs').insert(defaultConfigs);
};
