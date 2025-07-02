import React, { useState, useEffect } from 'react';
import { Button, Card } from '@/components/ui';
import { XIcon } from 'lucide-react';
import api from '@/services/api';
import type { CreateOrderRequest } from '@/types/api';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    warehouse: string;
    goods: string;
    deliveryAddress: string;
  };
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData
}) => {
  const [formData, setFormData] = useState<CreateOrderRequest>({
    warehouse: initialData?.warehouse || '',
    goods: initialData?.goods || '',
    deliveryAddress: initialData?.deliveryAddress || ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 监听initialData变化，更新表单数据
  useEffect(() => {
    if (initialData) {
      setFormData({
        warehouse: initialData.warehouse || '',
        goods: initialData.goods || '',
        deliveryAddress: initialData.deliveryAddress || ''
      });
    }
  }, [initialData]);

  // 重置表单
  const resetForm = () => {
    setFormData({
      warehouse: initialData?.warehouse || '',
      goods: initialData?.goods || '',
      deliveryAddress: initialData?.deliveryAddress || ''
    });
    setErrors({});
  };

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.warehouse.trim()) {
      newErrors.warehouse = '仓库信息不能为空';
    } else if (formData.warehouse.length < 2 || formData.warehouse.length > 100) {
      newErrors.warehouse = '仓库名称长度必须在2-100字符之间';
    }

    if (!formData.goods.trim()) {
      newErrors.goods = '货物信息不能为空';
    } else if (formData.goods.length < 2 || formData.goods.length > 500) {
      newErrors.goods = '货物描述长度必须在2-500字符之间';
    }

    if (!formData.deliveryAddress.trim()) {
      newErrors.deliveryAddress = '配送地址不能为空';
    } else if (formData.deliveryAddress.length < 5 || formData.deliveryAddress.length > 200) {
      newErrors.deliveryAddress = '配送地址长度必须在5-200字符之间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理输入变化
  const handleInputChange = (field: keyof CreateOrderRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 清除该字段的错误信息
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // 提交订单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        warehouse: formData.warehouse.trim(),
        goods: formData.goods.trim(),
        deliveryAddress: formData.deliveryAddress.trim()
      };

      await api.orders.createOrder(orderData);
      
      // 成功后重置表单并关闭模态框
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('创建订单失败:', error);
      
      // 处理后端验证错误
      if (error.response?.data?.details) {
        const newErrors: Record<string, string> = {};
        error.response.data.details.forEach((detail: any) => {
          newErrors[detail.field] = detail.message;
        });
        setErrors(newErrors);
      } else {
        // 通用错误处理
        setErrors({
          submit: error.response?.data?.message || '创建订单失败，请重试'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 关闭模态框
  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <Card>
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800">创建新订单</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={loading}
              icon={<XIcon size={16} />}
            >
              关闭
            </Button>
          </div>

          {/* 表单内容 */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* 仓库信息 */}
            <div>
              <label htmlFor="warehouse" className="block text-sm font-medium text-gray-700 mb-1">
                仓库信息 <span className="text-red-500">*</span>
              </label>
              <input
                id="warehouse"
                type="text"
                value={formData.warehouse}
                onChange={(e) => handleInputChange('warehouse', e.target.value)}
                placeholder="请输入仓库名称或地址"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.warehouse ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.warehouse && (
                <p className="mt-1 text-sm text-red-600">{errors.warehouse}</p>
              )}
            </div>

            {/* 货物信息 */}
            <div>
              <label htmlFor="goods" className="block text-sm font-medium text-gray-700 mb-1">
                货物信息 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="goods"
                value={formData.goods}
                onChange={(e) => handleInputChange('goods', e.target.value)}
                placeholder="请描述货物类型、规格、重量等信息"
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                  errors.goods ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.goods && (
                <p className="mt-1 text-sm text-red-600">{errors.goods}</p>
              )}
            </div>

            {/* 配送地址 */}
            <div>
              <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-1">
                配送地址 <span className="text-red-500">*</span>
              </label>
              <input
                id="deliveryAddress"
                type="text"
                value={formData.deliveryAddress}
                onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                placeholder="请输入详细的配送地址"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.deliveryAddress ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.deliveryAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.deliveryAddress}</p>
              )}
            </div>

            {/* 提交错误 */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
                className="flex-1"
              >
                {loading ? '创建中...' : '创建订单'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateOrderModal;