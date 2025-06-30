/**
 * 将管理员密码从环境变量迁移到数据库
 * 创建默认管理员用户记录
 */

const bcrypt = require('bcryptjs');

exports.up = async function(knex) {
  // 检查是否已存在管理员用户
  const existingAdmin = await knex('users')
    .where({ role: 'admin' })
    .first();

  if (existingAdmin) {
    console.log('管理员用户已存在，跳过迁移');
    return;
  }

  // 从环境变量获取当前管理员密码哈希
  let adminPasswordHash = process.env.ADMIN_PASSWORD;
  
  // 如果环境变量中没有设置，使用默认密码
  if (!adminPasswordHash) {
    console.log('环境变量中未找到ADMIN_PASSWORD，使用默认密码 admin123!');
    adminPasswordHash = await bcrypt.hash('admin123!', 12);
  }

  // 创建默认管理员用户
  const adminUser = {
    id: 'admin-' + Date.now(), // 生成唯一ID
    email: 'admin@system.local',
    password: adminPasswordHash,
    name: '系统管理员',
    role: 'admin',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  };

  await knex('users').insert(adminUser);
  
  console.log('默认管理员用户已创建:', {
    id: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role
  });
};

exports.down = async function(knex) {
  // 删除管理员用户
  await knex('users')
    .where({ role: 'admin' })
    .del();
    
  console.log('管理员用户已删除');
};
