/**
 * 用户活动记录中间件
 * 自动记录用户的重要操作
 */

const UserActivityService = require('../services/UserActivityService');
const { logger } = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

class ActivityLogger {
  constructor() {
    this.activityService = new UserActivityService();
    
    // 定义需要记录的操作映射
    this.actionMappings = {
      // 认证相关
      'POST /api/auth/login': { action: 'user_login', description: '用户登录' },
      'POST /api/auth/logout': { action: 'user_logout', description: '用户登出' },
      'POST /api/auth/register': { action: 'user_register', description: '用户注册' },
      'POST /api/auth/refresh': { action: 'token_refresh', description: '刷新访问令牌' },
      
      // 用户管理
      'PATCH /api/users/profile': { action: 'profile_update', description: '更新个人资料' },
      'PUT /api/users/password': { action: 'password_change', description: '修改密码' },
      
      // 订单相关
      'POST /api/orders': { action: 'order_create', description: '创建订单', resourceType: 'order' },
      'PUT /api/orders/:id': { action: 'order_update', description: '更新订单', resourceType: 'order' },
      'DELETE /api/orders/:id': { action: 'order_delete', description: '删除订单', resourceType: 'order' },
      'POST /api/orders/:id/select-quote': { action: 'quote_select', description: '选择报价', resourceType: 'order' },
      
      // 报价相关
      'POST /api/quotes': { action: 'quote_submit', description: '提交报价', resourceType: 'quote' },
      'PUT /api/quotes/:id': { action: 'quote_update', description: '更新报价', resourceType: 'quote' },
      
      // 管理员操作
      'POST /api/admin/login': { action: 'admin_login', description: '管理员登录' },
      'POST /api/admin/logout': { action: 'admin_logout', description: '管理员登出' },
      'POST /api/admin/users': { action: 'admin_create_user', description: '管理员创建用户', resourceType: 'user' },
      'PUT /api/admin/users/:id': { action: 'admin_update_user', description: '管理员更新用户', resourceType: 'user' },
      'DELETE /api/admin/users/:id': { action: 'admin_delete_user', description: '管理员删除用户', resourceType: 'user' },
      
      // 导入导出
      'POST /api/import/orders': { action: 'data_import', description: '导入订单数据', resourceType: 'import' },
      'GET /api/export/quotes': { action: 'data_export', description: '导出报价数据', resourceType: 'export' },
      'GET /api/admin/orders/export': { action: 'data_export', description: '导出订单数据', resourceType: 'export' }
    };
  }

  /**
   * 创建活动记录中间件
   * @param {Object} options - 选项
   * @returns {Function} 中间件函数
   */
  createMiddleware(options = {}) {
    return async (req, res, next) => {
      // 保存原始的 res.json 方法
      const originalJson = res.json;
      
      // 重写 res.json 方法以捕获响应
      res.json = function(data) {
        // 异步记录活动，不阻塞响应
        setImmediate(() => {
          try {
            this.recordActivity(req, res, data, options);
          } catch (error) {
            logger.error('记录用户活动失败', {
              error: error.message,
              url: req.originalUrl,
              method: req.method
            });
          }
        });
        
        // 调用原始的 json 方法
        return originalJson.call(this, data);
      }.bind(this);

      next();
    };
  }

