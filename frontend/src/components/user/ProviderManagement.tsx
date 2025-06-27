import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { TruckIcon, PhoneIcon, MailIcon, MapPinIcon, StarIcon } from 'lucide-react';
import api from '@/services/api';
import type { Provider } from '@/types';

interface ProviderManagementProps {
  onSelectProvider?: (provider: Provider) => void;
  selectedProviderId?: string | number;
}

const ProviderManagement = ({ onSelectProvider, selectedProviderId }: ProviderManagementProps) => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 加载供应商列表
  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);
        const response = await api.providers.getProviders();
        setProviders(response.items || []);
      } catch (error) {
        console.error('加载供应商失败:', error);
        setError('加载供应商失败，请重试');
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, []);

  // 过滤供应商
  const filteredProviders = providers.filter(provider =>
    provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.serviceArea?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectProvider = (provider: Provider) => {
    onSelectProvider?.(provider);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          重新加载
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div>
        <input
          type="text"
          placeholder="搜索供应商..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* 供应商列表 */}
      {filteredProviders.length === 0 ? (
        <Card className="text-center py-8">
          <TruckIcon size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">
            {searchTerm ? '未找到匹配的供应商' : '暂无供应商数据'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <Card 
              key={provider.id} 
              className={`hover:shadow-md transition-shadow ${
                selectedProviderId == provider.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                    <TruckIcon size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {provider.name}
                    </h3>
                    {provider.rating && (
                      <div className="flex items-center space-x-1">
                        <StarIcon size={16} className="text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600">{provider.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {provider.contactPerson && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <span className="text-sm">联系人: {provider.contactPerson}</span>
                  </div>
                )}

                {provider.phone && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <PhoneIcon size={16} />
                    <span className="text-sm">{provider.phone}</span>
                  </div>
                )}

                {provider.email && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MailIcon size={16} />
                    <span className="text-sm">{provider.email}</span>
                  </div>
                )}

                {provider.serviceArea && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPinIcon size={16} />
                    <span className="text-sm">服务区域: {provider.serviceArea}</span>
                  </div>
                )}
              </div>

              {provider.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {provider.description}
                </p>
              )}

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {provider.isActive ? (
                    <span className="text-green-600">● 活跃</span>
                  ) : (
                    <span className="text-gray-400">● 不活跃</span>
                  )}
                </div>

                {onSelectProvider && (
                  <Button
                    variant={selectedProviderId == provider.id ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleSelectProvider(provider)}
                  >
                    {selectedProviderId == provider.id ? '已选择' : '选择'}
                  </Button>
                )}
              </div>

              {/* 供应商统计信息 */}
              {(provider.totalOrders || provider.completedOrders) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    {provider.totalOrders && (
                      <div>
                        <p className="text-lg font-semibold text-gray-800">
                          {provider.totalOrders}
                        </p>
                        <p className="text-xs text-gray-600">总订单</p>
                      </div>
                    )}
                    {provider.completedOrders && (
                      <div>
                        <p className="text-lg font-semibold text-green-600">
                          {provider.completedOrders}
                        </p>
                        <p className="text-xs text-gray-600">已完成</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProviderManagement;
