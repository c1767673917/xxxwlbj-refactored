/**
 * 数据类型转换工具
 * 提供SQLite和JavaScript之间的数据类型转换功能
 */

const { logger } = require('../config/logger');

/**
 * 将JavaScript布尔值转换为SQLite整数
 * @param {boolean|number|string} value - 要转换的值
 * @returns {number} SQLite布尔值（0或1）
 */
function booleanToSQLite(value) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // 如果已经是数字，直接返回0或1
  if (typeof value === 'number') {
    return value ? 1 : 0;
  }
  
  // 如果是字符串，处理常见的布尔字符串
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
      return 1;
    }
    if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
      return 0;
    }
    // 对于其他字符串，非空字符串为true
    return value.length > 0 ? 1 : 0;
  }
  
  // 对于布尔值和其他类型，使用JavaScript的真值判断
  return value ? 1 : 0;
}

/**
 * 将SQLite整数转换为JavaScript布尔值
 * @param {number|string|boolean} value - 要转换的值
 * @returns {boolean} JavaScript布尔值
 */
function sqliteToBoolean(value) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // 如果已经是布尔值，直接返回
  if (typeof value === 'boolean') {
    return value;
  }
  
  // 如果是数字，0为false，其他为true
  if (typeof value === 'number') {
    return value !== 0;
  }
  
  // 如果是字符串，处理常见情况
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
      return false;
    }
    if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
      return true;
    }
    // 对于其他字符串，非空字符串为true
    return value.length > 0;
  }
  
  // 对于其他类型，使用JavaScript的真值判断
  return Boolean(value);
}

/**
 * 转换对象中的布尔字段为SQLite格式
 * @param {Object} data - 要转换的数据对象
 * @param {Array<string>} booleanFields - 布尔字段名数组
 * @returns {Object} 转换后的数据对象
 */
function convertBooleanFieldsToSQLite(data, booleanFields = []) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const converted = { ...data };
  
  booleanFields.forEach(field => {
    if (field in converted) {
      converted[field] = booleanToSQLite(converted[field]);
    }
  });
  
  return converted;
}

/**
 * 转换对象中的布尔字段为JavaScript格式
 * @param {Object} data - 要转换的数据对象
 * @param {Array<string>} booleanFields - 布尔字段名数组
 * @returns {Object} 转换后的数据对象
 */
function convertBooleanFieldsFromSQLite(data, booleanFields = []) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const converted = { ...data };
  
  booleanFields.forEach(field => {
    if (field in converted) {
      converted[field] = sqliteToBoolean(converted[field]);
    }
  });
  
  return converted;
}

/**
 * 批量转换数组中对象的布尔字段为JavaScript格式
 * @param {Array<Object>} dataArray - 要转换的数据数组
 * @param {Array<string>} booleanFields - 布尔字段名数组
 * @returns {Array<Object>} 转换后的数据数组
 */
function convertArrayBooleanFieldsFromSQLite(dataArray, booleanFields = []) {
  if (!Array.isArray(dataArray)) {
    return dataArray;
  }
  
  return dataArray.map(item => convertBooleanFieldsFromSQLite(item, booleanFields));
}

/**
 * 验证并转换数据类型
 * @param {*} value - 要验证的值
 * @param {string} expectedType - 期望的类型
 * @param {string} fieldName - 字段名（用于错误消息）
 * @returns {*} 转换后的值
 */
function validateAndConvertType(value, expectedType, fieldName = 'field') {
  if (value === null || value === undefined) {
    return value;
  }
  
  try {
    switch (expectedType.toLowerCase()) {
      case 'boolean':
        return sqliteToBoolean(value);
        
      case 'number':
      case 'integer':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`${fieldName} 必须是有效的数字`);
        }
        return expectedType === 'integer' ? Math.floor(num) : num;
        
      case 'string':
        return String(value);
        
      case 'date':
        if (value instanceof Date) {
          return value;
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(`${fieldName} 必须是有效的日期`);
        }
        return date;
        
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`${fieldName} 必须是数组`);
        }
        return value;
        
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error(`${fieldName} 必须是对象`);
        }
        return value;
        
      default:
        logger.warn('未知的数据类型', { expectedType, fieldName });
        return value;
    }
  } catch (error) {
    logger.error('数据类型转换失败', {
      value,
      expectedType,
      fieldName,
      error: error.message
    });
    throw error;
  }
}

/**
 * 批量验证和转换对象字段类型
 * @param {Object} data - 要验证的数据对象
 * @param {Object} typeMap - 类型映射 { fieldName: expectedType }
 * @returns {Object} 转换后的数据对象
 */
function validateAndConvertObjectTypes(data, typeMap = {}) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const converted = { ...data };
  
  Object.entries(typeMap).forEach(([fieldName, expectedType]) => {
    if (fieldName in converted) {
      converted[fieldName] = validateAndConvertType(converted[fieldName], expectedType, fieldName);
    }
  });
  
  return converted;
}

/**
 * 常用的布尔字段名称
 */
const COMMON_BOOLEAN_FIELDS = [
  'isActive',
  'isDeleted',
  'isEnabled',
  'isVisible',
  'isPublic',
  'isPrivate',
  'isDefault',
  'isRequired',
  'isOptional',
  'hasPermission',
  'canEdit',
  'canDelete',
  'canView'
];

module.exports = {
  booleanToSQLite,
  sqliteToBoolean,
  convertBooleanFieldsToSQLite,
  convertBooleanFieldsFromSQLite,
  convertArrayBooleanFieldsFromSQLite,
  validateAndConvertType,
  validateAndConvertObjectTypes,
  COMMON_BOOLEAN_FIELDS
};
