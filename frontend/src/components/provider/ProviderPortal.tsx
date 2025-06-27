import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs } from '@/components/ui';
import { Card, Button } from '@/components/ui';
import AvailableOrdersList from './AvailableOrdersList';
import QuoteHistory from './QuoteHistory';
import { TruckIcon, FileTextIcon, LogOutIcon, RefreshCwIcon } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import type { Provider, Order, Quote } from '@/types';

interface ProviderPortalProps {
  providerKey?: string; // 现在是可选的，因为我们会从URL参数获取
}

const ProviderPortal = ({ providerKey: propProviderKey }: ProviderPortalProps) => {
  const { providerKey: urlProviderKey } = useParams<{ providerKey: string }>();
  const providerKey = propProviderKey || urlProviderKey;
  const [searchTerm, setSearchTerm] = useState('');
  const [providerInfo, setProviderInfo] = useState<Provider | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [quoteHistory, setQuoteHistory] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('availableOrders');
  const { logout } = useAuth();

  // 分页状态 - 可报价订单
  const [availableOrdersPagination, setAvailableOrdersPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    pageSize: 20,
    loading: false
  });

  // 分页状态 - 报价历史
  const [quoteHistoryPagination, setQuoteHistoryPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    pageSize: 20,
    loading: false
  });

  // 加载供应商信息
  const loadProviderInfo = async () => {
    if (!providerKey) {
      setError('缺少供应商标识');
      return;
    }
    try {
      const provider = await api.providers.getProviderByKey(providerKey);
      setProviderInfo(provider);
    } catch (error) {
      console.error('加载供应商信息失败:', error);
      setError('加载供应商信息失败');
    }
  };

  // 加载可报价订单
  const loadAvailableOrders = async (page: number = 1, search?: string) => {
    if (!providerKey) {
      setError('缺少供应商标识');
      return;
    }
    try {
      setAvailableOrdersPagination(prev => ({ ...prev, loading: true }));

      const orders = await api.providers.getAvailableOrders(providerKey);
      
      // 过滤搜索结果
      let filteredOrders = orders;
      if (search?.trim()) {
        filteredOrders = orders.filter(order => 
          order.warehouse.toLowerCase().includes(search.toLowerCase()) ||
          order.deliveryAddress.toLowerCase().includes(search.toLowerCase()) ||
          order.description?.toLowerCase().includes(search.toLowerCase())
        );
      }

      // 简单分页处理
      const startIndex = (page - 1) * availableOrdersPagination.pageSize;
      const endIndex = startIndex + availableOrdersPagination.pageSize;
      const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

      const transformedOrders = paginatedOrders.map((order: Order) => ({
        ...order,
        from: order.warehouse,
        to: order.deliveryAddress,
        createdAt: new Date(order.createdAt).toLocaleString('zh-CN'),
      }));

      setAvailableOrders(transformedOrders);
      setAvailableOrdersPagination(prev => ({
        ...prev,
        currentPage: page,
        totalPages: Math.ceil(filteredOrders.length / prev.pageSize),
        total: filteredOrders.length,
        loading: false
      }));
    } catch (error) {
      console.error('加载可报价订单失败:', error);
      setAvailableOrdersPagination(prev => ({ ...prev, loading: false }));
    }
  };

  // 加载报价历史
  const loadQuoteHistory = async (page: number = 1, search?: string) => {
    if (!providerKey) {
      setError('缺少供应商标识');
      return;
    }
    try {
      setQuoteHistoryPagination(prev => ({ ...prev, loading: true }));

      const quotes = await api.providers.getQuoteHistory(providerKey);
      
      // 过滤搜索结果
      let filteredQuotes = quotes;
      if (search?.trim()) {
        filteredQuotes = quotes.filter(quote => 
          quote.orderId.toLowerCase().includes(search.toLowerCase()) ||
          quote.price.toString().includes(search.toLowerCase())
        );
      }

      // 简单分页处理
      const startIndex = (page - 1) * quoteHistoryPagination.pageSize;
      const endIndex = startIndex + quoteHistoryPagination.pageSize;
      const paginatedQuotes = filteredQuotes.slice(startIndex, endIndex);

      setQuoteHistory(paginatedQuotes);
      setQuoteHistoryPagination(prev => ({
        ...prev,
        currentPage: page,
        totalPages: Math.ceil(filteredQuotes.length / prev.pageSize),
        total: filteredQuotes.length,
        loading: false
      }));
    } catch (error) {
      console.error('加载报价历史失败:', error);
      setQuoteHistoryPagination(prev => ({ ...prev, loading: false }));
    }
  };

  // 初始化数据加载
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError('');

        await Promise.all([
          loadProviderInfo(),
          loadAvailableOrders(1),
          loadQuoteHistory(1)
        ]);
      } catch (error) {
        console.error('加载数据失败:', error);
        setError('加载数据失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };

    if (providerKey) {
      loadInitialData();
    } else {
      setLoading(false);
      setError('缺少供应商标识，请检查URL参数');
    }
  }, [providerKey]);

  // 刷新数据
  const refreshData = async () => {
    await Promise.all([
      loadProviderInfo(),
      loadAvailableOrders(availableOrdersPagination.currentPage, searchTerm),
      loadQuoteHistory(quoteHistoryPagination.currentPage, searchTerm)
    ]);
  };

  // 处理搜索
  const handleSearch = async () => {
    await Promise.all([
      loadAvailableOrders(1, searchTerm),
      loadQuoteHistory(1, searchTerm)
    ]);
    setAvailableOrdersPagination(prev => ({ ...prev, currentPage: 1 }));
    setQuoteHistoryPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // 监听搜索词变化
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!loading) {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // 登出处理
  const handleLogout = async () => {
    try {
      await logout();
      // logout方法会自动处理跳转和清理
    } catch (error) {
      console.error('登出失败:', error);
      // useAuth的logout方法会处理清理工作
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              重新加载
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const providerTabs = [
    {
      id: 'availableOrders',
      label: '可报价订单',
      icon: <TruckIcon size={16} />,
      content: (
        <AvailableOrdersList
          orders={availableOrders}
          loading={availableOrdersPagination.loading}
          providerKey={providerKey || ''}
          onQuoteSubmitted={refreshData}
        />
      )
    },
    {
      id: 'quoteHistory',
      label: '报价历史',
      icon: <FileTextIcon size={16} />,
      content: (
        <QuoteHistory
          quotes={quoteHistory}
          loading={quoteHistoryPagination.loading}
        />
      )
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 供应商信息和操作栏 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {providerInfo?.name || '供应商工作台'}
          </h1>
          <p className="text-gray-600">管理您的报价和订单</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={refreshData}
            icon={<RefreshCwIcon size={16} />}
          >
            刷新数据
          </Button>
          <Button 
            variant="danger" 
            onClick={handleLogout}
            icon={<LogOutIcon size={16} />}
          >
            登出
          </Button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="搜索订单或报价..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* 标签页内容 */}
      <Tabs
        tabs={providerTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
};

export default ProviderPortal;
