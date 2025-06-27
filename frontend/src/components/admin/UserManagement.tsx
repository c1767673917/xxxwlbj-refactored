import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { UserIcon, PlusIcon, EditIcon, TrashIcon, SearchIcon } from 'lucide-react';
import api from '@/services/api';
import type { User, PaginatedResponse } from '@/types';

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    pageSize: 20
  });

  // 加载用户列表
  const loadUsers = async (page: number = 1, search?: string) => {
    try {
      setLoading(true);
      const response: PaginatedResponse<User> = await api.users.getUsers({
        page,
        pageSize: pagination.pageSize,
        search: search?.trim()
      });

      setUsers(response.items || []);
      setPagination({
        currentPage: response.currentPage || page,
        totalPages: response.totalPages || 1,
        total: response.totalItems || 0,
        pageSize: pagination.pageSize
      });
    } catch (error) {
      console.error('加载用户列表失败:', error);
      setError('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadUsers();
  }, []);

  // 搜索处理
  const handleSearch = () => {
    loadUsers(1, searchTerm);
  };

  // 删除用户
  const handleDeleteUser = async (userId: string) => {
    const confirmed = window.confirm('确定要删除这个用户吗？');
    if (!confirmed) {
      return;
    }

    try {
      await api.users.deleteUser(userId);
      await loadUsers(pagination.currentPage, searchTerm);
      window.alert('用户删除成功');
    } catch (error) {
      console.error('删除用户失败:', error);
      window.alert('删除用户失败');
    }
  };

  // 分页处理
  const handlePageChange = (page: number) => {
    loadUsers(page, searchTerm);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">用户管理</h2>
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
        <h2 className="text-2xl font-bold text-gray-800">用户管理</h2>
        <Card className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => loadUsers()}>重试</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">用户管理</h2>
        <Button variant="primary" icon={<PlusIcon size={16} />}>
          添加用户
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card>
        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索用户..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} icon={<SearchIcon size={16} />}>
            搜索
          </Button>
        </div>
      </Card>

      {/* 用户列表 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                        <UserIcon size={20} className="text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.username}
                        </div>
                        {user.email && (
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-red-100 text-red-800'
                        : user.role === 'provider'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role === 'admin' ? '管理员' : user.role === 'provider' ? '供应商' : '用户'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.isActive ? '活跃' : '不活跃'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
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
                      onClick={() => handleDeleteUser(user.id)}
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

export default UserManagement;
