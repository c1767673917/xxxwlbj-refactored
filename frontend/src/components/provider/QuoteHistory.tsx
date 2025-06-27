import { Card } from '@/components/ui';
import { FileTextIcon, CalendarIcon, DollarSignIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react';
import type { Quote } from '@/types';

interface QuoteHistoryProps {
  quotes: Quote[];
  loading?: boolean;
}

const QuoteHistory = ({ quotes, loading = false }: QuoteHistoryProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'selected':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'selected':
        return '已选中';
      case 'rejected':
        return '未选中';
      case 'pending':
        return '待选择';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'selected':
        return <CheckCircleIcon size={16} className="text-green-600" />;
      case 'rejected':
        return <XCircleIcon size={16} className="text-red-600" />;
      case 'pending':
        return <ClockIcon size={16} className="text-yellow-600" />;
      default:
        return <FileTextIcon size={16} className="text-gray-600" />;
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

  if (quotes.length === 0) {
    return (
      <Card className="text-center py-8">
        <FileTextIcon size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">暂无报价历史</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {quotes.map((quote) => (
        <Card key={quote.id} className="hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  报价 #{quote.id}
                </h3>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(quote.status || 'pending')}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status || 'pending')}`}>
                    {getStatusText(quote.status || 'pending')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center space-x-2 text-gray-600">
                  <span className="text-sm font-medium">订单编号:</span>
                  <span className="text-sm">#{quote.orderId}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <DollarSignIcon size={16} />
                  <span className="text-sm font-medium">报价:</span>
                  <span className="text-sm font-semibold text-green-600">
                    ¥{quote.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <CalendarIcon size={16} />
                  <span className="text-sm">
                    {new Date(quote.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>

              {quote.estimatedDays && (
                <div className="mb-2">
                  <span className="text-sm text-gray-600">
                    预计完成时间: {quote.estimatedDays} 天
                  </span>
                </div>
              )}

              {quote.notes && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
                  <h4 className="text-sm font-medium text-gray-800 mb-1">备注说明</h4>
                  <p className="text-sm text-gray-700">{quote.notes}</p>
                </div>
              )}

              {/* 订单信息 */}
              {quote.order && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                  <h4 className="text-sm font-medium text-blue-800 mb-1">相关订单</h4>
                  <div className="text-sm text-blue-700">
                    <p>路线: {quote.order.warehouse} → {quote.order.deliveryAddress}</p>
                    {quote.order.description && (
                      <p>描述: {quote.order.description}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 选中信息 */}
              {quote.status === 'selected' && quote.selectedAt && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <CheckCircleIcon size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-800">恭喜！您的报价已被选中</span>
                  </div>
                  <p className="text-sm text-green-700">
                    选中时间: {new Date(quote.selectedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              )}

              {/* 未选中信息 */}
              {quote.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <XCircleIcon size={16} className="text-red-600" />
                    <span className="text-sm font-medium text-red-800">很遗憾，您的报价未被选中</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 报价统计信息 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>报价时间: {new Date(quote.createdAt).toLocaleString('zh-CN')}</span>
              {quote.updatedAt && quote.updatedAt !== quote.createdAt && (
                <span>更新时间: {new Date(quote.updatedAt).toLocaleString('zh-CN')}</span>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default QuoteHistory;
