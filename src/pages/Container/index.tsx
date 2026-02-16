import {
  Container,
  getContainerLogsRaw,
  getContainers,
  restartContainer,
  streamContainerLogsFetch,
} from '@/services/container';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Empty, Space, message } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import styles from './index.less';

const ContainerManage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [logDrawerVisible, setLogDrawerVisible] = useState(false);
  const [currentContainer, setCurrentContainer] = useState<string>('');
  const [logs, setLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);
  const actionRef = useRef<any>();
  const streamRef = useRef<{ abort: () => void } | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.abort();
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!logDrawerVisible) {
      if (streamRef.current) {
        streamRef.current.abort();
        streamRef.current = null;
      }
      setLogs('');
      setCurrentContainer('');
    }
  }, [logDrawerVisible]);

  const handleRestart = async (containerName: string) => {
    try {
      setLoading(true);
      await restartContainer(containerName);
      message.success(`容器 ${containerName} 重启成功`);
      actionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.message || '重启失败');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLogs = async (containerName: string) => {
    setCurrentContainer(containerName);
    setLogs('');
    setLogDrawerVisible(true);

    // Start fetch-based stream (allows Authorization header)
    try {
      setLogsLoading(true);
      if (streamRef.current) {
        streamRef.current.abort();
        streamRef.current = null;
      }
      streamRef.current = streamContainerLogsFetch(
        containerName,
        (data) => {
          setLogs((prev) => prev + data + '\n');
        },
        (err) => {
          console.error('stream error', err);
          if (err && err.code === 401) {
            message.error(err.message || '未授权，请登录');
          }
        },
      );
    } catch (error: any) {
      message.error(error?.message || '启动日志流失败');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleFetchRawLogs = async (containerName: string) => {
    try {
      setLogsLoading(true);
      const res = await getContainerLogsRaw(containerName);
      setLogs(res || '');
    } catch (err: any) {
      message.error(err?.message || '获取原始日志失败');
    } finally {
      setLogsLoading(false);
    }
  };

  const columns = [
    {
      title: '容器名称',
      dataIndex: 'Names',
      key: 'Names',
      width: 150,
      render: (names: string[]) => names?.[0]?.replace(/^\//g, '') || '-',
    },
    {
      title: '镜像',
      dataIndex: 'Image',
      key: 'Image',
      width: 220,
    },
    {
      title: '状态',
      dataIndex: 'State',
      key: 'State',
      width: 100,
      render: (text: string) => {
        const statusColor = text === 'running' ? '#52c41a' : '#d9534f';
        return <span style={{ color: statusColor }}>{text}</span>;
      },
    },
    {
      title: '运行信息',
      dataIndex: 'Status',
      key: 'Status',
      width: 150,
    },
    {
      title: '端口映射',
      dataIndex: 'Ports',
      key: 'Ports',
      width: 200,
      render: (ports: any[]) => {
        if (!ports || ports.length === 0) return '-';
        return (
          <div>
            {ports.map((port) => (
              <div key={port.PrivatePort}>
                {port.PublicPort}:{port.PrivatePort}/{port.Type}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Container) => {
        const containerName = record.Names?.[0]?.replace(/^\//g, '') || '';
        return (
          <Space>
            <Button
              type="primary"
              size="small"
              loading={loading}
              onClick={() => handleRestart(containerName)}
            >
              重启
            </Button>
            <Button
              type="default"
              size="small"
              loading={logsLoading}
              onClick={() => handleViewLogs(containerName)}
            >
              查看日志
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer>
      <ProTable<Container>
        columns={columns}
        actionRef={actionRef}
        request={async () => {
          try {
            const data = await getContainers();
            return {
              data: data || [],
              success: true,
            };
          } catch (error) {
            message.error('获取容器列表失败');
            return {
              data: [],
              success: false,
            };
          }
        }}
        rowKey="Id"
        search={false}
        options={{
          reload: true,
          setting: false,
        }}
        pagination={{
          pageSize: 10,
        }}
      />

      <Drawer
        title={`容器日志 - ${currentContainer}`}
        placement="right"
        onClose={() => {
          setLogDrawerVisible(false);
        }}
        open={logDrawerVisible}
        width={800}
      >
        <div style={{ marginBottom: 12 }}>
          <Button
            size="small"
            onClick={() => handleFetchRawLogs(currentContainer)}
            style={{ marginRight: 8 }}
          >
            获取最近100行
          </Button>
          <Button
            size="small"
            onClick={() => {
              // restart stream
              if (streamRef.current) {
                streamRef.current.abort();
                streamRef.current = null;
              }
              if (currentContainer) handleViewLogs(currentContainer);
            }}
          >
            重新订阅实时日志
          </Button>
        </div>

        {logsLoading ? (
          <div>加载中...</div>
        ) : logs ? (
          <pre className={styles.logContainer}>{logs}</pre>
        ) : (
          <Empty description="暂无日志" />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default ContainerManage;
