import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { EyeIcon, TruckIcon, CalendarIcon, MapPinIcon } from 'lucide-react';
import type { Order } from '@/types';

interface OrderListProps {
  orders: Order[];
  loading?: boolean;
  onViewOrder?: (order: Order) => void;
  onSelectProvider?: (orderId: string, providerId: string) => void;
  showActions?: boolean;
}

const OrderList = ({ 
  orders,
  loading = false,
  onViewOrder,
  onSelectProvider: _onSelectProvider,
  showActions = true
}: OrderListProps) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    onViewOrder?.(order);
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

  if (orders.length === 0) {
    return (
      <Card className="text-center py-8">
        <TruckIcon size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">暂无订单数据</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  订单 #{order.id}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPinIcon size={16} />
                  <span className="text-sm">
                    从 {order.warehouse} 到 {order.deliveryAddress}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <CalendarIcon size={16} />
                  <span className="text-sm">
                    创建时间: {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>

              {order.description && (
                <p className="text-gray-600 text-sm mb-2">
                  描述: {order.description}
                </p>
              )}

              {order.selectedProvider && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                  <div className="flex items-center space-x-2">
                    <TruckIcon size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      已选择供应商: {order.selectedProvider}
                    </span>
                  </div>
                  {order.selectedPrice && (
                    <p className="text-sm text-green-700 mt-1">
                      报价: ¥{order.selectedPrice}
                    </p>
                  )}
                </div>
              )}
            </div>

            {showActions && (
              <div className="flex space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewOrder(order)}
                  icon={<EyeIcon size={16} />}
                >
                  查看详情
                </Button>
              </div>
            )}
          </div>
        </Card>
      ))}

      {/* 订单详情模态框 */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">订单详情</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrder(null)}
              >
                关闭
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  订单编号
                </label>
                <p className="text-gray-900">#{selectedOrder.id}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    发货地址
                  </label>
                  <p className="text-gray-900">{selectedOrder.warehouse}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    收货地址
                  </label>
                  <p className="text-gray-900">{selectedOrder.deliveryAddress}</p>
                </div>
              </div>

              {selectedOrder.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    订单描述
                  </label>
                  <p className="text-gray-900">{selectedOrder.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    创建时间
                  </label>
                  <p className="text-gray-900">
                    {new Date(selectedOrder.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    订单状态
                  </label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusText(selectedOrder.status)}
                  </span>
                </div>
              </div>

              {selectedOrder.selectedProvider && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">选中的供应商</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-green-700">
                      供应商: {selectedOrder.selectedProvider}
                    </p>
                    {selectedOrder.selectedPrice && (
                      <p className="text-sm text-green-700">
                        报价: ¥{selectedOrder.selectedPrice}
                      </p>
                    )}
                    {selectedOrder.selectedAt && (
                      <p className="text-sm text-green-700">
                        选择时间: {new Date(selectedOrder.selectedAt).toLocaleString('zh-CN')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;
