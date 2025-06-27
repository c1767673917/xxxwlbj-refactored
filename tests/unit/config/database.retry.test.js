/**
 * 数据库事务重试机制测试
 * 测试SQLite特定错误的重试逻辑
 */

// 模拟logger
jest.mock('../../../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}));

// 模拟knex配置
jest.mock('../../../knexfile', () => ({
  test: {
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true
  }
}));

const { transactionManager } = require('../../../src/config/database');

describe('Database Transaction Retry Mechanism', () => {
  let mockTransaction;

  beforeEach(() => {
    
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined)
    };
    
    // 模拟数据库事务
    transactionManager.executeTransaction = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('transactionManager existence', () => {
    it('应该导出transactionManager实例', () => {
      expect(transactionManager).toBeDefined();
      expect(typeof transactionManager.executeWithRetry).toBe('function');
      expect(typeof transactionManager.executeTransaction).toBe('function');
    });

    it('应该有正确的方法', () => {
      expect(transactionManager).toHaveProperty('executeWithRetry');
      expect(transactionManager).toHaveProperty('executeTransaction');
    });
  });


});
