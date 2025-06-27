#!/usr/bin/env node

/**
 * 安全测试运行脚本
 * 运行所有安全相关的测试并生成报告
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityTestRunner {
  constructor() {
    this.results = {
      backend: null,
      frontend: null,
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        coverage: 0
      }
    };
  }

  /**
   * 运行后端安全测试
   */
  async runBackendTests() {
    console.log('🔒 运行后端安全测试...\n');
    
    return new Promise((resolve, reject) => {
      const testProcess = spawn('npm', ['test', '--', 'tests/security/'], {
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      testProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(text);
      });

      testProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error(text);
      });

      testProcess.on('close', (code) => {
        this.results.backend = {
          exitCode: code,
          output,
          errorOutput,
          success: code === 0
        };

        if (code === 0) {
          console.log('✅ 后端安全测试通过\n');
        } else {
          console.log('❌ 后端安全测试失败\n');
        }

        resolve();
      });

      testProcess.on('error', (error) => {
        console.error('后端测试运行错误:', error);
        reject(error);
      });
    });
  }

  /**
   * 运行前端安全测试
   */
  async runFrontendTests() {
    console.log('🔒 运行前端安全测试...\n');
    
    return new Promise((resolve, reject) => {
      const testProcess = spawn('npm', ['run', 'test:security'], {
        cwd: path.join(process.cwd(), 'frontend'),
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      testProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(text);
      });

      testProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error(text);
      });

      testProcess.on('close', (code) => {
        this.results.frontend = {
          exitCode: code,
          output,
          errorOutput,
          success: code === 0
        };

        if (code === 0) {
          console.log('✅ 前端安全测试通过\n');
        } else {
          console.log('❌ 前端安全测试失败\n');
        }

        resolve();
      });

      testProcess.on('error', (error) => {
        console.error('前端测试运行错误:', error);
        reject(error);
      });
    });
  }

  /**
   * 解析测试结果
   */
  parseResults() {
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;

    // 解析后端测试结果
    if (this.results.backend?.output) {
      const backendMatches = this.results.backend.output.match(/(\d+) passing|(\d+) failing|(\d+) pending/g);
      if (backendMatches) {
        backendMatches.forEach(match => {
          const [count, type] = match.split(' ');
          const num = parseInt(count, 10);
          
          if (type === 'passing') passedTests += num;
          else if (type === 'failing') failedTests += num;
          else if (type === 'pending') skippedTests += num;
          
          totalTests += num;
        });
      }
    }

    // 解析前端测试结果
    if (this.results.frontend?.output) {
      const frontendMatches = this.results.frontend.output.match(/Tests:\s+(\d+) passed|(\d+) failed|(\d+) skipped/g);
      if (frontendMatches) {
        frontendMatches.forEach(match => {
          if (match.includes('passed')) {
            const num = parseInt(match.match(/(\d+)/)[1], 10);
            passedTests += num;
            totalTests += num;
          } else if (match.includes('failed')) {
            const num = parseInt(match.match(/(\d+)/)[1], 10);
            failedTests += num;
            totalTests += num;
          } else if (match.includes('skipped')) {
            const num = parseInt(match.match(/(\d+)/)[1], 10);
            skippedTests += num;
            totalTests += num;
          }
        });
      }
    }

    this.results.summary = {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      coverage: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
    };
  }

  /**
   * 生成安全测试报告
   */
  generateReport() {
    const timestamp = new Date().toISOString();
    const report = {
      timestamp,
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(process.cwd(), 'reports', 'security-test-report.json');
    
    // 确保报告目录存在
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 生成人类可读的报告
    const readableReport = this.generateReadableReport(report);
    const readableReportPath = path.join(process.cwd(), 'reports', 'security-test-report.md');
    fs.writeFileSync(readableReportPath, readableReport);

    console.log(`📊 安全测试报告已生成:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   Markdown: ${readableReportPath}`);
  }

  /**
   * 生成安全建议
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.results.summary.failedTests > 0) {
      recommendations.push('存在失败的安全测试，请立即修复相关安全问题');
    }

    if (this.results.summary.coverage < 80) {
      recommendations.push('安全测试覆盖率较低，建议增加更多安全测试用例');
    }

    if (!this.results.backend?.success) {
      recommendations.push('后端安全测试失败，请检查服务器端安全实现');
    }

    if (!this.results.frontend?.success) {
      recommendations.push('前端安全测试失败，请检查客户端安全实现');
    }

    if (recommendations.length === 0) {
      recommendations.push('所有安全测试通过，系统安全性良好');
    }

    return recommendations;
  }

  /**
   * 生成可读的报告
   */
  generateReadableReport(report) {
    return `# 安全测试报告

## 测试概览

- **测试时间**: ${report.timestamp}
- **总测试数**: ${report.results.summary.totalTests}
- **通过测试**: ${report.results.summary.passedTests}
- **失败测试**: ${report.results.summary.failedTests}
- **跳过测试**: ${report.results.summary.skippedTests}
- **测试覆盖率**: ${report.results.summary.coverage}%

## 测试结果

### 后端安全测试
- **状态**: ${report.results.backend?.success ? '✅ 通过' : '❌ 失败'}
- **退出码**: ${report.results.backend?.exitCode || 'N/A'}

### 前端安全测试
- **状态**: ${report.results.frontend?.success ? '✅ 通过' : '❌ 失败'}
- **退出码**: ${report.results.frontend?.exitCode || 'N/A'}

## 安全建议

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## 详细输出

### 后端测试输出
\`\`\`
${report.results.backend?.output || '无输出'}
\`\`\`

### 前端测试输出
\`\`\`
${report.results.frontend?.output || '无输出'}
\`\`\`

---
*报告生成时间: ${new Date().toLocaleString()}*
`;
  }

  /**
   * 运行所有安全测试
   */
  async runAll() {
    console.log('🚀 开始运行安全测试套件\n');
    console.log('=' .repeat(50));

    try {
      // 运行后端测试
      await this.runBackendTests();
      
      // 运行前端测试
      await this.runFrontendTests();

      // 解析结果
      this.parseResults();

      // 生成报告
      this.generateReport();

      // 输出总结
      console.log('\n' + '='.repeat(50));
      console.log('📊 安全测试总结:');
      console.log(`   总测试数: ${this.results.summary.totalTests}`);
      console.log(`   通过: ${this.results.summary.passedTests}`);
      console.log(`   失败: ${this.results.summary.failedTests}`);
      console.log(`   跳过: ${this.results.summary.skippedTests}`);
      console.log(`   覆盖率: ${this.results.summary.coverage}%`);

      const allPassed = this.results.backend?.success && this.results.frontend?.success;
      if (allPassed) {
        console.log('\n✅ 所有安全测试通过！');
        process.exit(0);
      } else {
        console.log('\n❌ 部分安全测试失败，请检查报告');
        process.exit(1);
      }

    } catch (error) {
      console.error('安全测试运行失败:', error);
      process.exit(1);
    }
  }
}

// 运行测试
if (require.main === module) {
  const runner = new SecurityTestRunner();
  runner.runAll();
}

module.exports = SecurityTestRunner;
