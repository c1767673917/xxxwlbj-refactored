import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // 调试信息
  console.log('AdminProtectedRoute check:', {
    isAuthenticated,
    user: user ? { id: user.id, role: user.role, email: user.email } : null,
    isLoading
  });

  // 显示加载状态
  if (isLoading) {
    console.log('AdminProtectedRoute: Loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // 检查是否已认证
  if (!isAuthenticated || !user) {
    console.log('AdminProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/admin/login" replace />;
  }

  // 检查是否是管理员角色
  if (user.role !== 'admin') {
    console.log('AdminProtectedRoute: User is not admin, role:', user.role);
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('AdminProtectedRoute: Access granted');
  return <>{children}</>;
};

export default AdminProtectedRoute;
