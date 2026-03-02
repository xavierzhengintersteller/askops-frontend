import {
  Container,
  getContainerLogsRaw,
  getContainers,
  restartContainer,
  streamContainerLogsFetch,
} from '@/services/container';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Empty, Modal, Space, Tag, message } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import styles from './index.less';

// 定义容器状态映射（增强可视化）
const CONTAINER_STATE_MAP = {
  running: { color: 'success', text: '运行中' },
  exited: { color: 'error', text: '已停止' },
  paused: { color: 'warning', text: '已暂停' },
  dead: { color: 'default', text: '已崩溃' },
  created: { color: 'info', text: '已创建' },
};

const ContainerManage: React.FC = () => {
  // 1. 状态定义（修复命名错误 + 细化）
  const [restartLoading, setRestartLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [streamLogsLoading, setStreamLogsLoading] = useState(false);
  const [rawLogsLoading, setRawLogsLoading] = useState(false);

  const [logDrawerVisible, setLogDrawerVisible] = useState(false);
  const [currentContainer, setCurrentContainer] = useState<string>('');
  const [logs, setLogs] = useState<string>('');

  const actionRef = useRef<any>();
  const streamRef = useRef<{ abort: () => void } | null>(null);
  const logContainerRef = useRef<HTMLPreElement>(null); // 日志容器ref（用于自动滚动）

  // 2. 清理日志流（组件卸载/抽屉关闭）
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
      setStreamLogsLoading(false);
      setRawLogsLoading(false);
    }
  }, [logDrawerVisible]);

  // 3. 日志自动滚动到底部
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // 4. 重启容器（增加二次确认 + 空值校验）
  const handleRestart = async (containerName: string) => {
    // 空值校验
    if (!containerName) {
      message.warning('容器名称为空，无法重启');
      return;
    }

    // 二次确认
    Modal.confirm({
      title: '确认重启容器',
      content: `是否确认重启容器 ${containerName}？重启可能导致服务中断，请谨慎操作！`,
      okText: '确认重启',
      cancelText: '取消',
      onOk: async () => {
        try {
          setRestartLoading((prev) => ({ ...prev, [containerName]: true }));
          const result = await restartContainer(containerName);

          if (result && result.code === 403) {
            message.error('没有权限重启此容器');
            return;
          }

          message.success(`容器 ${containerName} 重启成功`);
          actionRef.current?.reload();
        } catch (error: any) {
          if (error?.response?.data?.code === 403 || error?.code === 403) {
            message.error('没有权限重启此容器');
          } else {
            message.error(error?.message || '重启失败');
          }
        } finally {
          setRestartLoading((prev) => ({ ...prev, [containerName]: false }));
        }
      },
    });
  };

  // 5. 查看实时日志（增加空值校验）
  const handleViewLogs = async (containerName: string) => {
    if (!containerName) {
      message.warning('容器名称为空，无法查看日志');
      return;
    }

    setCurrentContainer(containerName);
    setLogs('');
    setLogDrawerVisible(true);

    try {
      setStreamLogsLoading(true);
      // 先终止旧的日志流
      if (streamRef.current) {
        streamRef.current.abort();
        streamRef.current = null;
      }
      // 启动新的日志流
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
          setStreamLogsLoading(false);
        },
      );
    } catch (error: any) {
      message.error(error?.message || '启动日志流失败');
      setStreamLogsLoading(false);
    }
  };

  // 6. 获取原始日志（修复变量名错误 + 空值校验）
  const handleFetchRawLogs = async (containerName: string) => {
    if (!containerName) {
      message.warning('容器名称为空，无法获取日志');
      return;
    }

    try {
      setRawLogsLoading(true);
      const res = await getContainerLogsRaw(containerName);
      setLogs(res || '');
    } catch (err: any) {
      message.error(err?.message || '获取原始日志失败');
    } finally {
      setRawLogsLoading(false);
    }
  };

  // 7. 停止日志流（新增）
  const handleStopStreamLogs = () => {
    if (streamRef.current) {
      streamRef.current.abort();
      streamRef.current = null;
      setStreamLogsLoading(false);
      message.info('已停止实时日志订阅');
    }
  };

  // 8. 表格列配置（修复空值 + 增强筛选/可视化）
  const columns = [
    {
      title: '容器名称',
      dataIndex: 'Names',
      key: 'Names',
      width: 150,
      // 增强空值保护
      render: (names: string[]) => {
        if (!Array.isArray(names) || names.length === 0) return '-';
        return names[0]?.replace(/^\//g, '') || '-';
      },
      // 增加搜索筛选
      search: {
        placeholder: '请输入容器名称',
      },
    },
    {
      title: '镜像',
      dataIndex: 'Image',
      key: 'Image',
      width: 220,
      search: {
        placeholder: '请输入镜像名称',
      },
    },
    {
      title: '状态',
      dataIndex: 'State',
      key: 'State',
      width: 100,
      // 替换为 Tag 组件，增强可视化
      render: (text: string) => {
        const status = CONTAINER_STATE_MAP[
          text as keyof typeof CONTAINER_STATE_MAP
        ] || {
          color: 'default',
          text: text || '未知',
        };
        return <Tag color={status.color}>{status.text}</Tag>;
      },
      // 增加状态筛选
      filters: Object.entries(CONTAINER_STATE_MAP).map(([key, value]) => ({
        text: value.text,
        value: key,
      })),
      onFilter: (value, record) => record.State === value,
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
      // 修复空值 + key 问题
      render: (ports: any[]) => {
        if (!Array.isArray(ports) || ports.length === 0) return '-';
        return (
          <div>
            {ports.map((port, idx) => (
              <div key={`${port.PrivatePort || idx}-${port.Type || 'tcp'}`}>
                {port.PublicPort || '-'}:{port.PrivatePort || '-'}/
                {port.Type || 'tcp'}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_: any, record: Container) => {
        const containerName = record.Names?.[0]?.replace(/^\//g, '') || '';
        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              loading={restartLoading[containerName]}
              onClick={() => handleRestart(containerName)}
              // 可选：增加权限控制（比如从全局状态获取权限）
              // disabled={!hasPermission('container:restart')}
            >
              重启
            </Button>
            <Button
              type="default"
              size="small"
              loading={streamLogsLoading}
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
    <PageContainer title="容器管理">
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
        // 开启搜索功能
        search={{
          labelWidth: 80,
          collapsed: false,
        }}
        options={{
          reload: true,
          setting: true, // 允许用户自定义列
          density: true, // 支持调整行密度
        }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true, // 允许调整页大小
          showQuickJumper: true, // 快速跳页
          showTotal: (total) => `共 ${total} 个容器`,
        }}
        // 增加表格边框，提升可读性
        bordered
      />

      {/* 日志抽屉（支持调整宽度 + 增强操作） */}
      <Drawer
        title={`容器日志 - ${currentContainer}`}
        placement="right"
        onClose={() => setLogDrawerVisible(false)}
        open={logDrawerVisible}
        width={800}
        resizable // 支持调整宽度
        destroyOnClose // 关闭时销毁内容，避免内存泄漏
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <Button
            size="small"
            type="default"
            loading={rawLogsLoading}
            onClick={() => handleFetchRawLogs(currentContainer)}
          >
            获取最近100行
          </Button>
          <Button
            size="small"
            type="default"
            loading={streamLogsLoading}
            onClick={() => handleViewLogs(currentContainer)}
          >
            重新订阅实时日志
          </Button>
          <Button
            size="small"
            type="danger"
            onClick={handleStopStreamLogs}
            disabled={!streamRef.current}
          >
            停止日志流
          </Button>
        </div>

        {/* 日志展示区域（固定高度 + 自动滚动） */}
        {streamLogsLoading || rawLogsLoading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>加载中...</div>
        ) : logs ? (
          <pre
            className={styles.logContainer}
            ref={logContainerRef}
            style={{
              margin: 0,
            }}
          >
            {logs}
          </pre>
        ) : (
          <Empty description="暂无日志数据" />
        )}
      </Drawer>
    </PageContainer>
  );
};

export default ContainerManage;
