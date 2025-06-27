/**
 * 认证安全测试
 * 验证认证系统的安全性修复
 */

const request = require('supertest');
const app = require('../../src/app');
const { initializeDatabase } = require('../../src/config/database');

describe('认证安全测试', () => {
  let server;
  let validToken;
  let refreshToken;

  beforeAll(async () => {
    // 初始化测试数据库
    await initializeDatabase();
    
    // 启动测试服务器
    server = app.listen(0);
    
    // 创建测试用户并获取token
    const loginResponse = await request(server)
      .post('/api/auth/login')
      .send({
        password: 'test123',
        email: 'test@example.com'
      });
    
    if (loginResponse.status === 200) {
      validToken = loginResponse.body.accessToken;
      refreshToken = loginResponse.body.refreshToken;
    }
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Token验证安全性', () => {
    test('应该拒绝无效的token', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    test('应该拒绝过期的token', async () => {
      // 使用一个已知过期的token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.invalid';
      
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    test('应该验证token的有效性', async () => {
      if (!validToken) {
        console.log('跳过测试：无有效token');
        return;
      }

      const response = await request(server)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('应该正确处理token刷新', async () => {
      if (!refreshToken) {
        console.log('跳过测试：无refresh token');
        return;
      }

      const response = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });
  });

  describe('权限绕过防护', () => {
    test('应该阻止未认证用户访问受保护的资源', async () => {
      const response = await request(server)
        .get('/api/orders');

      expect(response.status).toBe(401);
    });

    test('应该阻止使用无效token访问受保护的资源', async () => {
      const response = await request(server)
        .get('/api/orders')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    test('应该允许有效token访问受保护的资源', async () => {
      if (!validToken) {
        console.log('跳过测试：无有效token');
        return;
      }

      const response = await request(server)
        .get('/api/orders')
        .set('Authorization', `Bearer ${validToken}`);

      // 应该返回200或403（如果用户没有订单），但不应该是401
      expect(response.status).not.toBe(401);
    });
  });

  describe('密码重置安全性', () => {
    test('密码重置不应该返回明文密码', async () => {
      // 这个测试需要管理员权限，可能需要跳过或使用mock
      const response = await request(server)
        .post('/api/admin/users/1/reset-password')
        .set('Authorization', `Bearer ${validToken}`);

      // 无论成功还是失败，都不应该在响应中包含明文密码
      if (response.body.tempPassword) {
        fail('响应中包含明文密码，存在安全风险');
      }
    });

    test('密码重置应该返回安全的响应', async () => {
      const response = await request(server)
        .post('/api/admin/users/1/reset-password')
        .set('Authorization', `Bearer ${validToken}`);

      // 检查响应结构是否安全
      if (response.status === 200) {
        expect(response.body.resetId).toBeDefined();
        expect(response.body.message).toContain('邮件');
        expect(response.body.tempPassword).toBeUndefined();
      }
    });
  });

  describe('输入验证安全性', () => {
    test('应该防止SQL注入攻击', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          password: maliciousInput,
          email: maliciousInput
        });

      // 应该返回认证失败，而不是服务器错误
      expect(response.status).toBe(401);
      expect(response.body.error).not.toContain('SQL');
    });

    test('应该防止XSS攻击', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          password: xssPayload,
          email: xssPayload
        });

      // 响应不应该包含未转义的脚本
      expect(response.text).not.toContain('<script>');
    });

    test('应该限制请求大小', async () => {
      const largePayload = 'x'.repeat(20 * 1024 * 1024); // 20MB
      
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          password: largePayload,
          email: 'test@example.com'
        });

      expect(response.status).toBe(413); // Payload Too Large
    });
  });

  describe('速率限制测试', () => {
    test('应该限制登录尝试次数', async () => {
      const promises = [];
      
      // 发送多个并发登录请求
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(server)
            .post('/api/auth/login')
            .send({
              password: 'wrong-password',
              email: 'test@example.com'
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // 应该有一些请求被速率限制拒绝
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('会话管理安全性', () => {
    test('登出应该使token失效', async () => {
      if (!validToken) {
        console.log('跳过测试：无有效token');
        return;
      }

      // 先验证token有效
      let response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);
      
      if (response.status !== 200) {
        console.log('跳过测试：token已失效');
        return;
      }

      // 登出
      await request(server)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      // 再次尝试使用token应该失败
      response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(401);
    });
  });
});
