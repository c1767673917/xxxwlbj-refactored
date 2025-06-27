import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { TruckIcon, MapPinIcon, CalendarIcon, DollarSignIcon, SendIcon } from 'lucide-react';
import api from '@/services/api';
import type { Order } from '@/types';

interface AvailableOrdersListProps {
  orders: Order[];
  loading?: boolean;
  providerKey: string;
  onQuoteSubmitted?: () => void;
}

const AvailableOrdersList = ({ 
  orders, 
  loading = false, 
  providerKey,
  onQuoteSubmitted 
}: AvailableOrdersListProps) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    price: '',
    notes: '',
    estimatedDays: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuoteSubmit = async (orderId: string) => {
    if (!quoteForm.price.trim()) {
      setError('请输入报价金额');
      return;
    }

    const price = parseFloat(quoteForm.price);
    if (isNaN(price) || price <= 0) {
      setError('请输入有效的报价金额');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await api.quotes.createQuote({
        orderId,
        price,
        notes: quoteForm.notes.trim(),
        estimatedDays: quoteForm.estimatedDays ? parseInt(quoteForm.estimatedDays) : undefined,
        accessKey: providerKey
      });

      // 重置表单
      setQuoteForm({
        price: '',
        notes: '',
        estimatedDays: ''
      });
      setSelectedOrder(null);

      // 通知父组件刷新数据
      onQuoteSubmitted?.();

      window.alert('报价提交成功！');
    } catch (error) {
      console.error('提交报价失败:', error);
      setError(error instanceof Error ? error.message : '提交报价失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuoteOrder = (order: Order) => {
    setSelectedOrder(order);
    setError(null);
    setQuoteForm({
      price: '',
      notes: '',
      estimatedDays: ''
    });
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
        <p className="text-gray-600">暂无可报价的订单</p>
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
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  可报价
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
                    发布时间: {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>

              {order.description && (
                <p className="text-gray-600 text-sm mb-4">
                  描述: {order.description}
                </p>
              )}

              {order.requirements && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-1">特殊要求</h4>
                  <p className="text-sm text-blue-700">{order.requirements}</p>
                </div>
              )}
            </div>

            <div className="flex space-x-2 ml-4">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleQuoteOrder(order)}
                icon={<DollarSignIcon size={16} />}
              >
                报价
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {/* 报价模态框 */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">提交报价</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrder(null)}
              >
                取消
              </Button>
            </div>

            <div className="mb-4">
              <h3 className="font-medium text-gray-800 mb-2">
                订单 #{selectedOrder.id}
              </h3>
              <p className="text-sm text-gray-600">
                {selectedOrder.warehouse} → {selectedOrder.deliveryAddress}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              handleQuoteSubmit(selectedOrder.id);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  报价金额 (元) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={quoteForm.price}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入报价金额"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  预计天数
                </label>
                <input
                  type="number"
                  min="1"
                  value={quoteForm.estimatedDays}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, estimatedDays: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="预计完成天数"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注说明
                </label>
                <textarea
                  value={quoteForm.notes}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="可选的备注说明"
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={submitting}
                  icon={<SendIcon size={16} />}
                  className="flex-1"
                >
                  提交报价
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableOrdersList;
