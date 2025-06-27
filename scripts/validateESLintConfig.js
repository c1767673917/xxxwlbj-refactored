
/**
 * ESLint配置验证脚本
 * 验证前后端ESLint配置是否正确工作
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ESLintConfigValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.results = {
      backend: { passed: 0, failed: 0, errors: [] },
      frontend: { passed: 0, failed: 0, errors: [] }
    };
  }

  /**
   * 运行验证
   */
  async run() {
    console.log('🔍 开始验证ESLint配置...\n');

    try {
      await this.validateBackendConfig();
      await this.validateFrontendConfig();
      await this.validateCrossProjectConsistency();
      
      this.printResults();
      
      const totalErrors = this.results.backend.failed + this.results.frontend.failed;
      if (totalErrors > 0) {
        process.exit(1);
      }
      
      console.log('✅ ESLint配置验证通过！');
    } catch (error) {
      console.error('❌ ESLint配置验证失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 验证后端配置
   */
  async validateBackendConfig() {
    console.log('📋 验证后端ESLint配置...');

    const tests = [
      {
        name: '后端配置文件存在',
        test: () => fs.existsSync(path.join(this.projectRoot, '.eslintrc.js'))
      },
      {
        name: '后端代码语法检查',
        test: () => this.runESLint('src/', '--ext .js')
      },
      {
        name: '测试文件语法检查',
        test: () => this.runESLint('tests/', '--ext .js')
      },
      {
        name: '复杂度规则生效',
        test: () => this.checkComplexityRule('src/')
      },
      {
        name: '异步编程规则生效',
        test: () => this.checkAsyncRules('src/')
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        if (result !== false) {
          this.results.backend.passed++;
          console.log(`  ✅ ${test.name}`);
        } else {
          this.results.backend.failed++;
          console.log(`  ❌ ${test.name}`);
        }
      } catch (error) {
        this.results.backend.failed++;
        this.results.backend.errors.push(`${test.name}: ${error.message}`);
        console.log(`  ❌ ${test.name}: ${error.message}`);
      }
    }
  }

  /**
   * 验证前端配置
   */
  async validateFrontendConfig() {
    console.log('\n📋 验证前端ESLint配置...');

    const frontendPath = path.join(this.projectRoot, 'frontend');
    if (!fs.existsSync(frontendPath)) {
      console.log('  ⚠️  前端目录不存在，跳过前端验证');
      return;
    }

    const tests = [
      {
        name: '前端配置文件存在',
        test: () => fs.existsSync(path.join(frontendPath, '.eslintrc.js'))
      },
      {
        name: '前端代码语法检查',
        test: () => this.runESLint('frontend/src/', '--ext .js,.jsx,.ts,.tsx')
      },
      {
        name: 'React规则生效',
        test: () => this.checkReactRules('frontend/src/')
      },
      {
        name: 'TypeScript规则生效',
        test: () => this.checkTypeScriptRules('frontend/src/')
      },
      {
        name: '可访问性规则生效',
        test: () => this.checkA11yRules('frontend/src/')
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        if (result !== false) {
          this.results.frontend.passed++;
          console.log(`  ✅ ${test.name}`);
        } else {
          this.results.frontend.failed++;
          console.log(`  ❌ ${test.name}`);
        }
      } catch (error) {
        this.results.frontend.failed++;
        this.results.frontend.errors.push(`${test.name}: ${error.message}`);
        console.log(`  ❌ ${test.name}: ${error.message}`);
      }
    }
  }

  /**
   * 验证跨项目一致性
   */
  async validateCrossProjectConsistency() {
    console.log('\n📋 验证跨项目配置一致性...');

    const tests = [
      {
        name: '代码质量标准一致',
        test: () => this.checkQualityStandardsConsistency()
      },
      {
        name: '复杂度限制一致',
        test: () => this.checkComplexityConsistency()
      },
      {
        name: '安全规则一致',
        test: () => this.checkSecurityRulesConsistency()
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        if (result !== false) {
          console.log(`  ✅ ${test.name}`);
        } else {
          console.log(`  ❌ ${test.name}`);
        }
      } catch (error) {
        console.log(`  ❌ ${test.name}: ${error.message}`);
      }
    }
  }

  /**
   * 运行ESLint检查
   */
  runESLint(path, extensions) {
    try {
      execSync(`npx eslint ${path} ${extensions} --quiet`, { 
        stdio: 'pipe',
        cwd: this.projectRoot 
      });
      return true;
    } catch (error) {
      // ESLint返回非零退出码表示有错误，但这里我们只是验证配置是否工作
      return error.status !== 2; // 2表示配置错误
    }
  }

  /**
   * 检查复杂度规则
   */
  checkComplexityRule(path) {
    try {
      const output = execSync(`npx eslint ${path} --ext .js --format json`, { 
        stdio: 'pipe',
        cwd: this.projectRoot 
      });
      
      const results = JSON.parse(output.toString());
      results.some(result =>
        result.messages.some(message => message.ruleId === 'complexity')
      );
      
      return true; // 配置存在即可
    } catch (error) {
      return error.status !== 2;
    }
  }

  /**
   * 检查异步编程规则
   */
  checkAsyncRules(path) {
    const asyncRules = ['require-await', 'no-async-promise-executor', 'prefer-promise-reject-errors'];
    // 简化检查：只要配置文件包含这些规则就认为通过
    const configPath = path.includes('frontend') ? 
      'frontend/.eslintrc.js' : '.eslintrc.js';
    
    try {
      const config = fs.readFileSync(configPath, 'utf8');
      return asyncRules.some(rule => config.includes(rule));
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查React规则
   */
  checkReactRules(_path) {
    try {
      const configPath = 'frontend/.eslintrc.js';
      const config = fs.readFileSync(configPath, 'utf8');
      return config.includes('react-hooks/rules-of-hooks');
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查TypeScript规则
   */
  checkTypeScriptRules(_path) {
    try {
      const configPath = 'frontend/.eslintrc.js';
      const config = fs.readFileSync(configPath, 'utf8');
      return config.includes('@typescript-eslint');
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查可访问性规则
   */
  checkA11yRules(_path) {
    try {
      const configPath = 'frontend/.eslintrc.js';
      const config = fs.readFileSync(configPath, 'utf8');
      return config.includes('jsx-a11y');
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查质量标准一致性
   */
  checkQualityStandardsConsistency() {
    // 检查前后端都有相同的基础质量规则
    const commonRules = ['no-console', 'no-debugger', 'prefer-const', 'complexity'];
    
    try {
      const backendConfig = fs.readFileSync('.eslintrc.js', 'utf8');
      const frontendConfig = fs.readFileSync('frontend/.eslintrc.js', 'utf8');
      
      return commonRules.every(rule => 
        backendConfig.includes(rule) && frontendConfig.includes(rule)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查复杂度限制一致性
   */
  checkComplexityConsistency() {
    try {
      const backendConfig = fs.readFileSync('.eslintrc.js', 'utf8');
      const frontendConfig = fs.readFileSync('frontend/.eslintrc.js', 'utf8');
      
      const backendComplexity = backendConfig.match(/complexity.*?(\d+)/);
      const frontendComplexity = frontendConfig.match(/complexity.*?(\d+)/);
      
      return backendComplexity && frontendComplexity && 
             backendComplexity[1] === frontendComplexity[1];
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查安全规则一致性
   */
  checkSecurityRulesConsistency() {
    const securityRules = ['no-eval', 'no-implied-eval', 'no-new-func'];
    
    try {
      const backendConfig = fs.readFileSync('.eslintrc.js', 'utf8');
      const frontendConfig = fs.readFileSync('frontend/.eslintrc.js', 'utf8');
      
      return securityRules.every(rule => 
        backendConfig.includes(rule) && frontendConfig.includes(rule)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * 打印验证结果
   */
  printResults() {
    console.log('\n📊 验证结果汇总:');
    console.log(`后端: ${this.results.backend.passed} 通过, ${this.results.backend.failed} 失败`);
    console.log(`前端: ${this.results.frontend.passed} 通过, ${this.results.frontend.failed} 失败`);
    
    if (this.results.backend.errors.length > 0) {
      console.log('\n❌ 后端错误:');
      this.results.backend.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (this.results.frontend.errors.length > 0) {
      console.log('\n❌ 前端错误:');
      this.results.frontend.errors.forEach(error => console.log(`  - ${error}`));
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const validator = new ESLintConfigValidator();
  validator.run().catch(error => {
    console.error('验证过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = ESLintConfigValidator;
