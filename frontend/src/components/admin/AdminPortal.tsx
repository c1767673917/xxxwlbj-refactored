import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Package,
  TruckIcon,
  FileText,
  Settings,
  LogOut,
  BarChart3,
  Shield,
  Database
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import UserManagement from './UserManagement';
import OrderManagement from './OrderManagement';
import SystemSettings from './SystemSettings';
import BackupManagement from './BackupManagement';
import type { AdminStats } from '@/types';

const AdminPortal = () => {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    // 检查管理员权限
    if (!authLoading) {
      if (!isAuthenticated || !user) {
        navigate('/admin/login');
        return;
      }

      // 检查是否是管理员角色
      if (user.role !== 'admin') {
        navigate('/unauthorized');
        return;
      }

      loadStats();
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getStats();
      setStats(data);
    } catch (error) {
      console.error('获取统计信息失败:', error);
      if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
        console.warn('管理员认证失败，重定向到登录页面');
        await logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.admin.logout();
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      await logout();
    }
  };

  const renderDashboard = () => {
    // 创建安全的统计数据对象，提供默认值
    const safeStats = {
      totalUsers: stats?.totalUsers || 0,
      totalOrders: stats?.totalOrders || 0,
      activeOrders: stats?.activeOrders || 0,
      closedOrders: stats?.closedOrders || 0,
      totalProviders: stats?.totalProviders || 0,
      totalQuotes: stats?.totalQuotes || 0,
      recentOrders: stats?.recentOrders || [],
      recentQuotes: stats?.recentQuotes || []
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">系统概览</h2>
          <Button onClick={loadStats} variant="outline">
            刷新数据
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, index) => (
              <Card key={index} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">总用户数</p>
                    <p className="text-2xl font-bold text-gray-900">{safeStats.totalUsers}</p>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
                    <Users size={24} className="text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">总订单数</p>
                    <p className="text-2xl font-bold text-gray-900">{safeStats.totalOrders}</p>
                    <p className="text-xs text-gray-500">
                      活跃: {safeStats.activeOrders} | 已完成: {safeStats.closedOrders}
                    </p>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                    <Package size={24} className="text-green-600" />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">供应商数</p>
                    <p className="text-2xl font-bold text-gray-900">{safeStats.totalProviders}</p>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full">
                    <TruckIcon size={24} className="text-yellow-600" />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">总报价数</p>
                    <p className="text-2xl font-bold text-gray-900">{safeStats.totalQuotes}</p>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full">
                    <FileText size={24} className="text-purple-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* 最近订单 */}
            {safeStats.recentOrders.length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">最近订单</h3>
                <div className="space-y-3">
                  {safeStats.recentOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="font-medium text-gray-800">订单 #{order.orderNumber || order.id}</p>
                        <p className="text-sm text-gray-600">
                          {order.warehouse && order.deliveryAddress
                            ? `${order.warehouse} → ${order.deliveryAddress}`
                            : order.description || '暂无描述'
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'active' ? 'bg-green-100 text-green-800' :
                          order.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'confirmed' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status === 'active' ? '进行中' :
                           order.status === 'completed' ? '已完成' :
                           order.status === 'confirmed' ? '已确认' :
                           order.status || '未知'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 最近报价 */}
            {safeStats.recentQuotes.length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">最近报价</h3>
                <div className="space-y-3">
                  {safeStats.recentQuotes.slice(0, 5).map((quote) => (
                    <div key={quote.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="font-medium text-gray-800">{quote.provider || '未知供应商'}</p>
                        <p className="text-sm text-gray-600">订单 #{quote.orderNumber || quote.orderId}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">¥{(quote.price || 0).toLocaleString()}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(quote.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 如果没有数据显示提示 */}
            {!stats && (
              <Card className="text-center py-8">
                <p className="text-gray-600">无法加载统计信息</p>
                <Button onClick={loadStats} className="mt-4">
                  重试
                </Button>
              </Card>
            )}
          </>
        )}
      </div>
    );
  };

  const menuItems = [
    { id: 'dashboard', label: '系统概览', icon: <BarChart3 size={20} /> },
    { id: 'users', label: '用户管理', icon: <Users size={20} /> },
    { id: 'orders', label: '订单管理', icon: <Package size={20} /> },
    { id: 'settings', label: '系统设置', icon: <Settings size={20} /> },
    { id: 'backup', label: '备份管理', icon: <Database size={20} /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'users':
        return <UserManagement />;
      case 'orders':
        return <OrderManagement />;
      case 'settings':
        return <SystemSettings />;
      case 'backup':
        return <BackupManagement />;
      default:
        return renderDashboard();
    }
  };

  // 显示认证加载状态
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-8 h-8 bg-red-600 rounded-full">
                <Shield size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-800">管理员后台</h1>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              icon={<LogOut size={16} />}
            >
              登出
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-8">
          {/* 侧边栏 */}
          <div className="w-64 flex-shrink-0">
            <Card className="p-4">
              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </Card>
          </div>

          {/* 主内容区 */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPortal;
