import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { UserIcon, PlusIcon, EditIcon, TrashIcon, SearchIcon, XIcon } from 'lucide-react';
import api from '@/services/api';
import type { User, PaginatedResponse, CreateUserRequest, UpdateUserRequest } from '@/types';

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

  // 模态框状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // 表单数据
  const [addFormData, setAddFormData] = useState<CreateUserRequest>({
    email: '',
    password: '',
    name: ''
  });
  const [editFormData, setEditFormData] = useState<UpdateUserRequest>({
    email: '',
    name: ''
  });

  // 加载用户列表
  const loadUsers = async (page: number = 1, search?: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading users with params:', { page, search, pageSize: pagination.pageSize });

      const response: any = await api.users.getUsers({
        page,
        pageSize: pagination.pageSize,
        search: search?.trim()
      });

      console.log('Users loaded successfully:', response);

      // 处理后端返回的数据结构
      const users = response.data || [];
      const meta = response.meta || {};
      const paginationInfo = meta.pagination || {};

      setUsers(users);
      setPagination({
        currentPage: paginationInfo.page || page,
        totalPages: paginationInfo.totalPages || 1,
        total: paginationInfo.total || 0,
        pageSize: pagination.pageSize
      });
    } catch (error: any) {
      console.error('加载用户列表失败:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response
      });

      const errorMessage = error?.message || '加载用户列表失败，请检查网络连接或联系管理员';
      setError(errorMessage);
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
      console.log('Deleting user:', userId);
      await api.users.deleteUser(userId);
      await loadUsers(pagination.currentPage, searchTerm);
      window.alert('用户删除成功');
    } catch (error: any) {
      console.error('删除用户失败:', error);
      console.error('Delete error details:', {
        message: error?.message,
        response: error?.response
      });

      const errorMessage = error?.message || '删除用户失败，请重试';
      window.alert(`删除用户失败: ${errorMessage}`);
    }
  };

  // 分页处理
  const handlePageChange = (page: number) => {
    loadUsers(page, searchTerm);
  };

  // 添加用户处理
  const handleAddUser = () => {
    setAddFormData({
      email: '',
      password: '',
      name: ''
    });
    setShowAddModal(true);
  };

  // 编辑用户处理
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      email: user.email || '',
      name: user.name || ''
    });
    setShowEditModal(true);
  };

  // 提交添加用户
  const handleSubmitAddUser = async () => {
    if (!addFormData.email || !addFormData.password || !addFormData.name) {
      window.alert('请填写所有必填字段');
      return;
    }

    try {
      setModalLoading(true);
      await api.users.createUser(addFormData);
      setShowAddModal(false);
      await loadUsers(pagination.currentPage, searchTerm);
      window.alert('用户创建成功');
    } catch (error: any) {
      console.error('创建用户失败:', error);
      const errorMessage = error?.message || '创建用户失败，请重试';
      window.alert(`创建用户失败: ${errorMessage}`);
    } finally {
      setModalLoading(false);
    }
  };

  // 提交编辑用户
  const handleSubmitEditUser = async () => {
    if (!editingUser || !editFormData.email || !editFormData.name) {
      window.alert('请填写所有必填字段');
      return;
    }

    try {
      setModalLoading(true);
      await api.users.updateUser(editingUser.id, editFormData);
      setShowEditModal(false);
      setEditingUser(null);
      await loadUsers(pagination.currentPage, searchTerm);
      window.alert('用户更新成功');
    } catch (error: any) {
      console.error('更新用户失败:', error);
      const errorMessage = error?.message || '更新用户失败，请重试';
      window.alert(`更新用户失败: ${errorMessage}`);
    } finally {
      setModalLoading(false);
    }
  };

  // 关闭模态框
  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setAddFormData({
      email: '',
      password: '',
      name: ''
    });
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
    setEditFormData({
      email: '',
      name: ''
    });
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
        <Button
          variant="primary"
          icon={<PlusIcon size={16} />}
          onClick={handleAddUser}
        >
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
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                      onClick={() => handleEditUser(user)}
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

      {/* 添加用户模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">添加用户</h3>
              <Button
                variant="outline"
                size="sm"
                icon={<XIcon size={16} />}
                onClick={handleCloseAddModal}
              >
                关闭
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱 *
                </label>
                <input
                  type="email"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入邮箱地址"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 *
                </label>
                <input
                  type="text"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入用户姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码 *
                </label>
                <input
                  type="password"
                  value={addFormData.password}
                  onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入密码"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={handleCloseAddModal}
                disabled={modalLoading}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitAddUser}
                isLoading={modalLoading}
              >
                创建用户
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑用户模态框 */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">编辑用户</h3>
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
                  邮箱 *
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入邮箱地址"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 *
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入用户姓名"
                />
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
                onClick={handleSubmitEditUser}
                isLoading={modalLoading}
              >
                更新用户
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
