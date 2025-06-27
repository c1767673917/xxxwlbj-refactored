import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '@/components/ui';
import { TruckIcon, KeyIcon, AlertCircleIcon } from 'lucide-react';
import api from '@/services/api';

// 供应商登录页面组件
const ProviderLoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    accessKey: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // 清除错误信息
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.accessKey.trim()) {
      setError('请输入访问密钥');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 使用访问密钥登录
      const response = await api.auth.loginProvider(formData.accessKey.trim());

      // 保存认证信息
      localStorage.setItem('provider_token', response.accessToken);
      localStorage.setItem('provider_key', formData.accessKey.trim());

      // 跳转到供应商工作台
      navigate(`/provider/${formData.accessKey.trim()}`);
    } catch (error) {
      console.error('供应商登录失败:', error);
      setError(error instanceof Error ? error.message : '登录失败，请检查访问密钥');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 头部 */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
              <TruckIcon size={32} className="text-blue-600" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            供应商登录
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            请输入您的访问密钥以登录系统
          </p>
        </div>

        {/* 登录表单 */}
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 错误提示 */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircleIcon size={16} className="text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* 访问密钥输入 */}
            <div>
              <label htmlFor="accessKey" className="block text-sm font-medium text-gray-700 mb-2">
                访问密钥
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyIcon size={16} className="text-gray-400" />
                </div>
                <input
                  id="accessKey"
                  name="accessKey"
                  type="password"
                  required
                  value={formData.accessKey}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="请输入您的访问密钥"
                  disabled={loading}
                />
              </div>
            </div>

            {/* 登录按钮 */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={loading}
              disabled={loading || !formData.accessKey.trim()}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>

          {/* 帮助信息 */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              如果您忘记了访问密钥，请联系系统管理员
            </p>
          </div>
        </Card>

        {/* 返回首页 */}
        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProviderLoginPage;
