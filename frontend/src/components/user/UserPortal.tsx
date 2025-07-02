import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import {
  LogOutIcon,
  FileText,
  Clock,
  Building2
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { CreateOrderModal } from '@/components/user';
import type { Order } from '@/types';

const UserPortal = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('newOrder');
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [closedOrders, setClosedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logout, user } = useAuth();
  const [refreshError, setRefreshError] = useState<string | null>(null);
  // 保留模态框状态以备将来使用
  const [showCreateModal, setShowCreateModal] = useState(false);



  // 订单表单状态
  const [orderForm, setOrderForm] = useState({
    warehouse: '',
    goods: '',
    deliveryAddress: ''
  });

  // 表单验证和提交状态
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // 表单验证函数
  const validateOrderForm = () => {
    const errors: Record<string, string> = {};

    if (!orderForm.warehouse.trim()) {
      errors.warehouse = '请输入发货仓库';
    } else if (orderForm.warehouse.trim().length < 2) {
      errors.warehouse = '仓库名称至少需要2个字符';
    } else if (orderForm.warehouse.trim().length > 100) {
      errors.warehouse = '仓库名称不能超过100个字符';
    }

    if (!orderForm.goods.trim()) {
      errors.goods = '请输入货物信息';
    } else if (orderForm.goods.trim().length < 2) {
      errors.goods = '货物信息至少需要2个字符';
    } else if (orderForm.goods.trim().length > 500) {
      errors.goods = '货物信息不能超过500个字符';
    }

    if (!orderForm.deliveryAddress.trim()) {
      errors.deliveryAddress = '请输入收货地址';
    } else if (orderForm.deliveryAddress.trim().length < 5) {
      errors.deliveryAddress = '收货地址至少需要5个字符';
    } else if (orderForm.deliveryAddress.trim().length > 200) {
      errors.deliveryAddress = '收货地址不能超过200个字符';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 清除表单错误
  const clearFormError = (field: string) => {
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // 处理表单输入变化
  const handleFormChange = (field: keyof typeof orderForm, value: string) => {
    setOrderForm(prev => ({
      ...prev,
      [field]: value
    }));

    // 清除该字段的错误信息
    clearFormError(field);

    // 清除提交错误
    if (submitError) {
      setSubmitError(null);
    }
  };

  // 直接发布订单
  const handlePublishOrder = async () => {
    // 验证表单
    if (!validateOrderForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const orderData = {
        warehouse: orderForm.warehouse.trim(),
        goods: orderForm.goods.trim(),
        deliveryAddress: orderForm.deliveryAddress.trim()
      };

      await api.orders.createOrder(orderData);

      // 成功后重置表单
      setOrderForm({
        warehouse: '',
        goods: '',
        deliveryAddress: ''
      });
      setFormErrors({});

      // 刷新订单列表
      await loadActiveOrders(1, searchTerm);

      // 切换到我的订单标签页
      setActiveTab('myOrders');

      // 显示成功提示（可以使用toast或alert）
      window.alert('订单发布成功！');

    } catch (error: any) {
      console.error('发布订单失败:', error);

      // 处理后端验证错误
      if (error.response?.data?.details) {
        const newErrors: Record<string, string> = {};
        error.response.data.details.forEach((detail: any) => {
          newErrors[detail.field] = detail.message;
        });
        setFormErrors(newErrors);
      } else {
        // 通用错误处理
        setSubmitError(error.response?.data?.message || '发布订单失败，请重试');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 创建订单成功后的处理（保留用于模态框）
  const handleCreateOrderSuccess = () => {
    // 刷新活跃订单列表
    loadActiveOrders(activeOrdersPagination.currentPage, searchTerm);
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
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-blue-600 text-white px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">瑞</span>
            </div>
            <h1 className="text-xl font-semibold">瑞助报价平台</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">{user?.email || '用户'}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-white border-white hover:bg-white hover:text-blue-600"
            >
              登出
            </Button>
          </div>
        </div>
      </div>

      {/* 刷新错误提示 */}
      {refreshError && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{refreshError}</p>
        </div>
      )}

      <div className="px-6 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">活跃订单</p>
                <p className="text-2xl font-bold text-gray-900">{activeOrdersPagination.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">历史订单</p>
                <p className="text-2xl font-bold text-gray-900">{closedOrdersPagination.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">物流公司</p>
                <p className="text-2xl font-bold text-gray-900">2</p>
              </div>
            </div>
          </Card>
        </div>

        {/* 标签导航 */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'newOrder', label: '发布新订单', active: true },
              { id: 'myOrders', label: '我的订单' },
              { id: 'orderHistory', label: '订单历史' },
              { id: 'logistics', label: '物流公司管理' },
              { id: 'notifications', label: '通知设置' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 主要内容区域 */}
        {activeTab === 'newOrder' && (
          <div className="space-y-6">
            {/* 订单表单 */}
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    发货仓库 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={orderForm.warehouse}
                    onChange={(e) => handleFormChange('warehouse', e.target.value)}
                    placeholder="请输入发货仓库"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.warehouse ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.warehouse && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.warehouse}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    货物信息 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={orderForm.goods}
                    onChange={(e) => handleFormChange('goods', e.target.value)}
                    placeholder="请详细描述货物信息，包括名称、数量等"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.goods ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.goods && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.goods}</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  收货信息 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orderForm.deliveryAddress}
                  onChange={(e) => handleFormChange('deliveryAddress', e.target.value)}
                  placeholder="请输入详细收货地址"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.deliveryAddress ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {formErrors.deliveryAddress && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.deliveryAddress}</p>
                )}
              </div>

              {/* 提交错误显示 */}
              {submitError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{submitError}</p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handlePublishOrder}
                  variant="primary"
                  disabled={!orderForm.warehouse.trim() || !orderForm.goods.trim() || !orderForm.deliveryAddress.trim() || isSubmitting}
                  isLoading={isSubmitting}
                >
                  {isSubmitting ? '发布中...' : '发布订单'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* 我的订单标签页 */}
        {activeTab === 'myOrders' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">我的活跃订单</h3>
            <div className="space-y-4">
              {activeOrders.length > 0 ? (
                activeOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">{order.warehouse} → {order.deliveryAddress}</p>
                      <p className="text-sm text-gray-500">货物: {order.goods}</p>
                      <p className="text-sm text-gray-500">创建于: {new Date(order.createdAt).toLocaleDateString('zh-CN')}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      order.selectedProvider ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
                    }`}>
                      {order.selectedProvider ? '已选择供应商' : '待选择报价'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg mb-2">暂无活跃订单</p>
                  <p className="text-sm">发布您的第一个订单开始使用系统</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 订单历史标签页 */}
        {activeTab === 'orderHistory' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">订单历史</h3>
            <div className="space-y-4">
              {closedOrders.length > 0 ? (
                closedOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">{order.warehouse} → {order.deliveryAddress}</p>
                      <p className="text-sm text-gray-500">货物: {order.goods}</p>
                      <p className="text-sm text-gray-500">完成于: {new Date(order.createdAt).toLocaleDateString('zh-CN')}</p>
                    </div>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">
                      已完成
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg mb-2">暂无历史订单</p>
                  <p className="text-sm">完成的订单将在这里显示</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 物流公司管理标签页 */}
        {activeTab === 'logistics' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">物流公司管理</h3>
            <div className="text-center py-12 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg mb-2">物流公司管理</p>
              <p className="text-sm">功能开发中...</p>
            </div>
          </Card>
        )}

        {/* 通知设置标签页 */}
        {activeTab === 'notifications' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">通知设置</h3>
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">通知设置</p>
              <p className="text-sm">功能开发中...</p>
            </div>
          </Card>
        )}
      </div>

      {/* 创建订单模态框 - 保留以备将来使用 */}
      {/*
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateOrderSuccess}
        initialData={orderForm}
      />
      */}
    </div>
  );
};

export default UserPortal;
