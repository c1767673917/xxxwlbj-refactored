/**
 * 数据类型转换工具单元测试
 * 测试SQLite和JavaScript之间的数据类型转换功能
 */

const {
  booleanToSQLite,
  sqliteToBoolean,
  convertBooleanFieldsToSQLite,
  convertBooleanFieldsFromSQLite,
  convertArrayBooleanFieldsFromSQLite,
  validateAndConvertType,
  validateAndConvertObjectTypes,
  COMMON_BOOLEAN_FIELDS
} = require('../../../src/utils/dataTypeConverter');

describe('DataTypeConverter', () => {
  describe('booleanToSQLite', () => {
    it('应该将true转换为1', () => {
      expect(booleanToSQLite(true)).toBe(1);
    });

    it('应该将false转换为0', () => {
      expect(booleanToSQLite(false)).toBe(0);
    });

    it('应该将数字1转换为1', () => {
      expect(booleanToSQLite(1)).toBe(1);
    });

    it('应该将数字0转换为0', () => {
      expect(booleanToSQLite(0)).toBe(0);
    });

    it('应该将字符串"true"转换为1', () => {
      expect(booleanToSQLite('true')).toBe(1);
      expect(booleanToSQLite('TRUE')).toBe(1);
      expect(booleanToSQLite('1')).toBe(1);
      expect(booleanToSQLite('yes')).toBe(1);
    });

    it('应该将字符串"false"转换为0', () => {
      expect(booleanToSQLite('false')).toBe(0);
      expect(booleanToSQLite('FALSE')).toBe(0);
      expect(booleanToSQLite('0')).toBe(0);
      expect(booleanToSQLite('no')).toBe(0);
    });

    it('应该处理null和undefined', () => {
      expect(booleanToSQLite(null)).toBe(null);
      expect(booleanToSQLite(undefined)).toBe(null);
    });

    it('应该将非空字符串转换为1', () => {
      expect(booleanToSQLite('hello')).toBe(1);
    });

    it('应该将空字符串转换为0', () => {
      expect(booleanToSQLite('')).toBe(0);
    });
  });

  describe('sqliteToBoolean', () => {
    it('应该将1转换为true', () => {
      expect(sqliteToBoolean(1)).toBe(true);
    });

    it('应该将0转换为false', () => {
      expect(sqliteToBoolean(0)).toBe(false);
    });

    it('应该将字符串"1"转换为true', () => {
      expect(sqliteToBoolean('1')).toBe(true);
      expect(sqliteToBoolean('true')).toBe(true);
      expect(sqliteToBoolean('yes')).toBe(true);
    });

    it('应该将字符串"0"转换为false', () => {
      expect(sqliteToBoolean('0')).toBe(false);
      expect(sqliteToBoolean('false')).toBe(false);
      expect(sqliteToBoolean('no')).toBe(false);
    });

    it('应该处理null和undefined', () => {
      expect(sqliteToBoolean(null)).toBe(null);
      expect(sqliteToBoolean(undefined)).toBe(null);
    });

    it('应该保持布尔值不变', () => {
      expect(sqliteToBoolean(true)).toBe(true);
      expect(sqliteToBoolean(false)).toBe(false);
    });

    it('应该将非空字符串转换为true', () => {
      expect(sqliteToBoolean('hello')).toBe(true);
    });

    it('应该将空字符串转换为false', () => {
      expect(sqliteToBoolean('')).toBe(false);
    });
  });

  describe('convertBooleanFieldsToSQLite', () => {
    it('应该转换对象中的布尔字段', () => {
      const data = {
        id: 1,
        name: 'test',
        isActive: true,
        isDeleted: false
      };
      const booleanFields = ['isActive', 'isDeleted'];
      
      const result = convertBooleanFieldsToSQLite(data, booleanFields);
      
      expect(result).toEqual({
        id: 1,
        name: 'test',
        isActive: 1,
        isDeleted: 0
      });
    });

    it('应该处理不存在的字段', () => {
      const data = { id: 1, name: 'test' };
      const booleanFields = ['isActive'];
      
      const result = convertBooleanFieldsToSQLite(data, booleanFields);
      
      expect(result).toEqual({ id: 1, name: 'test' });
    });

    it('应该处理null和undefined数据', () => {
      expect(convertBooleanFieldsToSQLite(null, ['isActive'])).toBe(null);
      expect(convertBooleanFieldsToSQLite(undefined, ['isActive'])).toBe(undefined);
    });
  });

  describe('convertBooleanFieldsFromSQLite', () => {
    it('应该转换对象中的布尔字段', () => {
      const data = {
        id: 1,
        name: 'test',
        isActive: 1,
        isDeleted: 0
      };
      const booleanFields = ['isActive', 'isDeleted'];
      
      const result = convertBooleanFieldsFromSQLite(data, booleanFields);
      
      expect(result).toEqual({
        id: 1,
        name: 'test',
        isActive: true,
        isDeleted: false
      });
    });

    it('应该处理不存在的字段', () => {
      const data = { id: 1, name: 'test' };
      const booleanFields = ['isActive'];
      
      const result = convertBooleanFieldsFromSQLite(data, booleanFields);
      
      expect(result).toEqual({ id: 1, name: 'test' });
    });
  });

  describe('convertArrayBooleanFieldsFromSQLite', () => {
    it('应该转换数组中所有对象的布尔字段', () => {
      const dataArray = [
        { id: 1, name: 'test1', isActive: 1 },
        { id: 2, name: 'test2', isActive: 0 }
      ];
      const booleanFields = ['isActive'];
      
      const result = convertArrayBooleanFieldsFromSQLite(dataArray, booleanFields);
      
      expect(result).toEqual([
        { id: 1, name: 'test1', isActive: true },
        { id: 2, name: 'test2', isActive: false }
      ]);
    });

    it('应该处理非数组输入', () => {
      const data = { id: 1, name: 'test' };
      const result = convertArrayBooleanFieldsFromSQLite(data, ['isActive']);
      expect(result).toBe(data);
    });
  });

  describe('validateAndConvertType', () => {
    it('应该验证和转换布尔类型', () => {
      expect(validateAndConvertType(1, 'boolean')).toBe(true);
      expect(validateAndConvertType(0, 'boolean')).toBe(false);
      expect(validateAndConvertType('true', 'boolean')).toBe(true);
    });

    it('应该验证和转换数字类型', () => {
      expect(validateAndConvertType('123', 'number')).toBe(123);
      expect(validateAndConvertType('123.45', 'number')).toBe(123.45);
      expect(validateAndConvertType('123.45', 'integer')).toBe(123);
    });

    it('应该验证和转换字符串类型', () => {
      expect(validateAndConvertType(123, 'string')).toBe('123');
      expect(validateAndConvertType(true, 'string')).toBe('true');
    });

    it('应该验证和转换日期类型', () => {
      const dateStr = '2023-01-01';
      const result = validateAndConvertType(dateStr, 'date');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
    });

    it('应该抛出无效数字错误', () => {
      expect(() => validateAndConvertType('invalid', 'number')).toThrow('必须是有效的数字');
    });

    it('应该抛出无效日期错误', () => {
      expect(() => validateAndConvertType('invalid-date', 'date')).toThrow('必须是有效的日期');
    });

    it('应该处理null和undefined', () => {
      expect(validateAndConvertType(null, 'boolean')).toBe(null);
      expect(validateAndConvertType(undefined, 'string')).toBe(undefined);
    });
  });

  describe('validateAndConvertObjectTypes', () => {
    it('应该验证和转换对象中的多个字段', () => {
      const data = {
        id: '123',
        name: 'test',
        isActive: 1,
        createdAt: '2023-01-01'
      };
      const typeMap = {
        id: 'number',
        isActive: 'boolean',
        createdAt: 'date'
      };
      
      const result = validateAndConvertObjectTypes(data, typeMap);
      
      expect(result.id).toBe(123);
      expect(result.name).toBe('test');
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('应该处理不存在的字段', () => {
      const data = { id: 1, name: 'test' };
      const typeMap = { id: 'string', nonExistent: 'boolean' };
      
      const result = validateAndConvertObjectTypes(data, typeMap);
      
      expect(result).toEqual({ id: '1', name: 'test' });
    });
  });

  describe('COMMON_BOOLEAN_FIELDS', () => {
    it('应该包含常用的布尔字段名', () => {
      expect(COMMON_BOOLEAN_FIELDS).toContain('isActive');
      expect(COMMON_BOOLEAN_FIELDS).toContain('isDeleted');
      expect(COMMON_BOOLEAN_FIELDS).toContain('isEnabled');
      expect(Array.isArray(COMMON_BOOLEAN_FIELDS)).toBe(true);
      expect(COMMON_BOOLEAN_FIELDS.length).toBeGreaterThan(0);
    });
  });
});
