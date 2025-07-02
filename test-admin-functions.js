/**
 * 测试管理员功能的脚本
 * 验证用户管理和订单管理的API功能
 */

// 使用内置的fetch API

const API_BASE_URL = 'http://localhost:3000/api';

// 管理员登录凭据
const ADMIN_CREDENTIALS = {
  password: 'NewAdmin123!'
};

let adminToken = '';

// 登录管理员
async function loginAdmin() {
  try {
    console.log('🔐 正在登录管理员...');
    const response = await fetch(`${API_BASE_URL}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ADMIN_CREDENTIALS)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    adminToken = data.accessToken;
    console.log('✅ 管理员登录成功');
    return true;
  } catch (error) {
    console.error('❌ 管理员登录失败:', error.message);
    return false;
  }
}

// 获取认证头
function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };
}

// 测试用户管理功能
async function testUserManagement() {
  console.log('\n📋 测试用户管理功能...');
  
  try {
    // 1. 获取用户列表
    console.log('1. 获取用户列表...');
    const usersResponse = await axios.get(`${API_BASE_URL}/admin/users/list`, {
      headers: getAuthHeaders()
    });
    console.log(`✅ 获取用户列表成功，共 ${usersResponse.data.totalItems} 个用户`);
    
    // 2. 创建测试用户
    console.log('2. 创建测试用户...');
    const newUser = {
      email: `test-user-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: '测试用户'
    };
    
    const createResponse = await axios.post(`${API_BASE_URL}/admin/users`, newUser, {
      headers: getAuthHeaders()
    });
    console.log(`✅ 创建用户成功，用户ID: ${createResponse.data.id}`);
    
    const createdUserId = createResponse.data.id;
    
    // 3. 获取用户详情
    console.log('3. 获取用户详情...');
    const userDetailResponse = await axios.get(`${API_BASE_URL}/admin/users/${createdUserId}`, {
      headers: getAuthHeaders()
    });
    console.log(`✅ 获取用户详情成功: ${userDetailResponse.data.name}`);
    
    // 4. 更新用户信息
    console.log('4. 更新用户信息...');
    const updateData = {
      name: '更新后的测试用户',
      isActive: false
    };
    
    const updateResponse = await axios.put(`${API_BASE_URL}/admin/users/${createdUserId}`, updateData, {
      headers: getAuthHeaders()
    });
    console.log(`✅ 更新用户成功: ${updateResponse.data.name}`);
    
    // 5. 删除测试用户
    console.log('5. 删除测试用户...');
    await axios.delete(`${API_BASE_URL}/admin/users/${createdUserId}`, {
      headers: getAuthHeaders()
    });
    console.log('✅ 删除用户成功');
    
    return true;
  } catch (error) {
    console.error('❌ 用户管理测试失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试订单管理功能
async function testOrderManagement() {
  console.log('\n📦 测试订单管理功能...');
  
  try {
    // 1. 获取订单列表
    console.log('1. 获取订单列表...');
    const ordersResponse = await axios.get(`${API_BASE_URL}/admin/orders/all`, {
      headers: getAuthHeaders()
    });
    console.log(`✅ 获取订单列表成功，共 ${ordersResponse.data.totalItems} 个订单`);
    
    // 如果有订单，测试获取订单详情
    if (ordersResponse.data.items && ordersResponse.data.items.length > 0) {
      const firstOrder = ordersResponse.data.items[0];
      
      // 2. 获取订单详情
      console.log('2. 获取订单详情...');
      const orderDetailResponse = await axios.get(`${API_BASE_URL}/orders/${firstOrder.id}`, {
        headers: getAuthHeaders()
      });
      console.log(`✅ 获取订单详情成功: ${orderDetailResponse.data.id}`);
      
      // 3. 更新订单信息（如果订单状态允许）
      if (firstOrder.status === 'active') {
        console.log('3. 更新订单信息...');
        const updateData = {
          warehouse: firstOrder.warehouse + ' (已更新)',
          goods: firstOrder.goods,
          deliveryAddress: firstOrder.deliveryAddress
        };
        
        const updateResponse = await axios.put(`${API_BASE_URL}/orders/${firstOrder.id}`, updateData, {
          headers: getAuthHeaders()
        });
        console.log(`✅ 更新订单成功: ${updateResponse.data.warehouse}`);
      } else {
        console.log('3. 跳过订单更新（订单状态不允许）');
      }
    } else {
      console.log('2-3. 跳过订单详情和更新测试（没有订单数据）');
    }
    
    return true;
  } catch (error) {
    console.error('❌ 订单管理测试失败:', error.response?.data || error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试管理员功能...\n');
  
  // 登录管理员
  const loginSuccess = await loginAdmin();
  if (!loginSuccess) {
    console.log('❌ 测试失败：无法登录管理员');
    return;
  }
  
  // 测试用户管理
  const userTestSuccess = await testUserManagement();
  
  // 测试订单管理
  const orderTestSuccess = await testOrderManagement();
  
  // 总结
  console.log('\n📊 测试结果总结:');
  console.log(`用户管理功能: ${userTestSuccess ? '✅ 通过' : '❌ 失败'}`);
  console.log(`订单管理功能: ${orderTestSuccess ? '✅ 通过' : '❌ 失败'}`);
  
  if (userTestSuccess && orderTestSuccess) {
    console.log('\n🎉 所有测试通过！管理员功能修复成功！');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查相关功能');
  }
}

// 运行测试
runTests().catch(console.error);
