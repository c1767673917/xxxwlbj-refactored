/**
 * 字段配置管理
 * 统一管理各模块的可排序字段、可过滤字段和可更新字段
 * 
 * 配置说明：
 * - sortFields: 允许排序的字段列表
 * - filterFields: 允许过滤的字段列表
 * - searchFields: 允许搜索的字段列表
 * - updateFields: 允许更新的字段配置（按角色区分）
 * - requiredFields: 创建时必需的字段列表
 */

const fieldConfig = {
  // 订单模块字段配置
  order: {
    // 允许排序的字段
    sortFields: [
      'createdAt',
      'updatedAt', 
      'status',
      'selectedPrice'
    ],
    
    // 允许过滤的字段
    filterFields: [
      'status',
      'startDate',
      'endDate'
    ],
    
    // 允许搜索的字段
    searchFields: [
      'id',
      'warehouse',
      'goods',
      'deliveryAddress'
    ],
    
    // 允许更新的字段
    updateFields: [
      'warehouse',
      'goods', 
      'deliveryAddress'
    ],
    
    // 创建订单时必需的字段
    requiredFields: [
      'warehouse',
      'goods',
      'deliveryAddress'
    ],
    
    // 导出时允许的过滤字段
    exportFilterFields: [
      'status',
      'startDate',
      'endDate'
    ]
  },

  // 用户模块字段配置
  user: {
    // 允许排序的字段
    sortFields: [
      'created_at',
      'updated_at',
      'name',
      'email'
    ],
    
    // 允许过滤的字段
    filterFields: [
      'role',
      'isActive'
    ],
    
    // 允许搜索的字段
    searchFields: [
      'email',
      'name'
    ],
    
    // 允许更新的字段（按角色区分）
    updateFields: {
      // 普通用户可更新的字段
      user: [
        'name',
        'email'
      ],
      // 管理员可更新的字段
      admin: [
        'name',
        'email',
        'role',
        'isActive'
      ]
    },
    
    // 用户注册时必需的字段
    requiredFields: [
      'email',
      'password',
      'name'
    ],
    
    // 导出时允许的过滤字段
    exportFilterFields: [
      'role',
      'isActive'
    ]
  },

  // 报价模块字段配置
  quote: {
    // 允许排序的字段
    sortFields: [
      'price',
      'createdAt',
      'estimatedDelivery'
    ],
    
    // 允许过滤的字段
    filterFields: [
      'startDate',
      'endDate'
    ],
    
    // 允许搜索的字段
    searchFields: [
      'provider',
      'orderId'
    ],
    
    // 创建/更新报价时必需的字段
    requiredFields: [
      'price',
      'estimatedDelivery'
    ],
    
    // 导出时允许的过滤字段
    exportFilterFields: [
      'startDate',
      'endDate',
      'provider',
      'orderId'
    ]
  }
};

/**
 * 获取指定模块的字段配置
 * @param {string} module - 模块名称 (order, user, quote)
 * @param {string} type - 配置类型 (sortFields, filterFields, searchFields, updateFields, requiredFields)
 * @param {string} role - 用户角色（仅在获取updateFields时需要）
 * @returns {Array|Object} 字段配置
 */
function getFieldConfig(module, type, role = null) {
  if (!fieldConfig[module]) {
    throw new Error(`未找到模块 '${module}' 的字段配置`);
  }

  const moduleConfig = fieldConfig[module];
  
  if (!moduleConfig[type]) {
    throw new Error(`模块 '${module}' 中未找到配置类型 '${type}'`);
  }

  const config = moduleConfig[type];

  // 如果是updateFields且配置是对象（按角色区分），需要指定角色
  if (type === 'updateFields' && typeof config === 'object' && !Array.isArray(config)) {
    if (!role) {
      throw new Error(`获取 '${module}' 模块的 updateFields 配置时必须指定角色`);
    }
    
    if (!config[role]) {
      throw new Error(`模块 '${module}' 中未找到角色 '${role}' 的 updateFields 配置`);
    }
    
    return config[role];
  }

  return config;
}

/**
 * 验证字段是否在允许的配置中
 * @param {string} module - 模块名称
 * @param {string} type - 配置类型
 * @param {string} field - 要验证的字段
 * @param {string} role - 用户角色（可选）
 * @returns {boolean} 是否允许
 */
function isFieldAllowed(module, type, field, role = null) {
  try {
    const allowedFields = getFieldConfig(module, type, role);
    return allowedFields.includes(field);
  } catch (error) {
    return false;
  }
}

/**
 * 获取所有模块的配置概览
 * @returns {Object} 配置概览
 */
function getConfigOverview() {
  const overview = {};
  
  for (const [module, config] of Object.entries(fieldConfig)) {
    overview[module] = {
      sortFields: config.sortFields?.length || 0,
      filterFields: config.filterFields?.length || 0,
      searchFields: config.searchFields?.length || 0,
      updateFields: Array.isArray(config.updateFields) 
        ? config.updateFields.length 
        : Object.keys(config.updateFields || {}).length,
      requiredFields: config.requiredFields?.length || 0
    };
  }
  
  return overview;
}

module.exports = {
  fieldConfig,
  getFieldConfig,
  isFieldAllowed,
  getConfigOverview
};