  /**
   * 记录用户活动
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Object} responseData - 响应数据
   * @param {Object} options - 选项
   */
  async recordActivity(req, res, responseData, options = {}) {
    try {
      // 检查是否需要记录此操作
      if (!this.shouldRecord(req, res, options)) {
        return;
      }

      // 获取用户信息
      const user = req.user;
      if (!user) {
        return; // 没有用户信息，跳过记录
      }

      // 构建路由键
      const routeKey = this.buildRouteKey(req);
      const actionConfig = this.actionMappings[routeKey];
      
      if (!actionConfig) {
        return; // 没有配置的操作，跳过记录
      }

      // 提取资源ID
      const resourceId = this.extractResourceId(req, actionConfig);

      // 构建活动数据
      const activityData = {
        id: uuidv4(),
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        action: actionConfig.action,
        resourceType: actionConfig.resourceType || null,
        resourceId: resourceId,
        description: this.buildDescription(actionConfig.description, req, responseData),
        metadata: this.buildMetadata(req, res, responseData),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.originalUrl,
        status: this.determineStatus(res, responseData),
        errorMessage: this.extractErrorMessage(responseData),
        createdAt: new Date().toISOString()
      };

      // 记录活动
      await this.activityService.recordActivity(activityData);

    } catch (error) {
      logger.error('记录用户活动时发生错误', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.id
      });
    }
  }

  /**
   * 判断是否应该记录此操作
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Object} options - 选项
   * @returns {boolean} 是否记录
   */
  shouldRecord(req, res, options) {
    // 跳过活动记录相关的API
    if (req.originalUrl.includes('/activity')) {
      return false;
    }

    // 跳过健康检查等系统API
    if (req.originalUrl.includes('/health') || req.originalUrl.includes('/ping')) {
      return false;
    }

    // 只记录成功的操作（2xx状态码）
    if (res.statusCode >= 400) {
      return false;
    }

    return true;
  }

  /**
   * 构建路由键
   * @param {Object} req - 请求对象
   * @returns {string} 路由键
   */
  buildRouteKey(req) {
    let path = req.route?.path || req.originalUrl;
    
    // 替换路径参数为占位符
    if (req.params) {
      Object.keys(req.params).forEach(param => {
        path = path.replace(req.params[param], `:${param}`);
      });
    }

    return `${req.method} ${path}`;
  }

  /**
   * 提取资源ID
   * @param {Object} req - 请求对象
   * @param {Object} actionConfig - 操作配置
   * @returns {string|null} 资源ID
   */
  extractResourceId(req, actionConfig) {
    if (!actionConfig.resourceType) {
      return null;
    }

    // 从路径参数中提取ID
    if (req.params.id) {
      return req.params.id;
    }

    // 从请求体中提取ID（创建操作）
    if (req.body && req.body.id) {
      return req.body.id;
    }

    return null;
  }

  /**
   * 构建描述
   * @param {string} baseDescription - 基础描述
   * @param {Object} req - 请求对象
   * @param {Object} responseData - 响应数据
   * @returns {string} 描述
   */
  buildDescription(baseDescription, req, responseData) {
    let description = baseDescription;

    // 添加资源ID信息
    if (req.params.id) {
      description += ` (ID: ${req.params.id})`;
    }

    return description;
  }

  /**
   * 构建元数据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Object} responseData - 响应数据
   * @returns {Object} 元数据
   */
  buildMetadata(req, res, responseData) {
    const metadata = {
      statusCode: res.statusCode,
      responseTime: res.get('X-Response-Time'),
      contentLength: res.get('Content-Length')
    };

    // 添加查询参数
    if (Object.keys(req.query).length > 0) {
      metadata.queryParams = req.query;
    }

    // 添加路径参数
    if (req.params && Object.keys(req.params).length > 0) {
      metadata.pathParams = req.params;
    }

    return metadata;
  }

  /**
   * 确定操作状态
   * @param {Object} res - 响应对象
   * @param {Object} responseData - 响应数据
   * @returns {string} 状态
   */
  determineStatus(res, responseData) {
    if (res.statusCode >= 500) {
      return 'error';
    } else if (res.statusCode >= 400) {
      return 'failed';
    } else {
      return 'success';
    }
  }

  /**
   * 提取错误消息
   * @param {Object} responseData - 响应数据
   * @returns {string|null} 错误消息
   */
  extractErrorMessage(responseData) {
    if (responseData && !responseData.success && responseData.message) {
      return responseData.message;
    }
    return null;
  }
}

// 创建单例实例
const activityLogger = new ActivityLogger();

module.exports = {
  ActivityLogger,
  activityLogger,
  recordActivity: activityLogger.createMiddleware()
};
