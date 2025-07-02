/**
 * 创建测试订单数据的脚本
 */

const API_BASE_URL = 'http://localhost:3000/api';

// 通用请求函数
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// 使用现有用户登录
async function loginExistingUser() {
  try {
    console.log('🔑 使用现有用户登录...');
    // 使用一个已知的测试用户账号
    const userLogin = await apiRequest(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'testuser1751358898548@example.com',
        password: 'ComplexP@ssw0rd2025!'
      })
    });

    const userToken = userLogin.data.accessToken;
    console.log('✅ 用户登录成功');

    return { userToken };
  } catch (error) {
    console.error('❌ 用户登录失败:', error.message);
    console.log('💡 尝试注册新用户...');

    // 如果登录失败，尝试注册新用户
    try {
      const newUser = {
        email: `testuser${Date.now()}@example.com`,
        password: 'ComplexP@ssw0rd2025!',
        name: '测试用户'
      };

      const registerResponse = await apiRequest(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        body: JSON.stringify(newUser)
      });

      console.log('✅ 新用户注册成功');

      // 登录新注册的用户
      const loginResponse = await apiRequest(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password
        })
      });

      const userToken = loginResponse.data.accessToken;
      console.log('✅ 新用户登录成功');

      return { userToken };
    } catch (registerError) {
      console.error('❌ 注册新用户也失败:', registerError.message);
      throw registerError;
    }
  }
}

// 创建测试订单
async function createTestOrder(userToken) {
  try {
    console.log('📦 创建测试订单...');
    const orderData = {
      warehouse: '上海仓库A区',
      goods: '电子产品 - 笔记本电脑 x2, 鼠标 x5',
      deliveryAddress: '北京市朝阳区建国门外大街1号',
      description: '紧急订单，请优先处理',
      requirements: '需要包装防震，货物易碎'
    };
    
    const createResponse = await apiRequest(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(orderData)
    });
    
    const createdOrder = createResponse.data || createResponse;
    console.log(`✅ 测试订单创建成功: ${createdOrder.id}`);
    
    return createdOrder;
  } catch (error) {
    console.error('❌ 创建测试订单失败:', error.message);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    console.log('🚀 开始创建测试数据...\n');

    const { userToken } = await loginExistingUser();
    const order = await createTestOrder(userToken);

    console.log('\n📊 测试数据创建完成:');
    console.log(`订单ID: ${order.id}`);
    console.log('\n现在可以在管理员后台测试订单管理功能了！');

  } catch (error) {
    console.error('\n❌ 创建测试数据失败:', error.message);
  }
}

main();
