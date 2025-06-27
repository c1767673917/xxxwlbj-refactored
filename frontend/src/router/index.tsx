import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomePage } from '@/components/layout';
import { LoginPage, ProtectedRoute, AdminProtectedRoute } from '@/components/auth';
import ProviderLoginPage from '@/components/auth/ProviderLoginPage';
import { UserPortal } from '@/components/user';
import { ProviderPortal } from '@/components/provider';
import { AdminPortal, AdminLoginPage } from '@/components/admin';

// 创建路由配置
export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login-user-page',
    element: <LoginPage />,
  },
  {
    path: '/login-provider-page',
    element: <ProviderLoginPage />,
  },
  {
    path: '/user',
    element: (
      <ProtectedRoute requiredRole="user">
        <UserPortal />
      </ProtectedRoute>
    ),
  },
  {
    path: '/provider/:providerKey',
    element: (
      <ProtectedRoute requiredRole="provider">
        <ProviderPortal />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin',
    element: (
      <AdminProtectedRoute>
        <AdminPortal />
      </AdminProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
