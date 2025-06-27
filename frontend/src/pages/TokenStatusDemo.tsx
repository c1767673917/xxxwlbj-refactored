// Token状态演示页面
// 用于展示和测试新的Token刷新功能

import React, { useState } from 'react';
import { 
  Card, 
  Space, 
  Button, 
  Alert, 
  Descriptions, 
  Progress, 
  Typography, 
  Divider,
  notification,
  Row,
  Col
} from 'antd';
import { 
  ReloadOutlined, 
  ExclamationCircleOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined 
} from '@ant-design/icons';
import { TokenStatusMonitor } from '@/components/TokenStatusMonitor';
import { useTokenStatus } from '@/hooks/useTokenStatus';
import { authService } from '@/services/auth';
import { formatRemainingTime, TokenStatus } from '@/utils/jwt';

const { Title, Text, Paragraph } = Typography;

export const TokenStatusDemo: React.FC = () => {
  const [demoMode, setDemoMode] = useState(false);
  
  const {
    tokenInfo,
    isRefreshing,
    isAuthenticated,
    refreshToken,
    getRemainingTime,
    isNearExpiry,
    isExpired,
    getStatusText,
    lastUpdateTime
  } = useTokenStatus({
    onNearExpiry: (tokenInfo) => {
      notification.warning({
        message: 'Token即将过期',
        description: `您的登录凭证将在 ${formatRemainingTime(tokenInfo.remainingTime)} 后过期`,
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      });
    },
    onExpired: (tokenInfo) => {
      notification.error({
        message: 'Token已过期',
        description: '您的登录凭证已过期，请重新登录',
        icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
      });
    },
    onRefreshSuccess: (tokenInfo) => {
      notification.success({
        message: 'Token刷新成功',
        description: `新的登录凭证有效期至 ${tokenInfo.expiresAt?.toLocaleString()}`,
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      });
    },
    onRefreshError: (error) => {
      notification.error({
        message: 'Token刷新失败',
        description: error.message,
        icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
      });
    }
  });

  // 手动刷新Token
  const handleManualRefresh = async () => {
    try {
      await refreshToken();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    }
  };

  // 模拟创建即将过期的Token（仅用于演示）
  const simulateNearExpiryToken = () => {
    if (!demoMode) {
      notification.info({
        message: '演示模式',
        description: '这是演示功能，实际使用中Token由服务器生成',
        duration: 3
      });
      setDemoMode(true);
    }
    
    // 这里只是演示，实际应用中不应该这样做
    const mockToken = createDemoToken(3); // 3分钟后过期
    localStorage.setItem('wlbj_access_token', mockToken);
    window.location.reload(); // 重新加载以应用新Token
  };

  // 创建演示用的Token（仅用于演示）
  const createDemoToken = (expiresInMinutes: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (expiresInMinutes * 60);
    const iat = now;
    
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      id: 'demo-user-id',
      email: 'demo@example.com',
      role: 'user',
      iat,
      exp
    }));
    
    return `${header}.${payload}.demo-signature`;
  };

  // 获取状态图标
  const getStatusIcon = (status: TokenStatus) => {
    switch (status) {
      case TokenStatus.VALID:
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case TokenStatus.NEAR_EXPIRY:
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case TokenStatus.EXPIRED:
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case TokenStatus.INVALID:
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ExclamationCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  // 计算进度条百分比
  const getProgressPercent = () => {
    if (!tokenInfo?.payload || !tokenInfo.expiresAt || !tokenInfo.issuedAt) {
      return 0;
    }

    const totalTime = tokenInfo.expiresAt.getTime() - tokenInfo.issuedAt.getTime();
    const usedTime = Date.now() - tokenInfo.issuedAt.getTime();
    const percent = Math.max(0, Math.min(100, (usedTime / totalTime) * 100));
    
    return percent;
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <Alert
          message="未登录"
          description="请先登录以查看Token状态信息"
          type="info"
          showIcon
        />
      </Card>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Token状态监控演示</Title>
      <Paragraph>
        这个页面展示了新的Token刷新功能，包括智能刷新策略、状态监控和自动处理。
      </Paragraph>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Token状态信息" extra={getStatusIcon(tokenInfo?.status || TokenStatus.INVALID)}>
            {tokenInfo ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="状态">
                  <Text type={
                    tokenInfo.status === TokenStatus.VALID ? 'success' :
                    tokenInfo.status === TokenStatus.NEAR_EXPIRY ? 'warning' : 'danger'
                  }>
                    {getStatusText()}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="剩余时间">
                  {formatRemainingTime(getRemainingTime())}
                </Descriptions.Item>
                <Descriptions.Item label="过期时间">
                  {tokenInfo.expiresAt?.toLocaleString() || '未知'}
                </Descriptions.Item>
                <Descriptions.Item label="签发时间">
                  {tokenInfo.issuedAt?.toLocaleString() || '未知'}
                </Descriptions.Item>
                <Descriptions.Item label="用户ID">
                  {tokenInfo.payload?.id || '未知'}
                </Descriptions.Item>
                <Descriptions.Item label="用户角色">
                  {tokenInfo.payload?.role || '未知'}
                </Descriptions.Item>
                <Descriptions.Item label="最后更新">
                  {lastUpdateTime?.toLocaleTimeString() || '未知'}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Text type="secondary">无Token信息</Text>
            )}

            <Divider />

            {tokenInfo && (
              <div>
                <Text strong>Token生命周期进度:</Text>
                <Progress 
                  percent={getProgressPercent()} 
                  status={tokenInfo.status === TokenStatus.EXPIRED ? 'exception' : 'normal'}
                  strokeColor={
                    tokenInfo.status === TokenStatus.VALID ? '#52c41a' :
                    tokenInfo.status === TokenStatus.NEAR_EXPIRY ? '#faad14' : '#ff4d4f'
                  }
                />
              </div>
            )}

            <Divider />

            <Space>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={isRefreshing}
                onClick={handleManualRefresh}
                disabled={isExpired()}
              >
                手动刷新Token
              </Button>
              
              <Button
                type="default"
                onClick={simulateNearExpiryToken}
                disabled={isExpired()}
              >
                模拟即将过期
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="自动监控组件">
            <TokenStatusMonitor 
              showDetails={true}
              onNearExpiry={(tokenInfo) => {
                console.log('Component detected near expiry:', tokenInfo);
              }}
              onExpired={(tokenInfo) => {
                console.log('Component detected expiry:', tokenInfo);
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="功能特性说明">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card size="small" title="智能刷新策略">
                  <ul>
                    <li>解析JWT过期时间</li>
                    <li>精确计算刷新时机</li>
                    <li>避免用户操作中断</li>
                    <li>防止重复刷新请求</li>
                  </ul>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small" title="状态监控">
                  <ul>
                    <li>实时Token状态检查</li>
                    <li>即将过期提醒</li>
                    <li>自动过期处理</li>
                    <li>可视化状态展示</li>
                  </ul>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small" title="错误处理">
                  <ul>
                    <li>网络错误重试</li>
                    <li>刷新失败处理</li>
                    <li>自动登出机制</li>
                    <li>用户友好提示</li>
                  </ul>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {demoMode && (
        <Alert
          message="演示模式已启用"
          description="当前正在使用演示Token，某些功能可能无法正常工作"
          type="warning"
          showIcon
          closable
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default TokenStatusDemo;
