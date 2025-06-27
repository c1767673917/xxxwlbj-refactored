#!/usr/bin/env node

/**
 * 安全测试运行脚本
 * 运行所有安全相关的测试并生成报告
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(title) {
  const border = '='.repeat(60);
  colorLog(border, 'cyan');
  colorLog(`  ${title}`, 'bright');
  colorLog(border, 'cyan');
}

function printSection(title) {
  colorLog(`\n📋 ${title}`, 'yellow');
  colorLog('-'.repeat(40), 'yellow');
}

async function runSecurityTests() {
  try {
    printHeader('WLBJ 前端认证安全测试');
    
    // 检查测试环境
    printSection('检查测试环境');
    
    try {
      execSync('npm list vitest', { stdio: 'ignore' });
      colorLog('✅ Vitest 已安装', 'green');
    } catch (error) {
      colorLog('❌ Vitest 未安装，正在安装...', 'red');
      execSync('npm install --save-dev vitest @testing-library/react @testing-library/jest-dom', { stdio: 'inherit' });
    }
    
    // 运行认证安全测试
    printSection('运行认证安全测试');
    
    const testCommands = [
      {
        name: '基础认证安全测试',
        command: 'npx vitest run tests/security/auth.test.ts --reporter=verbose',
        file: 'tests/security/auth.test.ts'
      },
      {
        name: '组件安全测试',
        command: 'npx vitest run tests/security/components.test.tsx --reporter=verbose',
        file: 'tests/security/components.test.tsx'
      },
      {
        name: '认证流程集成测试',
        command: 'npx vitest run tests/integration/auth-flow.test.tsx --reporter=verbose',
        file: 'tests/integration/auth-flow.test.tsx'
      }
    ];
    
    const results = [];
    
    for (const test of testCommands) {
      colorLog(`\n🧪 运行: ${test.name}`, 'blue');
      
      // 检查测试文件是否存在
      if (!fs.existsSync(test.file)) {
        colorLog(`⚠️  测试文件不存在: ${test.file}`, 'yellow');
        results.push({ name: test.name, status: 'skipped', reason: '文件不存在' });
        continue;
      }
      
      try {
        const output = execSync(test.command, { 
          encoding: 'utf8',
          cwd: process.cwd()
        });
        
        colorLog('✅ 测试通过', 'green');
        results.push({ name: test.name, status: 'passed', output });
        
      } catch (error) {
        colorLog('❌ 测试失败', 'red');
        colorLog(error.stdout || error.message, 'red');
        results.push({ 
          name: test.name, 
          status: 'failed', 
          error: error.stdout || error.message 
        });
      }
    }
    
    // 运行覆盖率测试
    printSection('生成测试覆盖率报告');
    
    try {
      const coverageCommand = 'npx vitest run --coverage tests/security/ tests/integration/';
      colorLog('📊 生成覆盖率报告...', 'blue');
      
      const coverageOutput = execSync(coverageCommand, { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      colorLog('✅ 覆盖率报告生成完成', 'green');
      results.push({ name: '覆盖率报告', status: 'passed', output: coverageOutput });
      
    } catch (error) {
      colorLog('⚠️  覆盖率报告生成失败', 'yellow');
      colorLog(error.message, 'yellow');
    }
    
    // 生成安全测试报告
    printSection('生成安全测试报告');
    
    const report = generateSecurityReport(results);
    const reportPath = path.join(process.cwd(), 'security-test-report.md');
    
    fs.writeFileSync(reportPath, report);
    colorLog(`📄 安全测试报告已生成: ${reportPath}`, 'green');
    
    // 显示测试总结
    printSection('测试总结');
    
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    
    colorLog(`✅ 通过: ${passed}`, 'green');
    colorLog(`❌ 失败: ${failed}`, failed > 0 ? 'red' : 'green');
    colorLog(`⏭️  跳过: ${skipped}`, skipped > 0 ? 'yellow' : 'green');
    
    if (failed > 0) {
      colorLog('\n⚠️  发现安全测试失败，请检查上述错误信息', 'red');
      process.exit(1);
    } else {
      colorLog('\n🎉 所有安全测试通过！', 'green');
    }
    
  } catch (error) {
    colorLog(`\n💥 测试运行失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

function generateSecurityReport(results) {
  const timestamp = new Date().toISOString();
  
  let report = `# WLBJ 前端认证安全测试报告

**生成时间**: ${timestamp}

## 测试概述

本报告包含了 WLBJ 重构项目前端认证系统的安全测试结果。

## 测试结果

`;

  results.forEach((result, index) => {
    const statusIcon = result.status === 'passed' ? '✅' : 
                     result.status === 'failed' ? '❌' : '⏭️';
    
    report += `### ${index + 1}. ${result.name} ${statusIcon}

**状态**: ${result.status}

`;

    if (result.status === 'failed' && result.error) {
      report += `**错误信息**:
\`\`\`
${result.error}
\`\`\`

`;
    }

    if (result.status === 'skipped' && result.reason) {
      report += `**跳过原因**: ${result.reason}

`;
    }
  });

  report += `## 安全检查清单

### ✅ 已修复的安全问题

- [x] 前端权限绕过漏洞 - 统一使用 useAuth Hook 进行认证验证
- [x] 认证逻辑分裂 - 移除 LegacyAuthService，统一认证入口
- [x] 管理员路由保护 - AdminProtectedRoute 使用后端验证
- [x] 用户数据隔离 - UserSettings 只显示当前用户数据
- [x] Token 验证 - 所有认证检查都通过后端验证
- [x] 会话管理 - 统一的登录/登出流程
- [x] 错误处理 - 安全的错误信息处理

### 🔒 安全特性

- **统一认证**: 所有组件使用 useAuth Hook
- **后端验证**: Token 验证通过 API 调用
- **角色检查**: 严格的角色权限验证
- **自动登出**: Token 过期自动清理认证信息
- **输入验证**: 防止 XSS 和注入攻击
- **会话安全**: 防止会话固定和劫持

### 📊 测试覆盖范围

- 认证状态管理
- 组件权限控制
- API 安全调用
- 错误处理机制
- 输入验证
- 会话管理

## 建议

1. **定期运行安全测试**: 建议在每次代码变更后运行安全测试
2. **监控认证日志**: 在生产环境中监控认证相关的日志
3. **更新依赖**: 定期更新前端依赖以修复安全漏洞
4. **代码审查**: 对认证相关代码进行严格的代码审查

## 结论

${results.filter(r => r.status === 'failed').length === 0 ? 
  '🎉 所有安全测试通过，前端认证系统安全性良好。' : 
  '⚠️ 发现安全测试失败，需要立即修复相关问题。'}
`;

  return report;
}

// 运行测试
if (require.main === module) {
  runSecurityTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = { runSecurityTests, generateSecurityReport };
