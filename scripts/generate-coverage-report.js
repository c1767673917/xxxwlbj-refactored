
/**
 * 测试覆盖率报告生成器
 * 生成详细的测试覆盖率报告和质量分析
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CoverageReportGenerator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.coverageDir = path.join(this.projectRoot, 'coverage');
    this.reportsDir = path.join(this.projectRoot, 'reports');
    
    // 确保报告目录存在
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * 运行测试覆盖率收集
   */
  async runCoverageCollection() {
    console.log('🔍 开始收集测试覆盖率数据...');
    
    try {
      // 运行单元测试覆盖率
      console.log('📊 运行单元测试覆盖率...');
      execSync('npm run test:coverage', { 
        stdio: 'inherit',
        cwd: this.projectRoot,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          DB_TYPE: 'sqlite',
          DB_PATH: ':memory:',
          JWT_SECRET: 'test-secret'
        }
      });

      console.log('✅ 测试覆盖率数据收集完成');
    } catch (error) {
      console.error('❌ 测试覆盖率收集失败:', error.message);
      // 继续生成报告，即使有测试失败
    }
  }

  /**
   * 解析覆盖率数据
   */
  parseCoverageData() {
    const coverageSummaryPath = path.join(this.coverageDir, 'coverage-summary.json');
    
    if (!fs.existsSync(coverageSummaryPath)) {
      console.warn('⚠️  覆盖率摘要文件不存在，跳过解析');
      return null;
    }

    try {
      const coverageData = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
      return coverageData;
    } catch (error) {
      console.error('❌ 解析覆盖率数据失败:', error.message);
      return null;
    }
  }

  /**
   * 生成覆盖率报告
   */
  generateCoverageReport(coverageData) {
    if (!coverageData) {
      return '# 测试覆盖率报告\n\n❌ 无法获取覆盖率数据\n';
    }

    const total = coverageData.total;
    const timestamp = new Date().toISOString();

    let report = `# 测试覆盖率报告\n\n`;
    report += `**生成时间:** ${timestamp}\n\n`;
    
    // 总体覆盖率
    report += `## 📊 总体覆盖率\n\n`;
    report += `| 指标 | 覆盖率 | 状态 |\n`;
    report += `|------|--------|------|\n`;
    report += `| 语句覆盖率 | ${total.statements.pct}% | ${this.getCoverageStatus(total.statements.pct)} |\n`;
    report += `| 分支覆盖率 | ${total.branches.pct}% | ${this.getCoverageStatus(total.branches.pct)} |\n`;
    report += `| 函数覆盖率 | ${total.functions.pct}% | ${this.getCoverageStatus(total.functions.pct)} |\n`;
    report += `| 行覆盖率 | ${total.lines.pct}% | ${this.getCoverageStatus(total.lines.pct)} |\n\n`;

    // 详细文件覆盖率
    report += `## 📁 文件覆盖率详情\n\n`;
    
    const files = Object.keys(coverageData)
      .filter(key => key !== 'total')
      .sort();

    if (files.length > 0) {
      report += `| 文件 | 语句 | 分支 | 函数 | 行 |\n`;
      report += `|------|------|------|------|----|\n`;
      
      files.forEach(file => {
        const fileData = coverageData[file];
        const fileName = path.relative(this.projectRoot, file);
        report += `| ${fileName} | ${fileData.statements.pct}% | ${fileData.branches.pct}% | ${fileData.functions.pct}% | ${fileData.lines.pct}% |\n`;
      });
    } else {
      report += `暂无详细文件覆盖率数据\n`;
    }

    // 覆盖率趋势和建议
    report += `\n## 📈 质量分析\n\n`;
    report += this.generateQualityAnalysis(total);

    return report;
  }

  /**
   * 获取覆盖率状态
   */
  getCoverageStatus(percentage) {
    if (percentage >= 90) return '🟢 优秀';
    if (percentage >= 80) return '🟡 良好';
    if (percentage >= 70) return '🟠 一般';
    return '🔴 需改进';
  }

  /**
   * 生成质量分析
   */
  generateQualityAnalysis(total) {
    let analysis = '';
    
    const avgCoverage = (
      total.statements.pct + 
      total.branches.pct + 
      total.functions.pct + 
      total.lines.pct
    ) / 4;

    analysis += `### 整体评估\n\n`;
    analysis += `平均覆盖率: **${avgCoverage.toFixed(1)}%**\n\n`;

    if (avgCoverage >= 85) {
      analysis += `🎉 **优秀!** 代码覆盖率达到了很高的水平，继续保持！\n\n`;
    } else if (avgCoverage >= 75) {
      analysis += `👍 **良好!** 代码覆盖率处于良好水平，可以进一步提升。\n\n`;
    } else {
      analysis += `⚠️  **需要改进!** 代码覆盖率偏低，建议增加测试用例。\n\n`;
    }

    analysis += `### 改进建议\n\n`;
    
    if (total.statements.pct < 80) {
      analysis += `- 📝 **语句覆盖率偏低** (${total.statements.pct}%): 增加更多的单元测试用例\n`;
    }
    
    if (total.branches.pct < 80) {
      analysis += `- 🔀 **分支覆盖率偏低** (${total.branches.pct}%): 测试更多的条件分支和边界情况\n`;
    }
    
    if (total.functions.pct < 80) {
      analysis += `- 🔧 **函数覆盖率偏低** (${total.functions.pct}%): 确保所有函数都有对应的测试\n`;
    }
    
    if (total.lines.pct < 80) {
      analysis += `- 📏 **行覆盖率偏低** (${total.lines.pct}%): 增加测试用例覆盖更多代码行\n`;
    }

    if (avgCoverage >= 80) {
      analysis += `- ✨ 覆盖率已达到良好水平，继续保持并关注代码质量\n`;
      analysis += `- 🔍 考虑添加集成测试和端到端测试\n`;
      analysis += `- 📊 定期审查测试用例的有效性和维护性\n`;
    }

    return analysis;
  }

  /**
   * 生成完整报告
   */
  async generateReport() {
    console.log('📋 开始生成测试覆盖率报告...');
    
    // 收集覆盖率数据
    await this.runCoverageCollection();
    
    // 解析覆盖率数据
    const coverageData = this.parseCoverageData();
    
    // 生成报告
    const report = this.generateCoverageReport(coverageData);
    
    // 保存报告
    const reportPath = path.join(this.reportsDir, 'coverage-report.md');
    fs.writeFileSync(reportPath, report, 'utf8');
    
    console.log(`✅ 测试覆盖率报告已生成: ${reportPath}`);
    
    // 如果有HTML报告，也复制一份
    const htmlReportSrc = path.join(this.coverageDir, 'lcov-report');
    const htmlReportDest = path.join(this.reportsDir, 'coverage-html');
    
    if (fs.existsSync(htmlReportSrc)) {
      try {
        execSync(`cp -r "${htmlReportSrc}" "${htmlReportDest}"`, { stdio: 'inherit' });
        console.log(`📊 HTML覆盖率报告已复制到: ${htmlReportDest}`);
      } catch (error) {
        console.warn('⚠️  复制HTML报告失败:', error.message);
      }
    }

    return reportPath;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const generator = new CoverageReportGenerator();
  generator.generateReport()
    .then(reportPath => {
      console.log(`\n🎉 报告生成完成！\n📄 查看报告: ${reportPath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 报告生成失败:', error);
      process.exit(1);
    });
}

module.exports = CoverageReportGenerator;
