import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { PackageIcon, SearchIcon, EyeIcon, EditIcon, TrashIcon } from 'lucide-react';
import api from '@/services/api';
import type { Order, PaginatedResponse } from '@/types';

const OrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    pageSize: 20
  });

  // 加载订单列表
  const loadOrders = async (page: number = 1, search?: string, status?: string) => {
    try {
      setLoading(true);
      const response: PaginatedResponse<Order> = await api.orders.getOrders({
        page,
        pageSize: pagination.pageSize,
        search: search?.trim(),
        status: status === 'all' ? undefined : status
      });

      setOrders(response.items || []);
      setPagination({
        currentPage: response.currentPage || page,
        totalPages: response.totalPages || 1,
        total: response.totalItems || 0,
        pageSize: pagination.pageSize
      });
    } catch (error) {
      console.error('加载订单列表失败:', error);
      setError('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadOrders();
  }, []);

  // 搜索处理
  const handleSearch = () => {
    loadOrders(1, searchTerm, statusFilter);
  };

  // 状态过滤处理
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    loadOrders(1, searchTerm, status);
  };

  // 删除订单
  const handleDeleteOrder = async (orderId: string) => {
    const confirmed = window.confirm('确定要删除这个订单吗？');
    if (!confirmed) {
      return;
    }

    try {
      await api.orders.deleteOrder(orderId);
      await loadOrders(pagination.currentPage, searchTerm, statusFilter);
      window.alert('订单删除成功');
    } catch (error) {
      console.error('删除订单失败:', error);
      window.alert('删除订单失败');
    }
  };

  // 分页处理
  const handlePageChange = (page: number) => {
    loadOrders(page, searchTerm, statusFilter);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '进行中';
      case 'closed':
        return '已完成';
      case 'pending':
        return '待处理';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">订单管理</h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, index) => (
            <Card key={index}>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800">订单管理</h2>
        <Card className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => loadOrders()}>重试</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">订单管理</h2>
        <Button onClick={() => api.export.exportOrders('excel')}>
          导出订单
        </Button>
      </div>

      {/* 搜索和过滤 */}
      <Card>
        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索订单..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">所有状态</option>
            <option value="active">进行中</option>
            <option value="closed">已完成</option>
            <option value="pending">待处理</option>
          </select>
          <Button onClick={handleSearch} icon={<SearchIcon size={16} />}>
            搜索
          </Button>
        </div>
      </Card>

      {/* 订单列表 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  订单信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  路线
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                        <PackageIcon size={20} className="text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          订单 #{order.id}
                        </div>
                        {order.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {order.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.warehouse}
                    </div>
                    <div className="text-sm text-gray-500">
                      → {order.deliveryAddress}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<EyeIcon size={14} />}
                    >
                      查看
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<EditIcon size={14} />}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<TrashIcon size={14} />}
                      onClick={() => handleDeleteOrder(order.id)}
                    >
                      删除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                显示 {((pagination.currentPage - 1) * pagination.pageSize) + 1} 到{' '}
                {Math.min(pagination.currentPage * pagination.pageSize, pagination.total)} 条，
                共 {pagination.total} 条记录
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage <= 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage >= pagination.totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OrderManagement;
