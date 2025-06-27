// Token状态监控组件
// 用于显示Token状态和处理即将过期的情况

import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Button, Modal, Progress, Typography, Space } from 'antd';
import { ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { authService } from '@/services/auth';
import { TokenStatus, formatRemainingTime, type TokenInfo } from '@/utils/jwt';
import { logger } from '@/services/utils';

const { Text, Title } = Typography;

interface TokenStatusMonitorProps {
  // 是否显示详细信息
  showDetails?: boolean;
  // 自定义样式
  className?: string;
  // 即将过期时的回调
  onNearExpiry?: (tokenInfo: TokenInfo) => void;
  // Token过期时的回调
  onExpired?: (tokenInfo: TokenInfo) => void;
}

export const TokenStatusMonitor: React.FC<TokenStatusMonitorProps> = ({
  showDetails = false,
  className,
  onNearExpiry,
  onExpired
}) => {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // 更新Token信息
  const updateTokenInfo = useCallback(() => {
    const info = authService.getTokenInfo();
    setTokenInfo(info);
    setLastUpdateTime(new Date());

    if (info) {
      // 触发回调
      if (info.status === TokenStatus.NEAR_EXPIRY && onNearExpiry) {
        onNearExpiry(info);
      } else if (info.status === TokenStatus.EXPIRED && onExpired) {
        onExpired(info);
      }

      // 显示即将过期的模态框
      if (info.status === TokenStatus.NEAR_EXPIRY && !showExpiryModal) {
        setShowExpiryModal(true);
      }
    }
  }, [onNearExpiry, onExpired, showExpiryModal]);

  // 手动刷新Token
  const handleRefreshToken = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await authService.forceRefreshToken();
      updateTokenInfo();
      setShowExpiryModal(false);
      logger.info('Token manually refreshed successfully');
    } catch (error) {
      logger.error('Manual token refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, updateTokenInfo]);

  // 定期更新Token信息
  useEffect(() => {
    updateTokenInfo();
    
    const interval = setInterval(updateTokenInfo, 30 * 1000); // 每30秒更新一次
    
    return () => clearInterval(interval);
  }, [updateTokenInfo]);

  // 如果没有Token信息，不显示组件
  if (!tokenInfo || !authService.isAuthenticated()) {
    return null;
  }

  // 获取状态颜色和文本
  const getStatusInfo = (status: TokenStatus) => {
    switch (status) {
      case TokenStatus.VALID:
        return { color: 'success', text: '有效', type: 'success' as const };
      case TokenStatus.NEAR_EXPIRY:
        return { color: 'warning', text: '即将过期', type: 'warning' as const };
      case TokenStatus.EXPIRED:
        return { color: 'error', text: '已过期', type: 'error' as const };
      case TokenStatus.INVALID:
        return { color: 'error', text: '无效', type: 'error' as const };
      default:
        return { color: 'default', text: '未知', type: 'info' as const };
    }
  };

  const statusInfo = getStatusInfo(tokenInfo.status);
  const remainingTimeText = formatRemainingTime(tokenInfo.remainingTime);

  // 计算进度条百分比（基于Token的生命周期）
  const getProgressPercent = () => {
    if (!tokenInfo.payload || !tokenInfo.expiresAt || !tokenInfo.issuedAt) {
      return 0;
    }

    const totalTime = tokenInfo.expiresAt.getTime() - tokenInfo.issuedAt.getTime();
    const usedTime = Date.now() - tokenInfo.issuedAt.getTime();
    const percent = Math.max(0, Math.min(100, (usedTime / totalTime) * 100));
    
    return percent;
  };

  const progressPercent = getProgressPercent();

  return (
    <div className={className}>
      {/* 基础状态显示 */}
      {tokenInfo.status === TokenStatus.NEAR_EXPIRY && (
        <Alert
          message="Token即将过期"
          description={`您的登录凭证将在 ${remainingTimeText} 后过期，建议刷新Token以避免中断。`}
          type="warning"
          showIcon
          action={
            <Button
              size="small"
              type="primary"
              icon={<ReloadOutlined />}
              loading={isRefreshing}
              onClick={handleRefreshToken}
            >
              刷新Token
            </Button>
          }
          closable
        />
      )}

      {tokenInfo.status === TokenStatus.EXPIRED && (
        <Alert
          message="Token已过期"
          description="您的登录凭证已过期，请重新登录。"
          type="error"
          showIcon
        />
      )}

      {/* 详细信息显示 */}
      {showDetails && (
        <div style={{ marginTop: 16, padding: 16, border: '1px solid #f0f0f0', borderRadius: 6 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Token状态: </Text>
              <Text type={statusInfo.type}>{statusInfo.text}</Text>
            </div>
            
            <div>
              <Text strong>剩余时间: </Text>
              <Text>{remainingTimeText}</Text>
            </div>

            {tokenInfo.expiresAt && (
              <div>
                <Text strong>过期时间: </Text>
                <Text>{tokenInfo.expiresAt.toLocaleString()}</Text>
              </div>
            )}

            <div>
              <Text strong>Token生命周期: </Text>
              <Progress 
                percent={progressPercent} 
                status={tokenInfo.status === TokenStatus.EXPIRED ? 'exception' : 'normal'}
                size="small"
              />
            </div>

            <div>
              <Text strong>最后更新: </Text>
              <Text type="secondary">{lastUpdateTime.toLocaleTimeString()}</Text>
            </div>

            <Button
              type="default"
              icon={<ReloadOutlined />}
              loading={isRefreshing}
              onClick={handleRefreshToken}
              disabled={tokenInfo.status === TokenStatus.EXPIRED}
            >
              手动刷新Token
            </Button>
          </Space>
        </div>
      )}

      {/* 即将过期的模态框 */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            Token即将过期
          </Space>
        }
        open={showExpiryModal}
        onCancel={() => setShowExpiryModal(false)}
        footer={[
          <Button key="later" onClick={() => setShowExpiryModal(false)}>
            稍后处理
          </Button>,
          <Button
            key="refresh"
            type="primary"
            loading={isRefreshing}
            onClick={handleRefreshToken}
          >
            立即刷新
          </Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>
            您的登录凭证将在 <Text strong>{remainingTimeText}</Text> 后过期。
          </Text>
          <Text type="secondary">
            为了避免操作中断，建议您现在刷新Token。刷新过程不会影响您当前的操作。
          </Text>
          {tokenInfo.expiresAt && (
            <Text type="secondary">
              过期时间: {tokenInfo.expiresAt.toLocaleString()}
            </Text>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default TokenStatusMonitor;
