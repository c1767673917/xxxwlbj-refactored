import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { DatabaseIcon, DownloadIcon, UploadIcon, RefreshCwIcon, CalendarIcon } from 'lucide-react';
import api from '@/services/api';
import type { BackupHistory, BackupConfig, RestoreOptions } from '@/types';

const BackupManagement = () => {
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([]);
  const [, setBackupConfig] = useState<BackupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 恢复选项
  const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({
    restoreDatabase: true,
    restoreConfigs: true,
    restoreLogs: false,
    createBackup: true,
    verifyIntegrity: true,
    includeUsers: true,
    includeOrders: true,
    includeQuotes: true,
    includeProviders: true,
    overwriteExisting: false
  });

  // 加载备份历史和配置
  const loadBackupData = async () => {
    try {
      setLoading(true);
      const [history, config] = await Promise.all([
        api.admin.getBackupHistory(),
        api.admin.getBackupConfig()
      ]);
      setBackupHistory(history);
      setBackupConfig(config);
    } catch (error) {
      console.error('加载备份数据失败:', error);
      setError('加载备份数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadBackupData();
  }, []);

  // 创建备份
  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      setError(null);
      
      const result = await api.admin.createBackup();
      
      if (result.success) {
        setSuccess('备份创建成功');
        await loadBackupData(); // 刷新备份历史
      } else {
        setError(result.message || '备份创建失败');
      }
    } catch (error) {
      console.error('创建备份失败:', error);
      setError('创建备份失败');
    } finally {
      setCreating(false);
    }
  };

  // 恢复备份
  const handleRestoreBackup = async (file: File) => {
    try {
      setRestoring(true);
      setError(null);
      
      const result = await api.admin.restoreBackup(file, restoreOptions);
      
      if (result.success) {
        setSuccess('备份恢复成功');
        await loadBackupData(); // 刷新备份历史
      } else {
        setError(result.message || '备份恢复失败');
      }
    } catch (error) {
      console.error('恢复备份失败:', error);
      setError('恢复备份失败');
    } finally {
      setRestoring(false);
    }
  };

  // 文件上传处理
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: 实现更好的确认对话框
      const confirmed = window.confirm('确定要恢复这个备份吗？这将覆盖现有数据！');
      if (confirmed) {
        handleRestoreBackup(file);
      }
    }
  };

  // 清除消息
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">备份管理</h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, index) => (
            <Card key={index}>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">备份管理</h2>
        <Button onClick={loadBackupData} variant="outline" icon={<RefreshCwIcon size={16} />}>
          刷新
        </Button>
      </div>

      {/* 消息提示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* 备份操作 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 创建备份 */}
        <Card>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
              <DatabaseIcon size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">创建备份</h3>
              <p className="text-gray-600">备份当前系统数据</p>
            </div>
          </div>
          
          <Button
            onClick={handleCreateBackup}
            variant="primary"
            fullWidth
            isLoading={creating}
            icon={<DownloadIcon size={16} />}
          >
            {creating ? '正在创建备份...' : '创建新备份'}
          </Button>
        </Card>

        {/* 恢复备份 */}
        <Card>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
              <UploadIcon size={24} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">恢复备份</h3>
              <p className="text-gray-600">从备份文件恢复数据</p>
            </div>
          </div>

          {/* 恢复选项 */}
          <div className="space-y-3 mb-4">
            <h4 className="text-sm font-medium text-gray-700">恢复选项</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-users"
                  checked={restoreOptions.includeUsers}
                  onChange={(e) => setRestoreOptions(prev => ({ ...prev, includeUsers: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="include-users" className="text-sm text-gray-700">
                  包含用户数据
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-orders"
                  checked={restoreOptions.includeOrders}
                  onChange={(e) => setRestoreOptions(prev => ({ ...prev, includeOrders: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="include-orders" className="text-sm text-gray-700">
                  包含订单数据
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="overwrite-existing"
                  checked={restoreOptions.overwriteExisting}
                  onChange={(e) => setRestoreOptions(prev => ({ ...prev, overwriteExisting: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="overwrite-existing" className="text-sm text-gray-700">
                  覆盖现有数据
                </label>
              </div>
            </div>
          </div>

          <div className="relative">
            <input
              type="file"
              accept=".zip,.sql,.json"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={restoring}
            />
            <Button
              variant="outline"
              fullWidth
              isLoading={restoring}
              icon={<UploadIcon size={16} />}
            >
              {restoring ? '正在恢复...' : '选择备份文件'}
            </Button>
          </div>
        </Card>
      </div>

      {/* 备份历史 */}
      <Card>
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full">
            <CalendarIcon size={24} className="text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">备份历史</h3>
            <p className="text-gray-600">查看和管理历史备份</p>
          </div>
        </div>

        {backupHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">暂无备份历史</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    备份时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    文件大小
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
                {backupHistory.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(backup.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {backup.fileSize ? `${(backup.fileSize / 1024 / 1024).toFixed(2)} MB` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        backup.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : backup.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {backup.status === 'completed' ? '完成' : backup.status === 'failed' ? '失败' : '进行中'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {backup.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<DownloadIcon size={14} />}
                        >
                          下载
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BackupManagement;
