/**
 * 认证中间件
 * 提供JWT认证和供应商认证功能
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const { db } = require('../config/database');

/**
 * JWT认证中间件
 * 验证请求头中的JWT token
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '缺少认证token'
    });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'token已过期'
        });
      }
      return res.status(401).json({
        success: false,
        message: '无效的token'
      });
    }
    req.user = user;
    next();
  });
};

/**
 * 记录认证尝试日志
 * @param {string} providerName - 供应商名称
 * @param {boolean} success - 认证是否成功
 * @param {string} ip - 客户端IP地址
 * @param {string} reason - 认证结果原因
 */
const logAuthAttempt = async (providerName, success, ip, reason = '') => {
  try {
    const logEntry = {
      provider: providerName,
      success,
      ip,
      reason,
      type: 'provider_auth',
      timestamp: new Date()
    };

    // 控制台日志
    console.log(`[Provider Auth] ${success ? 'SUCCESS' : 'FAILED'}: ${providerName} from ${ip} - ${reason}`);

    // 存储到审计日志表
    await db('auth_logs').insert(logEntry);
  } catch (error) {
    console.error('写入认证日志失败:', error.message);
  }
};

/**
 * 供应商认证中间件
 * 验证供应商的API密钥
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const authenticateProvider = async (req, res, next) => {
  const providerName = req.headers['x-provider-name'];
  const accessKey = req.headers['x-access-key'];
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

  // 前置检查：确保必要的认证字段存在
  if (!providerName || !accessKey) {
    await logAuthAttempt(providerName || 'unknown', false, clientIP, '缺少认证信息');
    return res.status(401).json({
      success: false,
      message: '缺少供应商认证信息'
    });
  }

  try {
    // 数据库查询供应商信息
    const providers = await db('providers')
      .select('id', 'name', 'api_key_hash')
      .where({ name: providerName, status: 'active' })
      .limit(1);

    // 检查供应商是否存在
    if (providers.length === 0) {
      await logAuthAttempt(providerName, false, clientIP, '供应商不存在或已停用');
      return res.status(401).json({
        success: false,
        message: '供应商认证失败'
      });
    }

    const provider = providers[0];

    // 异步密钥比较
    const isValid = await bcrypt.compare(accessKey, provider.api_key_hash);

    if (!isValid) {
      await logAuthAttempt(providerName, false, clientIP, '密钥错误');
      return res.status(401).json({
        success: false,
        message: '供应商认证失败'
      });
    }

    // 认证成功：更新最后使用时间（异步执行避免阻塞）
    db('providers')
      .where({ id: provider.id })
      .update({ last_used_at: new Date() })
      .catch(err => console.error('更新供应商最后使用时间失败:', err.message));

    // 记录成功日志
    await logAuthAttempt(providerName, true, clientIP, '认证成功');

    // 设置供应商信息到请求对象
    req.provider = {
      id: provider.id,
      name: provider.name
    };

    next();

  } catch (error) {
    console.error('供应商认证异常:', error.message);
    await logAuthAttempt(providerName, false, clientIP, '系统异常');

    return res.status(500).json({
      success: false,
      message: '认证服务异常'
    });
  }
};

/**
 * 角色权限验证中间件
 * 验证用户是否具有指定角色
 * @param {string|Array} allowedRoles - 允许的角色
 * @returns {Function} 中间件函数
 */
const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
};

/**
 * 管理员权限验证中间件
 * 验证用户是否为管理员
 */
const requireAdmin = requireRole('admin');

/**
 * 可选认证中间件
 * 如果提供了token则验证，否则继续执行
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // 没有token，继续执行但不设置用户信息
    return next();
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      // 有token但无效，应该返回错误
      return res.status(401).json({
        success: false,
        message: '无效的访问令牌'
      });
    }
    req.user = user;
    next();
  });
};

module.exports = {
  authenticateToken,
  authenticateProvider,
  requireRole,
  requireAdmin,
  optionalAuth
};
