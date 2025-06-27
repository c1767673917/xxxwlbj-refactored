#!/usr/bin/env node

/**
 * 供应商管理工具
 * 用于创建、更新和管理供应商API密钥
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../src/config/database');

/**
 * 生成安全的API密钥
 * @returns {string} 32字节的十六进制字符串
 */
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 创建新供应商
 * @param {string} name - 供应商名称
 * @param {string} webhookUrl - 企业微信Webhook地址（可选）
 * @returns {Object} 创建结果
 */
async function createProvider(name, webhookUrl = null) {
  try {
    // 检查供应商是否已存在
    const existing = await db('providers').where({ name }).first();
    if (existing) {
      throw new Error(`供应商 "${name}" 已存在`);
    }

    // 生成API密钥和哈希
    const apiKey = generateApiKey();
    const hashedKey = await bcrypt.hash(apiKey, 12);

    // 插入数据库
    const providerId = uuidv4();
    await db('providers').insert({
      id: providerId,
      name,
      api_key_hash: hashedKey,
      wechat_webhook_url: webhookUrl,
      status: 'active'
    });

    console.log(`✅ 供应商创建成功:`);
    console.log(`   ID: ${providerId}`);
    console.log(`   名称: ${name}`);
    console.log(`   API密钥: ${apiKey}`);
    console.log(`   状态: active`);
    if (webhookUrl) {
      console.log(`   微信Webhook: ${webhookUrl}`);
    }
    console.log(`\n⚠️  请妥善保存API密钥，系统不会再次显示！`);

    return {
      success: true,
      data: {
        id: providerId,
        name,
        apiKey,
        status: 'active'
      }
    };
  } catch (error) {
    console.error(`❌ 创建供应商失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 重置供应商API密钥
 * @param {string} nameOrId - 供应商名称或ID
 * @returns {Object} 重置结果
 */
async function resetProviderKey(nameOrId) {
  try {
    // 查找供应商
    const provider = await db('providers')
      .where({ name: nameOrId })
      .orWhere({ id: nameOrId })
      .first();

    if (!provider) {
      throw new Error(`供应商 "${nameOrId}" 不存在`);
    }

    // 生成新的API密钥
    const newApiKey = generateApiKey();
    const hashedKey = await bcrypt.hash(newApiKey, 12);

    // 更新数据库
    await db('providers')
      .where({ id: provider.id })
      .update({ 
        api_key_hash: hashedKey,
        updated_at: new Date()
      });

    console.log(`✅ API密钥重置成功:`);
    console.log(`   供应商: ${provider.name}`);
    console.log(`   新API密钥: ${newApiKey}`);
    console.log(`\n⚠️  请妥善保存新密钥，系统不会再次显示！`);

    return {
      success: true,
      data: {
        id: provider.id,
        name: provider.name,
        apiKey: newApiKey
      }
    };
  } catch (error) {
    console.error(`❌ 重置密钥失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 列出所有供应商
 */
async function listProviders() {
  try {
    const providers = await db('providers')
      .select('id', 'name', 'status', 'last_used_at', 'created_at', 'updated_at')
      .orderBy('created_at', 'desc');

    console.log(`\n📋 供应商列表 (共 ${providers.length} 个):`);
    console.log('─'.repeat(80));
    
    providers.forEach(provider => {
      console.log(`ID: ${provider.id}`);
      console.log(`名称: ${provider.name}`);
      console.log(`状态: ${provider.status}`);
      console.log(`创建时间: ${new Date(provider.created_at).toLocaleString()}`);
      if (provider.last_used_at) {
        console.log(`最后使用: ${new Date(provider.last_used_at).toLocaleString()}`);
      }
      console.log('─'.repeat(40));
    });

    return { success: true, data: providers };
  } catch (error) {
    console.error(`❌ 获取供应商列表失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 更新供应商状态
 * @param {string} nameOrId - 供应商名称或ID
 * @param {string} status - 新状态 (active/inactive/suspended)
 */
async function updateProviderStatus(nameOrId, status) {
  try {
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      throw new Error(`无效的状态值，必须是: ${validStatuses.join(', ')}`);
    }

    const provider = await db('providers')
      .where({ name: nameOrId })
      .orWhere({ id: nameOrId })
      .first();

    if (!provider) {
      throw new Error(`供应商 "${nameOrId}" 不存在`);
    }

    await db('providers')
      .where({ id: provider.id })
      .update({ 
        status,
        updated_at: new Date()
      });

    console.log(`✅ 供应商状态更新成功:`);
    console.log(`   供应商: ${provider.name}`);
    console.log(`   新状态: ${status}`);

    return { success: true };
  } catch (error) {
    console.error(`❌ 更新状态失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
🔧 供应商管理工具

用法:
  node scripts/manage-providers.js <命令> [参数]

命令:
  create <name> [webhook_url]     创建新供应商
  reset <name_or_id>              重置供应商API密钥
  list                            列出所有供应商
  status <name_or_id> <status>    更新供应商状态
  help                            显示帮助信息

状态值:
  active      - 激活状态，可以正常使用
  inactive    - 非激活状态，暂时禁用
  suspended   - 暂停状态，因安全问题暂停

示例:
  node scripts/manage-providers.js create "顺丰速运"
  node scripts/manage-providers.js create "圆通快递" "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
  node scripts/manage-providers.js reset "顺丰速运"
  node scripts/manage-providers.js list
  node scripts/manage-providers.js status "顺丰速运" inactive
`);
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help') {
    showHelp();
    process.exit(0);
  }

  const command = args[0];

  try {
    // 测试数据库连接
    await db.raw('SELECT 1');

    switch (command) {
      case 'create':
        if (args.length < 2) {
          console.error('❌ 缺少供应商名称参数');
          process.exit(1);
        }
        await createProvider(args[1], args[2]);
        break;

      case 'reset':
        if (args.length < 2) {
          console.error('❌ 缺少供应商名称或ID参数');
          process.exit(1);
        }
        await resetProviderKey(args[1]);
        break;

      case 'list':
        await listProviders();
        break;

      case 'status':
        if (args.length < 3) {
          console.error('❌ 缺少供应商名称和状态参数');
          process.exit(1);
        }
        await updateProviderStatus(args[1], args[2]);
        break;

      default:
        console.error(`❌ 未知命令: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ 执行失败: ${error.message}`);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await db.destroy();
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createProvider,
  resetProviderKey,
  listProviders,
  updateProviderStatus
};
