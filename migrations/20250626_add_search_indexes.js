/**
 * 添加搜索性能优化索引
 * 为订单和用户表添加必要的索引以提升搜索性能
 */

exports.up = function(knex) {
  return Promise.all([
    // 订单表索引
    knex.schema.table('orders', function(table) {
      // 基础查询索引
      table.index(['warehouse'], 'idx_orders_warehouse');
      table.index(['goods'], 'idx_orders_goods');
      table.index(['delivery_address'], 'idx_orders_delivery_address');
      table.index(['status'], 'idx_orders_status');
      table.index(['user_id'], 'idx_orders_user_id');
      table.index(['created_at'], 'idx_orders_created_at');
      table.index(['updated_at'], 'idx_orders_updated_at');

      // 复合索引用于常见查询组合
      table.index(['user_id', 'status'], 'idx_orders_user_status');
      table.index(['status', 'created_at'], 'idx_orders_status_created');
      table.index(['user_id', 'created_at'], 'idx_orders_user_created');

      // 搜索优化索引
      table.index(['warehouse', 'goods'], 'idx_orders_warehouse_goods');
    }),
    
    // 用户表索引
    knex.schema.table('users', function(table) {
      // 基础查询索引
      table.index(['email'], 'idx_users_email');
      table.index(['name'], 'idx_users_name');
      table.index(['role'], 'idx_users_role');
      table.index(['is_active'], 'idx_users_is_active');
      table.index(['created_at'], 'idx_users_created_at');
      table.index(['updated_at'], 'idx_users_updated_at');

      // 复合索引
      table.index(['role', 'is_active'], 'idx_users_role_active');
      table.index(['is_active', 'created_at'], 'idx_users_active_created');
    }),
    
    // 报价表索引（如果存在）
    knex.schema.hasTable('quotes').then(function(exists) {
      if (exists) {
        return knex.schema.table('quotes', function(table) {
          table.index(['order_id'], 'idx_quotes_order_id');
          table.index(['provider_id'], 'idx_quotes_provider_id');
          table.index(['price'], 'idx_quotes_price');
          table.index(['created_at'], 'idx_quotes_created_at');
          table.index(['order_id', 'price'], 'idx_quotes_order_price');
        });
      }
    }),
    
    // 供应商表索引（如果存在且有相应列）
    knex.schema.hasTable('providers').then(function(exists) {
      if (exists) {
        return Promise.all([
          knex.schema.hasColumn('providers', 'status'),
          knex.schema.hasColumn('providers', 'name'),
          knex.schema.hasColumn('providers', 'created_at'),
          knex.schema.hasColumn('providers', 'last_used_at')
        ]).then(function([hasStatus, hasName, hasCreatedAt, hasLastUsedAt]) {
          return knex.schema.table('providers', function(table) {
            // 只有当相应列存在时才创建索引
            if (hasStatus) {
              table.index(['status'], 'idx_providers_status');
            }
            if (hasName) {
              table.index(['name'], 'idx_providers_name');
            }
            if (hasCreatedAt) {
              table.index(['created_at'], 'idx_providers_created_at');
            }
            if (hasLastUsedAt) {
              table.index(['last_used_at'], 'idx_providers_last_used');
            }
          });
        });
      }
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    // 删除订单表索引
    knex.schema.table('orders', function(table) {
      table.dropIndex(['warehouse'], 'idx_orders_warehouse');
      table.dropIndex(['goods'], 'idx_orders_goods');
      table.dropIndex(['delivery_address'], 'idx_orders_delivery_address');
      table.dropIndex(['status'], 'idx_orders_status');
      table.dropIndex(['user_id'], 'idx_orders_user_id');
      table.dropIndex(['created_at'], 'idx_orders_created_at');
      table.dropIndex(['updated_at'], 'idx_orders_updated_at');
      table.dropIndex(['user_id', 'status'], 'idx_orders_user_status');
      table.dropIndex(['status', 'created_at'], 'idx_orders_status_created');
      table.dropIndex(['user_id', 'created_at'], 'idx_orders_user_created');
      table.dropIndex(['warehouse', 'goods'], 'idx_orders_warehouse_goods');
    }),
    
    // 删除用户表索引
    knex.schema.table('users', function(table) {
      table.dropIndex(['email'], 'idx_users_email');
      table.dropIndex(['name'], 'idx_users_name');
      table.dropIndex(['role'], 'idx_users_role');
      table.dropIndex(['is_active'], 'idx_users_is_active');
      table.dropIndex(['created_at'], 'idx_users_created_at');
      table.dropIndex(['updated_at'], 'idx_users_updated_at');
      table.dropIndex(['role', 'is_active'], 'idx_users_role_active');
      table.dropIndex(['is_active', 'created_at'], 'idx_users_active_created');
    }),
    
    // 删除报价表索引
    knex.schema.hasTable('quotes').then(function(exists) {
      if (exists) {
        return knex.schema.table('quotes', function(table) {
          table.dropIndex(['order_id'], 'idx_quotes_order_id');
          table.dropIndex(['provider_id'], 'idx_quotes_provider_id');
          table.dropIndex(['price'], 'idx_quotes_price');
          table.dropIndex(['created_at'], 'idx_quotes_created_at');
          table.dropIndex(['order_id', 'price'], 'idx_quotes_order_price');
        });
      }
    }),
    
    // 删除供应商表索引（安全删除）
    knex.schema.hasTable('providers').then(function(exists) {
      if (exists) {
        return knex.schema.table('providers', function(table) {
          // 安全删除索引，忽略不存在的索引
          try {
            table.dropIndex(['status'], 'idx_providers_status');
          } catch (e) { /* 忽略索引不存在的错误 */ }
          try {
            table.dropIndex(['name'], 'idx_providers_name');
          } catch (e) { /* 忽略索引不存在的错误 */ }
          try {
            table.dropIndex(['created_at'], 'idx_providers_created_at');
          } catch (e) { /* 忽略索引不存在的错误 */ }
          try {
            table.dropIndex(['last_used_at'], 'idx_providers_last_used');
          } catch (e) { /* 忽略索引不存在的错误 */ }
        });
      }
    })
  ]);
};
