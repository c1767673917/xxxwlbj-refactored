/**
 * 简化的管理员功能测试脚本
 */

const API_BASE_URL = 'http://localhost:3000/api';
const ADMIN_CREDENTIALS = { password: 'NewAdmin123!' };

let adminToken = '';

// 通用请求函数
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(adminToken && { 'Authorization': `Bearer ${adminToken}` }),
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

// 登录管理员
async function loginAdmin() {
  try {
    console.log('🔐 正在登录管理员...');
    const data = await apiRequest(`${API_BASE_URL}/admin/login`, {
      method: 'POST',
      body: JSON.stringify(ADMIN_CREDENTIALS)
    });
    adminToken = data.data.accessToken;
    console.log('✅ 管理员登录成功');
    return true;
  } catch (error) {
    console.error('❌ 管理员登录失败:', error.message);
    return false;
  }
}

// 测试用户管理
async function testUserManagement() {
  console.log('\n📋 测试用户管理功能...');
  
  try {
    // 获取用户列表
    console.log('1. 获取用户列表...');
    const usersResponse = await apiRequest(`${API_BASE_URL}/admin/users/list`);
    const users = usersResponse.data || usersResponse;
    console.log(`✅ 获取用户列表成功，共 ${users.totalItems || users.length || 0} 个用户`);
    
    // 创建测试用户
    console.log('2. 创建测试用户...');
    const newUser = {
      email: `testuser${Date.now()}@example.com`,
      password: 'ComplexP@ssw0rd2025!',
      name: '测试用户'
    };
    
    const createResponse = await apiRequest(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      body: JSON.stringify(newUser)
    });
    const createdUser = createResponse.data || createResponse;
    console.log(`✅ 创建用户成功，用户ID: ${createdUser.id}`);
    
    // 获取用户详情
    console.log('3. 获取用户详情...');
    const userDetailResponse = await apiRequest(`${API_BASE_URL}/admin/users/${createdUser.id}`);
    const userDetail = userDetailResponse.data || userDetailResponse;
    console.log(`✅ 获取用户详情成功: ${userDetail.name}`);
    
    // 更新用户信息
    console.log('4. 更新用户信息...');
    const updateData = {
      name: '更新后的测试用户'
    };
    
    const updateResponse = await apiRequest(`${API_BASE_URL}/admin/users/${createdUser.id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    const updatedUser = updateResponse.data || updateResponse;
    console.log(`✅ 更新用户成功: ${updatedUser.name}`);
    
    // 删除测试用户
    console.log('5. 删除测试用户...');
    await apiRequest(`${API_BASE_URL}/admin/users/${createdUser.id}`, {
      method: 'DELETE'
    });
    console.log('✅ 删除用户成功');
    
    return true;
  } catch (error) {
    console.error('❌ 用户管理测试失败:', error.message);
    return false;
  }
}

// 测试订单管理
async function testOrderManagement() {
  console.log('\n📦 测试订单管理功能...');
  
  try {
    // 获取订单列表
    console.log('1. 获取订单列表...');
    const ordersResponse = await apiRequest(`${API_BASE_URL}/admin/orders/all`);
    const orders = ordersResponse.data || ordersResponse;
    console.log(`✅ 获取订单列表成功，共 ${orders.totalItems || orders.length || 0} 个订单`);
    
    // 如果有订单，测试获取订单详情
    if (orders.items && orders.items.length > 0) {
      const firstOrder = orders.items[0];
      
      // 获取订单详情
      console.log('2. 获取订单详情...');
      const orderDetailResponse = await apiRequest(`${API_BASE_URL}/orders/${firstOrder.id}`);
      const orderDetail = orderDetailResponse.data || orderDetailResponse;
      console.log(`✅ 获取订单详情成功: ${orderDetail.id}`);
      
      // 更新订单信息（如果订单状态允许）
      if (firstOrder.status === 'active') {
        console.log('3. 更新订单信息...');
        const updateData = {
          warehouse: firstOrder.warehouse + ' (已更新)',
          goods: firstOrder.goods,
          deliveryAddress: firstOrder.deliveryAddress
        };
        
        const updateResponse = await apiRequest(`${API_BASE_URL}/orders/${firstOrder.id}`, {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });
        const updatedOrder = updateResponse.data || updateResponse;
        console.log(`✅ 更新订单成功: ${updatedOrder.warehouse}`);
      } else {
        console.log('3. 跳过订单更新（订单状态不允许）');
      }
    } else {
      console.log('2-3. 跳过订单详情和更新测试（没有订单数据）');
    }
    
    return true;
  } catch (error) {
    console.error('❌ 订单管理测试失败:', error.message);
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
