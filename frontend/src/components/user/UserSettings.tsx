import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { UserIcon, LockIcon, BellIcon, SaveIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import type { WechatConfig } from '@/types';

const UserSettings = () => {
  const { user: authUser, isLoading: authLoading } = useAuth();
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

  // 微信配置表单
  const [wechatConfig, setWechatConfig] = useState<WechatConfig>({
    enabled: false,
    webhook: '',
    secret: ''
  });

  // 加载用户信息
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        setLoading(true);
        if (authUser) {
          // 如果有微信配置，加载它
          if (authUser.wechatConfig) {
            setWechatConfig(authUser.wechatConfig);
          }
        }
      } catch (error) {
        console.error('加载用户信息失败:', error);
        setError('加载用户信息失败');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && authUser) {
      loadUserInfo();
    }
  }, [authUser, authLoading]);

  // 更新密码
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
      
      if (authUser) {
        await api.users.updatePassword(authUser.id, {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        });
        
        setSuccess('密码更新成功');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('更新密码失败:', error);
      setError(error instanceof Error ? error.message : '更新密码失败');
    } finally {
      setSaving(false);
    }
  };

  // 更新微信配置
  const handleWechatConfigUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      if (authUser) {
        await api.users.updateWechatConfig(authUser.id, wechatConfig);
        setSuccess('微信配置更新成功');
      }
    } catch (error) {
      console.error('更新微信配置失败:', error);
      setError(error instanceof Error ? error.message : '更新微信配置失败');
    } finally {
      setSaving(false);
    }
  };

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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <Card className="text-center py-8">
        <p className="text-red-600">无法加载用户信息</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* 用户基本信息 */}
      <Card>
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
            <UserIcon size={32} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">用户信息</h2>
            <p className="text-gray-600">查看和管理您的账户信息</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户名
            </label>
            <p className="text-gray-900">{authUser.username}</p>
          </div>

          {authUser.email && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱
              </label>
              <p className="text-gray-900">{authUser.email}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角色
            </label>
            <p className="text-gray-900">{authUser.role === 'user' ? '普通用户' : authUser.role}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              创建时间
            </label>
            <p className="text-gray-900">
              {authUser.createdAt ? new Date(authUser.createdAt).toLocaleDateString('zh-CN') : '未知'}
            </p>
          </div>
        </div>
      </Card>

      {/* 密码修改 */}
      <Card>
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full">
            <LockIcon size={24} className="text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">修改密码</h3>
            <p className="text-gray-600">更新您的登录密码</p>
          </div>
        </div>

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
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

      {/* 微信通知配置 */}
      <Card>
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
            <BellIcon size={24} className="text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">微信通知</h3>
            <p className="text-gray-600">配置微信消息推送</p>
          </div>
        </div>

        <form onSubmit={handleWechatConfigUpdate} className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="wechat-enabled"
              checked={wechatConfig.enabled}
              onChange={(e) => setWechatConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="wechat-enabled" className="text-sm font-medium text-gray-700">
              启用微信通知
            </label>
          </div>

          {wechatConfig.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={wechatConfig.webhook}
                  onChange={(e) => setWechatConfig(prev => ({ ...prev, webhook: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密钥 (可选)
                </label>
                <input
                  type="password"
                  value={wechatConfig.secret}
                  onChange={(e) => setWechatConfig(prev => ({ ...prev, secret: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="可选的加密密钥"
                />
              </div>
            </>
          )}

          <Button
            type="submit"
            variant="primary"
            isLoading={saving}
            icon={<SaveIcon size={16} />}
          >
            保存配置
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default UserSettings;
