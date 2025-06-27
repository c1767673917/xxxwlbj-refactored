/**
 * 认证中间件测试
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { authenticateProvider } = require('../../../src/middleware/auth');
const { db } = require('../../../src/config/database');

// 创建测试应用
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // 测试路由
  app.get('/test-provider-auth', authenticateProvider, (req, res) => {
    res.json({
      success: true,
      provider: req.provider
    });
  });

  return app;
};

describe('供应商认证中间件', () => {
  let app;
  let testProvider;
  let testApiKey;

  beforeAll(async () => {
    app = createTestApp();

    // 运行数据库迁移创建表结构
    await db.migrate.latest();

    // 创建测试供应商
    testApiKey = 'test-api-key-12345';
    const hashedKey = await bcrypt.hash(testApiKey, 12);

    testProvider = {
      id: uuidv4(),
      name: 'test-provider',
      api_key_hash: hashedKey,
      status: 'active'
    };

    // 插入测试数据
    await db('providers').insert(testProvider);
  });

  afterAll(async () => {
    // 清理测试数据
    if (testProvider) {
      await db('providers').where({ id: testProvider.id }).del();
      await db('auth_logs').where({ provider: testProvider.name }).del();
    }
    await db.destroy();
  });

  afterEach(async () => {
    // 清理认证日志
    if (testProvider) {
      await db('auth_logs').where({ provider: testProvider.name }).del();
    }
  });

  describe('成功认证', () => {
    test('应该通过有效的供应商认证', async () => {
      const response = await request(app)
        .get('/test-provider-auth')
        .set('x-provider-name', testProvider.name)
        .set('x-access-key', testApiKey);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.provider).toEqual({
        id: testProvider.id,
        name: testProvider.name
      });

      // 验证成功日志
      const logs = await db('auth_logs')
        .where({ provider: testProvider.name, success: true });
      expect(logs).toHaveLength(1);
      expect(logs[0].reason).toBe('认证成功');
    });

    test('应该更新供应商最后使用时间', async () => {
      const beforeTime = new Date();
      
      await request(app)
        .get('/test-provider-auth')
        .set('x-provider-name', testProvider.name)
        .set('x-access-key', testApiKey);

      // 等待异步更新完成
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedProvider = await db('providers')
        .where({ id: testProvider.id })
        .first();

      expect(updatedProvider.last_used_at).toBeTruthy();
      expect(new Date(updatedProvider.last_used_at)).toBeInstanceOf(Date);
    });
  });

  describe('认证失败', () => {
    test('应该拒绝缺少供应商名称的请求', async () => {
      const response = await request(app)
        .get('/test-provider-auth')
        .set('x-access-key', testApiKey);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('缺少供应商认证信息');

      // 验证失败日志
      const logs = await db('auth_logs')
        .where({ success: false, reason: '缺少认证信息' });
      expect(logs).toHaveLength(1);
    });

    test('应该拒绝缺少访问密钥的请求', async () => {
      const response = await request(app)
        .get('/test-provider-auth')
        .set('x-provider-name', testProvider.name);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('缺少供应商认证信息');
    });

    test('应该拒绝不存在的供应商', async () => {
      const response = await request(app)
        .get('/test-provider-auth')
        .set('x-provider-name', 'non-existent-provider')
        .set('x-access-key', testApiKey);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('供应商认证失败');

      // 验证失败日志
      const logs = await db('auth_logs')
        .where({ provider: 'non-existent-provider', success: false });
      expect(logs).toHaveLength(1);
      expect(logs[0].reason).toBe('供应商不存在或已停用');
    });

    test('应该拒绝错误的API密钥', async () => {
      const response = await request(app)
        .get('/test-provider-auth')
        .set('x-provider-name', testProvider.name)
        .set('x-access-key', 'wrong-api-key');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('供应商认证失败');

      // 验证失败日志
      const logs = await db('auth_logs')
        .where({ provider: testProvider.name, success: false });
      expect(logs).toHaveLength(1);
      expect(logs[0].reason).toBe('密钥错误');
    });

    test('应该拒绝已停用的供应商', async () => {
      // 暂时停用供应商
      await db('providers')
        .where({ id: testProvider.id })
        .update({ status: 'inactive' });

      const response = await request(app)
        .get('/test-provider-auth')
        .set('x-provider-name', testProvider.name)
        .set('x-access-key', testApiKey);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('供应商认证失败');

      // 恢复供应商状态
      await db('providers')
        .where({ id: testProvider.id })
        .update({ status: 'active' });
    });
  });

  describe('安全性测试', () => {
    test('应该拒绝旧的占位符密钥', async () => {
      const response = await request(app)
        .get('/test-provider-auth')
        .set('x-provider-name', testProvider.name)
        .set('x-access-key', 'invalid-access-key');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('供应商认证失败');
    });

    test('应该拒绝任意字符串密钥', async () => {
      const response = await request(app)
        .get('/test-provider-auth')
        .set('x-provider-name', testProvider.name)
        .set('x-access-key', 'any-random-string');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('供应商认证失败');
    });

    test('应该记录所有认证尝试', async () => {
      // 进行多次认证尝试
      await request(app)
        .get('/test-provider-auth')
        .set('x-provider-name', testProvider.name)
        .set('x-access-key', testApiKey);

      await request(app)
        .get('/test-provider-auth')
        .set('x-provider-name', testProvider.name)
        .set('x-access-key', 'wrong-key');

      await request(app)
        .get('/test-provider-auth')
        .set('x-provider-name', 'fake-provider')
        .set('x-access-key', 'fake-key');

      // 验证所有日志都被记录
      const logs = await db('auth_logs')
        .where({ type: 'provider_auth' })
        .orderBy('timestamp', 'desc');

      expect(logs.length).toBeGreaterThanOrEqual(3);
      
      // 验证日志内容
      const successLog = logs.find(log => log.success === 1);
      const failedLogs = logs.filter(log => log.success === 0);
      
      expect(successLog).toBeTruthy();
      expect(failedLogs.length).toBeGreaterThanOrEqual(2);
    });
  });
});
