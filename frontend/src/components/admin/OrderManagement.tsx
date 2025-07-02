import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { PackageIcon, SearchIcon, EyeIcon, EditIcon, TrashIcon, XIcon } from 'lucide-react';
import api from '@/services/api';
import type { Order, PaginatedResponse, UpdateOrderRequest } from '@/types';

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

  // 模态框状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // 编辑表单数据
  const [editFormData, setEditFormData] = useState<UpdateOrderRequest>({
    warehouse: '',
    goods: '',
    deliveryAddress: '',
    status: 'active'
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

  // 查看订单详情
  const handleViewOrder = async (order: Order) => {
    try {
      setModalLoading(true);
      // 获取完整的订单详情
      const fullOrder = await api.orders.getOrder(order.id);
      setSelectedOrder(fullOrder);
      setShowDetailModal(true);
    } catch (error: any) {
      console.error('获取订单详情失败:', error);
      const errorMessage = error?.message || '获取订单详情失败，请重试';
      window.alert(`获取订单详情失败: ${errorMessage}`);
    } finally {
      setModalLoading(false);
    }
  };

  // 编辑订单
  const handleEditOrder = async (order: Order) => {
    try {
      setModalLoading(true);
      // 获取完整的订单详情
      const fullOrder = await api.orders.getOrder(order.id);
      setSelectedOrder(fullOrder);
      setEditFormData({
        warehouse: fullOrder.warehouse || '',
        goods: fullOrder.goods || '',
        deliveryAddress: fullOrder.deliveryAddress || '',
        status: fullOrder.status || 'active'
      });
      setShowEditModal(true);
    } catch (error: any) {
      console.error('获取订单详情失败:', error);
      const errorMessage = error?.message || '获取订单详情失败，请重试';
      window.alert(`获取订单详情失败: ${errorMessage}`);
    } finally {
      setModalLoading(false);
    }
  };

  // 提交编辑订单
  const handleSubmitEditOrder = async () => {
    if (!selectedOrder || !editFormData.warehouse || !editFormData.goods || !editFormData.deliveryAddress) {
      window.alert('请填写所有必填字段');
      return;
    }

    try {
      setModalLoading(true);
      await api.orders.updateOrder(selectedOrder.id, editFormData);
      setShowEditModal(false);
      setSelectedOrder(null);
      await loadOrders(pagination.currentPage, searchTerm, statusFilter);
      window.alert('订单更新成功');
    } catch (error: any) {
      console.error('更新订单失败:', error);
      const errorMessage = error?.message || '更新订单失败，请重试';
      window.alert(`更新订单失败: ${errorMessage}`);
    } finally {
      setModalLoading(false);
    }
  };

  // 关闭模态框
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedOrder(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedOrder(null);
    setEditFormData({
      warehouse: '',
      goods: '',
      deliveryAddress: '',
      status: 'active'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
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
      case 'completed':
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
                      onClick={() => handleViewOrder(order)}
                    >
                      查看
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<EditIcon size={14} />}
                      onClick={() => handleEditOrder(order)}
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

      {/* 订单详情模态框 */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">订单详情</h3>
              <Button
                variant="outline"
                size="sm"
                icon={<XIcon size={16} />}
                onClick={handleCloseDetailModal}
              >
                关闭
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    订单ID
                  </label>
                  <p className="text-sm text-gray-900">{selectedOrder.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    状态
                  </label>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusText(selectedOrder.status)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  仓库地址
                </label>
                <p className="text-sm text-gray-900">{selectedOrder.warehouse}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  货物信息
                </label>
                <p className="text-sm text-gray-900">{selectedOrder.goods}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配送地址
                </label>
                <p className="text-sm text-gray-900">{selectedOrder.deliveryAddress}</p>
              </div>

              {selectedOrder.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    订单描述
                  </label>
                  <p className="text-sm text-gray-900">{selectedOrder.description}</p>
                </div>
              )}

              {selectedOrder.requirements && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    特殊要求
                  </label>
                  <p className="text-sm text-gray-900">{selectedOrder.requirements}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    创建时间
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedOrder.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                {selectedOrder.updatedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      更新时间
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedOrder.updatedAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                )}
              </div>

              {selectedOrder.selectedProvider && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      选中供应商
                    </label>
                    <p className="text-sm text-gray-900">{selectedOrder.selectedProvider}</p>
                  </div>
                  {selectedOrder.selectedPrice && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        选中价格
                      </label>
                      <p className="text-sm text-gray-900">¥{selectedOrder.selectedPrice}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 编辑订单模态框 */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">编辑订单</h3>
              <Button
                variant="outline"
                size="sm"
                icon={<XIcon size={16} />}
                onClick={handleCloseEditModal}
              >
                关闭
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  仓库地址 *
                </label>
                <input
                  type="text"
                  value={editFormData.warehouse}
                  onChange={(e) => setEditFormData({ ...editFormData, warehouse: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入仓库地址"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  货物信息 *
                </label>
                <textarea
                  value={editFormData.goods}
                  onChange={(e) => setEditFormData({ ...editFormData, goods: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入货物信息"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配送地址 *
                </label>
                <input
                  type="text"
                  value={editFormData.deliveryAddress}
                  onChange={(e) => setEditFormData({ ...editFormData, deliveryAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入配送地址"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  订单状态
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">进行中</option>
                  <option value="closed">已完成</option>
                  <option value="pending">待处理</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={handleCloseEditModal}
                disabled={modalLoading}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitEditOrder}
                isLoading={modalLoading}
              >
                更新订单
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
