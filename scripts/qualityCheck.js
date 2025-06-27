
/**
 * 综合代码质量检查脚本
 * 运行所有质量检查工具并生成报告
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class QualityChecker {
  constructor() {
    this.projectRoot = process.cwd();
    this.results = {
      eslint: { passed: false, errors: [], warnings: [] },
      prettier: { passed: false, errors: [] },
      tests: { passed: false, coverage: null, errors: [] },
      security: { passed: false, vulnerabilities: [], errors: [] },
      dependencies: { passed: false, outdated: [], errors: [] }
    };
    this.startTime = Date.now();
  }

  /**
   * 运行所有质量检查
   */
  async run() {
    console.log('🔍 开始综合代码质量检查...\n');

    try {
      await this.checkESLint();
      await this.checkPrettier();
      await this.checkTests();
      await this.checkSecurity();
      await this.checkDependencies();
      
      this.generateReport();
      
      const hasErrors = this.hasErrors();
      if (hasErrors) {
        console.log('\n❌ 质量检查发现问题，请修复后重试');
        process.exit(1);
      }
      
      console.log('\n✅ 所有质量检查通过！');
    } catch (error) {
      console.error('❌ 质量检查过程中发生错误:', error.message);
      process.exit(1);
    }
  }

  /**
   * ESLint检查
   */
  async checkESLint() {
    console.log('📋 运行ESLint检查...');

    try {
      // 检查后端代码
      const backendResult = this.runCommand('npx eslint src/ tests/ --ext .js --format json');
      const backendIssues = JSON.parse(backendResult);
      
      // 检查前端代码
      let frontendIssues = [];
      if (fs.existsSync('frontend/src')) {
        const frontendResult = this.runCommand('npx eslint frontend/src/ --ext .js,.jsx,.ts,.tsx --format json');
        frontendIssues = JSON.parse(frontendResult);
      }

      const allIssues = [...backendIssues, ...frontendIssues];
      
      // 统计错误和警告
      let errorCount = 0;
      let warningCount = 0;
      
      for (const file of allIssues) {
        for (const message of file.messages) {
          if (message.severity === 2) {
            errorCount++;
            this.results.eslint.errors.push({
              file: file.filePath,
              line: message.line,
              column: message.column,
              rule: message.ruleId,
              message: message.message
            });
          } else if (message.severity === 1) {
            warningCount++;
            this.results.eslint.warnings.push({
              file: file.filePath,
              line: message.line,
              column: message.column,
              rule: message.ruleId,
              message: message.message
            });
          }
        }
      }

      this.results.eslint.passed = errorCount === 0;
      
      if (errorCount === 0 && warningCount === 0) {
        console.log('  ✅ ESLint检查通过，无问题发现');
      } else {
        console.log(`  ⚠️  ESLint发现 ${errorCount} 个错误, ${warningCount} 个警告`);
      }
    } catch (error) {
      this.results.eslint.passed = false;
      this.results.eslint.errors.push({ message: error.message });
      console.log('  ❌ ESLint检查失败:', error.message);
    }
  }

  /**
   * Prettier格式化检查
   */
  async checkPrettier() {
    console.log('🎨 运行Prettier格式化检查...');

    try {
      // 检查后端代码格式
      this.runCommand('npx prettier --check "src/**/*.js" "tests/**/*.js"');
      
      // 检查前端代码格式
      if (fs.existsSync('frontend/src')) {
        this.runCommand('npx prettier --check "frontend/src/**/*.{js,jsx,ts,tsx,css,scss}"');
      }
      
      // 检查配置文件格式
      this.runCommand('npx prettier --check "*.{json,md,yml,yaml}"');

      this.results.prettier.passed = true;
      console.log('  ✅ Prettier格式化检查通过');
    } catch (error) {
      this.results.prettier.passed = false;
      this.results.prettier.errors.push({ message: error.message });
      console.log('  ❌ Prettier格式化检查失败');
    }
  }

  /**
   * 测试检查
   */
  async checkTests() {
    console.log('🧪 运行测试检查...');

    try {
      // 检查测试文件是否存在
      const testFiles = this.findTestFiles();
      if (testFiles.length === 0) {
        throw new Error('未找到任何测试文件，请检查测试配置');
      }

      console.log(`  📁 找到 ${testFiles.length} 个测试文件`);

      // 运行测试（移除危险的 --passWithNoTests 参数）
      this.runCommand('npm test -- --coverage --coverageReporters=json-summary');

      // 读取覆盖率报告
      const coveragePath = path.join(this.projectRoot, 'coverage/coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        this.results.tests.coverage = coverage.total;
      }

      this.results.tests.passed = true;
      console.log('  ✅ 测试检查通过');
      
      if (this.results.tests.coverage) {
        const { lines, statements, functions, branches } = this.results.tests.coverage;
        console.log(`  📊 测试覆盖率: 行 ${lines.pct}%, 语句 ${statements.pct}%, 函数 ${functions.pct}%, 分支 ${branches.pct}%`);
      }
    } catch (error) {
      this.results.tests.passed = false;
      this.results.tests.errors.push({ message: error.message });
      console.log('  ❌ 测试检查失败:', error.message);
    }
  }

  /**
   * 安全检查
   */
  async checkSecurity() {
    console.log('🔒 运行安全检查...');

    try {
      const auditResult = this.runCommand('npm audit --json');
      const audit = JSON.parse(auditResult);
      
      if (audit.vulnerabilities) {
        const vulnCount = Object.keys(audit.vulnerabilities).length;
        if (vulnCount > 0) {
          this.results.security.vulnerabilities = Object.entries(audit.vulnerabilities).map(([name, vuln]) => ({
            name,
            severity: vuln.severity,
            via: vuln.via
          }));
          console.log(`  ⚠️  发现 ${vulnCount} 个安全漏洞`);
        } else {
          console.log('  ✅ 安全检查通过，无漏洞发现');
        }
      }

      this.results.security.passed = this.results.security.vulnerabilities.length === 0;
    } catch (error) {
      // npm audit 在有漏洞时会返回非零退出码，这是正常的
      try {
        const auditResult = error.stdout || '';
        if (auditResult) {
          JSON.parse(auditResult);
          // 处理审计结果...
        }
      } catch (parseError) {
        this.results.security.errors.push({ message: error.message });
        console.log('  ⚠️  安全检查无法完成:', error.message);
      }
    }
  }

  /**
   * 依赖检查
   */
  async checkDependencies() {
    console.log('📦 运行依赖检查...');

    try {
      const outdatedResult = this.runCommand('npm outdated --json');
      const outdated = JSON.parse(outdatedResult);
      
      if (Object.keys(outdated).length > 0) {
        this.results.dependencies.outdated = Object.entries(outdated).map(([name, info]) => ({
          name,
          current: info.current,
          wanted: info.wanted,
          latest: info.latest
        }));
        console.log(`  ⚠️  发现 ${Object.keys(outdated).length} 个过时的依赖`);
      } else {
        console.log('  ✅ 依赖检查通过，所有依赖都是最新的');
      }

      this.results.dependencies.passed = true;
    } catch (error) {
      // npm outdated 在有过时依赖时会返回非零退出码
      this.results.dependencies.passed = true;
      console.log('  ✅ 依赖检查完成');
    }
  }

  /**
   * 运行命令
   */
  runCommand(command) {
    try {
      return execSync(command, { 
        stdio: 'pipe',
        cwd: this.projectRoot,
        encoding: 'utf8'
      });
    } catch (error) {
      throw new Error(`命令执行失败: ${command}\n${error.message}`);
    }
  }

  /**
   * 检查是否有错误
   */
  hasErrors() {
    return !this.results.eslint.passed || 
           !this.results.prettier.passed || 
           !this.results.tests.passed;
  }

  /**
   * 生成质量报告
   */
  generateReport() {
    const duration = Date.now() - this.startTime;
    
    console.log('\n📊 质量检查报告');
    console.log('='.repeat(50));
    console.log(`检查时间: ${duration}ms`);
    console.log(`检查时间: ${new Date().toISOString()}`);
    console.log('');
    
    // ESLint报告
    console.log(`ESLint: ${this.results.eslint.passed ? '✅ 通过' : '❌ 失败'}`);
    if (this.results.eslint.errors.length > 0) {
      console.log(`  错误: ${this.results.eslint.errors.length}`);
    }
    if (this.results.eslint.warnings.length > 0) {
      console.log(`  警告: ${this.results.eslint.warnings.length}`);
    }
    
    // Prettier报告
    console.log(`Prettier: ${this.results.prettier.passed ? '✅ 通过' : '❌ 失败'}`);
    
    // 测试报告
    console.log(`测试: ${this.results.tests.passed ? '✅ 通过' : '❌ 失败'}`);
    if (this.results.tests.coverage) {
      console.log(`  覆盖率: ${this.results.tests.coverage.lines.pct}%`);
    }
    
    // 安全报告
    console.log(`安全: ${this.results.security.passed ? '✅ 通过' : '⚠️  有漏洞'}`);
    if (this.results.security.vulnerabilities.length > 0) {
      console.log(`  漏洞: ${this.results.security.vulnerabilities.length}`);
    }
    
    // 依赖报告
    console.log(`依赖: ${this.results.dependencies.passed ? '✅ 通过' : '⚠️  有过时依赖'}`);
    if (this.results.dependencies.outdated.length > 0) {
      console.log(`  过时依赖: ${this.results.dependencies.outdated.length}`);
    }
  }

  /**
   * 查找测试文件
   */
  findTestFiles() {
    const testFiles = [];
    const testDirs = ['tests', 'test', '__tests__'];
    const testPatterns = [
      /\.test\.(js|ts|jsx|tsx)$/,
      /\.spec\.(js|ts|jsx|tsx)$/
    ];

    // 检查测试目录
    for (const dir of testDirs) {
      const testDir = path.join(this.projectRoot, dir);
      if (fs.existsSync(testDir)) {
        const files = this.getAllFiles(testDir);
        testFiles.push(...files.filter(file =>
          testPatterns.some(pattern => pattern.test(file))
        ));
      }
    }

    // 检查源码目录中的测试文件
    const srcDir = path.join(this.projectRoot, 'src');
    if (fs.existsSync(srcDir)) {
      const files = this.getAllFiles(srcDir);
      testFiles.push(...files.filter(file =>
        testPatterns.some(pattern => pattern.test(file))
      ));
    }

    // 检查前端测试文件
    const frontendDir = path.join(this.projectRoot, 'frontend');
    if (fs.existsSync(frontendDir)) {
      const files = this.getAllFiles(frontendDir);
      testFiles.push(...files.filter(file =>
        testPatterns.some(pattern => pattern.test(file))
      ));
    }

    return testFiles;
  }

  /**
   * 递归获取目录下所有文件
   */
  getAllFiles(dir) {
    const files = [];

    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // 跳过 node_modules 和其他不需要的目录
          if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(item)) {
            files.push(...this.getAllFiles(fullPath));
          }
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // 忽略无法访问的目录
    }

    return files;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const checker = new QualityChecker();
  checker.run().catch(error => {
    console.error('质量检查过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = QualityChecker;
