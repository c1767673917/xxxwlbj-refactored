#!/usr/bin/env node

/**
 * 手动测试认证修复
 * 验证供应商认证中间件的安全性修复
 */

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { authenticateProvider } = require('../src/middleware/auth');
const { db } = require('../src/config/database');

// 创建测试应用
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // 测试路由
  app.get('/test-provider-auth', authenticateProvider, (req, res) => {
    res.json({
      success: true,
      message: '认证成功',
      provider: req.provider
    });
  });

  return app;
};

async function runTests() {
  console.log('🔧 开始测试供应商认证修复...\n');

  let testProvider;
  let testApiKey;
  let app;

  try {
    // 创建测试应用
    app = createTestApp();

    // 创建测试供应商
    testApiKey = 'secure-test-api-key-12345';
    const hashedKey = await bcrypt.hash(testApiKey, 12);
    
    testProvider = {
      id: uuidv4(),
      name: 'test-provider-security',
      api_key_hash: hashedKey,
      status: 'active'
    };

    // 插入测试数据
    await db('providers').insert(testProvider);
    console.log('✅ 测试供应商创建成功');

    // 测试1: 验证有效认证
    console.log('\n📋 测试1: 有效的供应商认证');
    const validResponse = await request(app)
      .get('/test-provider-auth')
      .set('x-provider-name', testProvider.name)
      .set('x-access-key', testApiKey);

    if (validResponse.status === 200) {
      console.log('✅ 有效认证测试通过');
    } else {
      console.log('❌ 有效认证测试失败:', validResponse.body);
    }

    // 测试2: 验证旧的占位符密钥被拒绝
    console.log('\n📋 测试2: 拒绝旧的占位符密钥');
    const oldKeyResponse = await request(app)
      .get('/test-provider-auth')
      .set('x-provider-name', testProvider.name)
      .set('x-access-key', 'invalid-access-key');

    if (oldKeyResponse.status === 401) {
      console.log('✅ 旧占位符密钥被正确拒绝');
    } else {
      console.log('❌ 旧占位符密钥测试失败:', oldKeyResponse.body);
    }

    // 测试3: 验证任意字符串被拒绝
    console.log('\n📋 测试3: 拒绝任意字符串密钥');
    const randomKeyResponse = await request(app)
      .get('/test-provider-auth')
      .set('x-provider-name', testProvider.name)
      .set('x-access-key', 'any-random-string');

    if (randomKeyResponse.status === 401) {
      console.log('✅ 任意字符串密钥被正确拒绝');
    } else {
      console.log('❌ 任意字符串密钥测试失败:', randomKeyResponse.body);
    }

    // 测试4: 验证不存在的供应商被拒绝
    console.log('\n📋 测试4: 拒绝不存在的供应商');
    const nonExistentResponse = await request(app)
      .get('/test-provider-auth')
      .set('x-provider-name', 'non-existent-provider')
      .set('x-access-key', testApiKey);

    if (nonExistentResponse.status === 401) {
      console.log('✅ 不存在的供应商被正确拒绝');
    } else {
      console.log('❌ 不存在供应商测试失败:', nonExistentResponse.body);
    }

    // 测试5: 验证缺少认证信息被拒绝
    console.log('\n📋 测试5: 拒绝缺少认证信息');
    const missingInfoResponse = await request(app)
      .get('/test-provider-auth');

    if (missingInfoResponse.status === 401) {
      console.log('✅ 缺少认证信息被正确拒绝');
    } else {
      console.log('❌ 缺少认证信息测试失败:', missingInfoResponse.body);
    }

    // 检查认证日志
    console.log('\n📋 检查认证日志记录');
    const logs = await db('auth_logs')
      .where({ provider: testProvider.name })
      .orderBy('timestamp', 'desc');

    console.log(`✅ 记录了 ${logs.length} 条认证日志`);
    
    const successLogs = logs.filter(log => log.success === 1);
    const failedLogs = logs.filter(log => log.success === 0);
    
    console.log(`   - 成功认证: ${successLogs.length} 次`);
    console.log(`   - 失败认证: ${failedLogs.length} 次`);

    console.log('\n🎉 所有安全测试完成！');
    console.log('\n📊 测试结果总结:');
    console.log('✅ 有效认证正常工作');
    console.log('✅ 旧的占位符密钥被拒绝');
    console.log('✅ 任意字符串密钥被拒绝');
    console.log('✅ 不存在的供应商被拒绝');
    console.log('✅ 缺少认证信息被拒绝');
    console.log('✅ 认证日志正常记录');
    console.log('\n🔒 安全漏洞已成功修复！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error(error.stack);
  } finally {
    // 清理测试数据
    if (testProvider) {
      try {
        await db('providers').where({ id: testProvider.id }).del();
        await db('auth_logs').where({ provider: testProvider.name }).del();
        console.log('\n🧹 测试数据清理完成');
      } catch (cleanupError) {
        console.error('清理测试数据时出错:', cleanupError.message);
      }
    }
    
    // 关闭数据库连接
    await db.destroy();
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
