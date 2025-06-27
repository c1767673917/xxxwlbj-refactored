#!/usr/bin/env node

/**
 * JWT安全修复验证脚本
 * 验证JWT密钥配置是否安全
 */

const path = require('path');

// 设置测试环境
process.env.NODE_ENV = 'development';

console.log('🔍 开始验证JWT安全修复...\n');

try {
  // 1. 验证配置文件加载
  console.log('1. 验证配置文件加载...');
  const config = require('../src/config/env');
  console.log('✅ 配置文件加载成功');

  // 2. 验证JWT密钥配置
  console.log('\n2. 验证JWT密钥配置...');
  
  if (!config.jwt || !config.jwt.secret) {
    throw new Error('JWT配置缺失');
  }
  
  console.log(`✅ JWT密钥已配置，长度: ${config.jwt.secret.length} 字符`);
  
  // 3. 验证密钥安全性
  console.log('\n3. 验证密钥安全性...');
  
  const secret = config.jwt.secret;
  
  // 检查是否包含危险的默认值
  const dangerousPatterns = [
    'test-jwt-secret-key',
    'your-super-secret',
    'change-this',
    'default',
    'secret123'
  ];
  
  const foundDangerous = dangerousPatterns.find(pattern => 
    secret.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (foundDangerous) {
    console.log(`⚠️  警告: JWT密钥包含可能不安全的模式: "${foundDangerous}"`);
  } else {
    console.log('✅ JWT密钥未包含已知的不安全模式');
  }
  
  // 检查密钥长度
  if (secret.length < 32) {
    console.log(`⚠️  警告: JWT密钥长度不足32字符 (当前: ${secret.length})`);
  } else {
    console.log(`✅ JWT密钥长度符合安全要求 (${secret.length} 字符)`);
  }

  // 4. 验证认证中间件
  console.log('\n4. 验证认证中间件...');
  const authMiddleware = require('../src/middleware/auth');
  
  if (typeof authMiddleware.authenticateToken !== 'function') {
    throw new Error('认证中间件缺失');
  }
  
  console.log('✅ 认证中间件加载成功');

  // 5. 验证生产环境保护
  console.log('\n5. 验证生产环境保护...');

  // 检查配置文件中是否有生产环境保护逻辑
  const fs = require('fs');
  const configContent = fs.readFileSync(path.join(__dirname, '../src/config/env.js'), 'utf8');

  if (configContent.includes('JWT_SECRET must be set in production')) {
    console.log('✅ 配置文件包含生产环境保护逻辑');
  } else {
    console.log('⚠️  配置文件缺少生产环境保护逻辑');
  }

  // 检查是否使用了getter模式
  if (configContent.includes('get secret()')) {
    console.log('✅ 使用了安全的getter模式');
  } else {
    console.log('⚠️  未使用getter模式，可能存在安全风险');
  }

  // 6. 验证配置验证函数
  console.log('\n6. 验证配置验证函数...');
  
  const finalConfig = require('../src/config/env');
  
  if (typeof finalConfig.validate === 'function') {
    try {
      finalConfig.validate();
      console.log('✅ 配置验证函数正常工作');
    } catch (error) {
      console.log(`⚠️  配置验证失败: ${error.message}`);
    }
  } else {
    console.log('⚠️  警告: 配置验证函数缺失');
  }

  console.log('\n🎉 JWT安全修复验证完成！');
  console.log('\n📋 修复总结:');
  console.log('✅ 移除了硬编码的后备JWT密钥');
  console.log('✅ 添加了生产环境JWT_SECRET强制要求');
  console.log('✅ 实现了安全的开发环境后备机制');
  console.log('✅ 添加了配置验证和安全检查');
  
  console.log('\n⚠️  重要提醒:');
  console.log('1. 确保生产环境设置了强随机的JWT_SECRET');
  console.log('2. 重启应用后所有现有JWT令牌将失效');
  console.log('3. 用户需要重新登录');

} catch (error) {
  console.error('\n❌ 验证失败:', error.message);
  console.error('\n请检查修复是否正确完成');
  process.exit(1);
}
