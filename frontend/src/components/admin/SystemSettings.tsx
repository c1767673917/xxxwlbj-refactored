import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { SettingsIcon, SaveIcon, LockIcon } from 'lucide-react';
import api from '@/services/api';

const SystemSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 密码修改表单
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 系统配置表单
  const [systemConfig, setSystemConfig] = useState({
    siteName: '物流报价平台',
    maxFileSize: 10,
    allowedFileTypes: 'jpg,jpeg,png,pdf,doc,docx,xls,xlsx',
    sessionTimeout: 15,
    enableRegistration: false,
    enableEmailNotification: true,
    enableWechatNotification: true
  });

  // 更新管理员密码
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('新密码和确认密码不匹配');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('新密码长度至少6位');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      await api.admin.updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      setSuccess('密码更新成功');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('更新密码失败:', error);
      setError(error instanceof Error ? error.message : '更新密码失败');
    } finally {
      setSaving(false);
    }
  };

  // 加载系统配置
  const loadSystemConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const config = await api.admin.getSystemConfig();

      // 更新系统配置状态
      setSystemConfig(prevConfig => ({
        ...prevConfig,
        ...config
      }));
    } catch (error) {
      console.error('加载系统配置失败:', error);
      setError(error instanceof Error ? error.message : '加载系统配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存系统配置
  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      setError(null);

      // 调用保存系统配置的API
      await api.admin.updateSystemConfig(systemConfig);

      setSuccess('系统配置保存成功');
    } catch (error) {
      console.error('保存系统配置失败:', error);
      setError(error instanceof Error ? error.message : '保存系统配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 组件加载时获取系统配置
  useEffect(() => {
    loadSystemConfig();
  }, []);

  // 清除消息
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">加载系统配置中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">系统设置</h2>
      </div>

      {/* 消息提示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* 管理员密码修改 */}
      <Card>
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
            <LockIcon size={24} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">管理员密码</h3>
            <p className="text-gray-600">修改管理员登录密码</p>
          </div>
        </div>

        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              当前密码
            </label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              新密码
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              确认新密码
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              minLength={6}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={saving}
            icon={<SaveIcon size={16} />}
          >
            更新密码
          </Button>
        </form>
      </Card>

      {/* 系统配置 */}
      <Card>
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
            <SettingsIcon size={24} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">系统配置</h3>
            <p className="text-gray-600">管理系统基本设置</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* 基本设置 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                站点名称
              </label>
              <input
                type="text"
                value={systemConfig.siteName}
                onChange={(e) => setSystemConfig(prev => ({ ...prev, siteName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                会话超时时间 (分钟)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={systemConfig.sessionTimeout}
                onChange={(e) => setSystemConfig(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大文件大小 (MB)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={systemConfig.maxFileSize}
                onChange={(e) => setSystemConfig(prev => ({ ...prev, maxFileSize: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                允许的文件类型
              </label>
              <input
                type="text"
                value={systemConfig.allowedFileTypes}
                onChange={(e) => setSystemConfig(prev => ({ ...prev, allowedFileTypes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="jpg,png,pdf,doc"
              />
            </div>
          </div>

          {/* 功能开关 */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-800">功能开关</h4>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable-registration"
                  checked={systemConfig.enableRegistration}
                  onChange={(e) => setSystemConfig(prev => ({ ...prev, enableRegistration: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="enable-registration" className="text-sm font-medium text-gray-700">
                  启用用户注册
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable-email"
                  checked={systemConfig.enableEmailNotification}
                  onChange={(e) => setSystemConfig(prev => ({ ...prev, enableEmailNotification: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="enable-email" className="text-sm font-medium text-gray-700">
                  启用邮件通知
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enable-wechat"
                  checked={systemConfig.enableWechatNotification}
                  onChange={(e) => setSystemConfig(prev => ({ ...prev, enableWechatNotification: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="enable-wechat" className="text-sm font-medium text-gray-700">
                  启用微信通知
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSaveConfig}
              variant="primary"
              isLoading={saving}
              icon={<SaveIcon size={16} />}
            >
              保存配置
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SystemSettings;
