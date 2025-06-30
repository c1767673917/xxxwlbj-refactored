/**
 * 认证相关路由
 * 处理用户注册、登录、密码修改等认证功能
 */

const express = require('express');
const { auth, validation, security } = require('../middleware');
const { userController } = require('../controllers');

const router = express.Router();

// 用户注册
router.post('/register', 
  security.authRateLimit,
  validation.validateUserRegistration,
  userController.register
);

// 用户登录
router.post('/login',
  security.authRateLimit,
  validation.validateUserLogin,
  userController.login
);

// 供应商登录
router.post('/login/provider',
  security.authRateLimit,
  validation.validateProviderLogin,
  userController.loginProvider
);

// 获取当前用户信息
router.get('/me',
  auth.authenticateToken,
  userController.getCurrentUserInfo
);

// 修改密码
router.post('/change-password',
  auth.authenticateToken,
  validation.validatePasswordChange,
  userController.changePassword
);

// 刷新token
router.post('/refresh',
  validation.validateRefreshToken,
  userController.refreshToken
);

// 验证token有效性
router.get('/verify',
  auth.authenticateToken,
  (req, res) => {
    res.json({
      success: true,
      user: req.user,
      message: 'Token有效'
    });
  }
);

// 登出
router.post('/logout',
  auth.authenticateToken,
  userController.logout
);

module.exports = router;
