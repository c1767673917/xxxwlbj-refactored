/**
 * 错误处理中间件SQLite集成测试
 * 测试SQLite特定错误的处理逻辑
 */

// 模拟logger
jest.mock('../../../src/config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}));

// 模拟环境配置
jest.mock('../../../src/config/env', () => ({
  env: 'test'
}));

const { globalErrorHandler } = require('../../../src/middleware/errorHandler');

describe('ErrorHandler SQLite Integration', () => {
  let mockReq, mockRes, mockNext;
  
  beforeEach(() => {
    mockReq = {
      originalUrl: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent'),
      user: { id: 'test-user' }
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    mockNext = jest.fn();
    
    // 清除所有mock调用
    jest.clearAllMocks();
  });

  describe('SQLite约束错误处理', () => {
    it('应该正确处理SQLITE_CONSTRAINT错误', () => {
      const error = new Error('UNIQUE constraint failed');
      error.code = 'SQLITE_CONSTRAINT';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.any(String),
          code: 'SQLITE_CONSTRAINT'
        })
      );
    });

    it('应该正确处理SQLITE_CONSTRAINT_UNIQUE错误', () => {
      const error = new Error('UNIQUE constraint failed');
      error.code = 'SQLITE_CONSTRAINT_UNIQUE';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('应该正确处理SQLITE_CONSTRAINT_PRIMARYKEY错误', () => {
      const error = new Error('PRIMARY KEY constraint failed');
      error.code = 'SQLITE_CONSTRAINT_PRIMARYKEY';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('应该正确处理SQLITE_CONSTRAINT_FOREIGNKEY错误', () => {
      const error = new Error('FOREIGN KEY constraint failed');
      error.code = 'SQLITE_CONSTRAINT_FOREIGNKEY';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('应该正确处理SQLITE_CONSTRAINT_CHECK错误', () => {
      const error = new Error('CHECK constraint failed');
      error.code = 'SQLITE_CONSTRAINT_CHECK';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('应该正确处理SQLITE_CONSTRAINT_NOTNULL错误', () => {
      const error = new Error('NOT NULL constraint failed');
      error.code = 'SQLITE_CONSTRAINT_NOTNULL';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('SQLite锁定和忙碌错误处理', () => {
    it('应该正确处理SQLITE_BUSY错误', () => {
      const error = new Error('Database is locked');
      error.code = 'SQLITE_BUSY';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(503);
    });

    it('应该正确处理SQLITE_LOCKED错误', () => {
      const error = new Error('Database table is locked');
      error.code = 'SQLITE_LOCKED';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(503);
    });
  });

  describe('SQLite权限和存储错误处理', () => {
    it('应该正确处理SQLITE_READONLY错误', () => {
      const error = new Error('Database is read-only');
      error.code = 'SQLITE_READONLY';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('应该正确处理SQLITE_FULL错误', () => {
      const error = new Error('Database is full');
      error.code = 'SQLITE_FULL';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(507);
    });
  });

  describe('SQLite数据库文件错误处理', () => {
    it('应该正确处理SQLITE_CANTOPEN错误', () => {
      const error = new Error('Cannot open database file');
      error.code = 'SQLITE_CANTOPEN';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('应该正确处理SQLITE_NOTADB错误', () => {
      const error = new Error('File is not a database');
      error.code = 'SQLITE_NOTADB';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('应该正确处理SQLITE_CORRUPT错误', () => {
      const error = new Error('Database is corrupt');
      error.code = 'SQLITE_CORRUPT';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('SQLite数据错误处理', () => {
    it('应该正确处理SQLITE_TOOBIG错误', () => {
      const error = new Error('String or BLOB too big');
      error.code = 'SQLITE_TOOBIG';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(413);
    });

    it('应该正确处理SQLITE_RANGE错误', () => {
      const error = new Error('Parameter out of range');
      error.code = 'SQLITE_RANGE';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('应该正确处理SQLITE_MISMATCH错误', () => {
      const error = new Error('Data type mismatch');
      error.code = 'SQLITE_MISMATCH';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('未知SQLite错误处理', () => {
    it('应该正确处理未知的SQLite错误', () => {
      const error = new Error('Unknown SQLite error');
      error.code = 'SQLITE_UNKNOWN';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('非SQLite错误处理', () => {
    it('应该正确处理非SQLite错误', () => {
      const error = new Error('Generic error');
      error.statusCode = 400;
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('应该正确处理没有错误码的错误', () => {
      const error = new Error('Generic error without code');
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('错误响应格式', () => {
    it('应该返回正确的错误响应格式', () => {
      const error = new Error('Test error');
      error.code = 'SQLITE_CONSTRAINT';
      
      globalErrorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.any(String),
          code: 'SQLITE_CONSTRAINT',
          timestamp: expect.any(String),
          path: '/test',
          method: 'GET'
        })
      );
    });
  });
});
