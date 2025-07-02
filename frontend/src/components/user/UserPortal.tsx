import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import {
  LogOutIcon
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import type { Order } from '@/types';

const UserPortal = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [, ] = useState('activeOrders');
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [, setClosedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // 分页状态 - 活跃订单
  const [activeOrdersPagination, setActiveOrdersPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    pageSize: 20,
    loading: false
  });

  // 分页状态 - 历史订单
  const [closedOrdersPagination, setClosedOrdersPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    pageSize: 20,
    loading: false
  });

  // 转换数据格式的辅助函数
  const transformOrder = (order: Order) => ({
    ...order,
    from: order.warehouse, // 后端字段映射
    to: order.deliveryAddress, // 后端字段映射
    createdAt: new Date(order.createdAt).toLocaleString('zh-CN'), // 格式化时间
    // 保留选择的物流商信息
    selectedProvider: order.selectedProvider,
    selectedPrice: order.selectedPrice,
    selectedAt: order.selectedAt,
  });

  // 加载活跃订单
  const loadActiveOrders = async (page: number = 1, search?: string) => {
    try {
      setActiveOrdersPagination(prev => ({ ...prev, loading: true }));

      const response = await api.orders.getOrders({
        page,
        pageSize: activeOrdersPagination.pageSize,
        search: search?.trim(),
        status: 'active'
      });

      // 处理后端返回的分页数据
      const orders = response.items || [];
      setActiveOrders(orders.map(transformOrder));

      setActiveOrdersPagination(prev => ({
        ...prev,
        currentPage: response.currentPage || page,
        totalPages: response.totalPages || Math.ceil(response.totalItems / prev.pageSize),
        total: response.totalItems || 0,
        loading: false
      }));
    } catch (error) {
      console.error('加载活跃订单失败:', error);
      setActiveOrdersPagination(prev => ({ ...prev, loading: false }));
      // 如果是网络错误，显示友好提示
      if (error instanceof Error && error.message.includes('网络')) {
        setError('网络连接失败，请检查网络后重试');
      }
    }
  };

  // 加载历史订单
  const loadClosedOrders = async (page: number = 1, search?: string) => {
    try {
      setClosedOrdersPagination(prev => ({ ...prev, loading: true }));

      const response = await api.orders.getOrders({
        page,
        pageSize: closedOrdersPagination.pageSize,
        search: search?.trim(),
        status: 'completed'
      });

      // 处理后端返回的分页数据
      const orders = response.items || [];
      setClosedOrders(orders.map(transformOrder));

      setClosedOrdersPagination(prev => ({
        ...prev,
        currentPage: response.currentPage || page,
        totalPages: response.totalPages || Math.ceil(response.totalItems / prev.pageSize),
        total: response.totalItems || 0,
        loading: false
      }));
    } catch (error) {
      console.error('加载历史订单失败:', error);
      setClosedOrdersPagination(prev => ({ ...prev, loading: false }));
      // 如果是网络错误，显示友好提示
      if (error instanceof Error && error.message.includes('网络')) {
        setError('网络连接失败，请检查网络后重试');
      }
    }
  };

  // 初始化数据加载
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 并行加载数据
        await Promise.all([
          loadActiveOrders(1),
          loadClosedOrders(1)
        ]);
      } catch (error) {
        console.error('加载数据失败:', error);
        setError('加载数据失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // 刷新数据的函数
  const refreshData = async () => {
    try {
      setRefreshing(true);
      setRefreshError(null);
      // 刷新当前页面的数据
      await Promise.all([
        loadActiveOrders(activeOrdersPagination.currentPage, searchTerm),
        loadClosedOrders(closedOrdersPagination.currentPage, searchTerm)
      ]);
    } catch (error) {
      console.error('刷新数据失败:', error);
      setRefreshError('刷新数据失败，请重试');
      // 3秒后自动清除错误信息
      setTimeout(() => setRefreshError(null), 3000);
    } finally {
      setRefreshing(false);
    }
  };

  // 处理搜索
  const handleSearch = async () => {
    // 搜索时重置到第一页
    await Promise.all([
      loadActiveOrders(1, searchTerm),
      loadClosedOrders(1, searchTerm)
    ]);
    setActiveOrdersPagination(prev => ({ ...prev, currentPage: 1 }));
    setClosedOrdersPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // 监听搜索词变化，自动搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // 只有在组件已经初始化完成后才执行搜索
      if (!loading) {
        handleSearch();
      }
    }, 500); // 500ms 防抖

    return () => clearTimeout(timeoutId);
  }, [searchTerm]); // 移除 loading 依赖，避免无限循环

  // 导出活跃订单 - 暂时注释未使用的函数
  // const handleExportActiveOrders = () => {
  //   try {
  //     api.export.exportOrders('excel');
  //     console.warn('活跃订单导出已开始下载');
  //   } catch (error) {
  //     console.error('导出活跃订单失败:', error);
  //     window.alert('导出失败，请重试');
  //   }
  // };

  // 导出历史订单 - 暂时注释未使用的函数
  // const handleExportClosedOrders = () => {
  //   try {
  //     api.export.exportOrders('excel');
  //     console.warn('历史订单导出已开始下载');
  //   } catch (error) {
  //     console.error('导出历史订单失败:', error);
  //     window.alert('导出失败，请重试');
  //   }
  // };

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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 刷新错误提示 */}
      {refreshError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{refreshError}</p>
        </div>
      )}

      {/* 用户信息和操作栏 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">用户工作台</h1>
          <p className="text-gray-600">管理您的订单和报价信息</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={refreshData} disabled={refreshing}>
            {refreshing ? '刷新中...' : '刷新数据'}
          </Button>
          <Button variant="danger" onClick={handleLogout} icon={<LogOutIcon size={16} />}>
            登出
          </Button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="搜索订单..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* 主要内容区域 */}
      <div className="space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                <span className="text-2xl font-bold text-blue-600">{activeOrdersPagination.total}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">活跃订单</p>
                <p className="text-2xl font-bold text-gray-900">{activeOrdersPagination.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                <span className="text-2xl font-bold text-green-600">{closedOrdersPagination.total}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">已完成订单</p>
                <p className="text-2xl font-bold text-gray-900">{closedOrdersPagination.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full">
                <span className="text-2xl font-bold text-yellow-600">{activeOrders.filter(o => o.status === 'active' && !o.selectedProvider).length}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">待选择报价</p>
                <p className="text-2xl font-bold text-gray-900">{activeOrders.filter(o => o.status === 'active' && !o.selectedProvider).length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full">
                <span className="text-2xl font-bold text-purple-600">{activeOrders.filter(o => o.selectedProvider).length}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">已完成订单</p>
                <p className="text-2xl font-bold text-gray-900">{activeOrders.filter(o => o.selectedProvider).length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* 快速操作 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">快速操作</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="primary" className="h-20 flex flex-col items-center justify-center" onClick={() => alert('功能开发中')}>
              <span className="text-2xl mb-2">📦</span>
              <span>创建订单</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center" onClick={() => alert('功能开发中')}>
              <span className="text-2xl mb-2">📋</span>
              <span>订单列表</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center" onClick={() => alert('功能开发中')}>
              <span className="text-2xl mb-2">🚚</span>
              <span>供应商管理</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center" onClick={() => alert('功能开发中')}>
              <span className="text-2xl mb-2">⚙️</span>
              <span>账户设置</span>
            </Button>
          </div>
        </Card>

        {/* 最近订单 */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">最近活跃订单</h3>
            <Button variant="outline" size="sm" onClick={() => alert('功能开发中')}>
              查看全部
            </Button>
          </div>
          <div className="space-y-4">
            {activeOrders.length > 0 ? (
              activeOrders.slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-800">{order.warehouse} → {order.deliveryAddress}</p>
                    <p className="text-sm text-gray-500">创建于: {new Date(order.createdAt).toLocaleDateString('zh-CN')}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    order.selectedProvider ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
                  }`}>
                    {order.selectedProvider ? '已选择供应商' : '待选择报价'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-4 block">📋</span>
                <p>暂无活跃订单</p>
                <p className="text-sm">创建您的第一个订单开始使用系统</p>
              </div>
            )}
          </div>
        </Card>

        {/* 系统通知 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">系统通知</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                <span className="text-blue-600 text-sm">ℹ️</span>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-800">欢迎使用WLBJ物流报价系统</p>
                <p className="text-xs text-blue-600">您可以在这里管理订单、选择供应商和查看报价信息</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UserPortal;
