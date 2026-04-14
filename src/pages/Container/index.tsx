import {
  batchRestartContainers,
  Container,
  getContainers,
  getNodeList,
  restartContainer,
} from '@/services/container';
import { handleRequestError } from '@/utils/requestError';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Button,
  Descriptions,
  Input,
  message,
  Modal,
  Popover,
  Select,
  Space,
  Tag,
} from 'antd';
import { isEqual } from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';

const CONTAINER_STATE_MAP = {
  running: { color: 'success', text: '运行中' },
  exited: { color: 'error', text: '已停止' },
  paused: { color: 'warning', text: '已暂停' },
  dead: { color: 'default', text: '已崩溃' },
  created: { color: 'info', text: '已创建' },
};

const ContainerManage: React.FC = () => {
  const actionRef = useRef<any>();
  const [restartLoading, setRestartLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [batchRestartLoading, setBatchRestartLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Container[]>([]);
  const [tableData, setTableData] = useState<Container[]>([]);

  // 分页
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  // 搜索
  const [searchText, setSearchText] = useState('');

  // 排序
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>(
    undefined,
  );

  // 节点筛选
  const [nodeList, setNodeList] = useState<{ ip: string; port: number }[]>([]);
  const [selectedNodeIps, setSelectedNodeIps] = useState<string[]>(['all']);

  // 拉节点列表
  useEffect(() => {
    const fetchNodes = async () => {
      const res = await getNodeList();
      if (res.code === 0) {
        setNodeList(res.data || []);
      } else {
        setNodeList([]);
      }
    };
    fetchNodes();
  }, []);

  // 拉容器列表（自动轮询）
  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = selectedNodeIps.includes('all')
          ? undefined
          : selectedNodeIps;
        const data = await getContainers(params, false);
        setTableData((prev) => (isEqual(prev, data) ? prev : data));
      } catch (err) {
        console.error('获取容器失败', err);
      }
    };

    fetchData();
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, [selectedNodeIps]);

  // 手动刷新
  const handleManualRefresh = async () => {
    try {
      const params = selectedNodeIps.includes('all')
        ? undefined
        : selectedNodeIps;
      const data = await getContainers(params, true);
      setTableData((prev) => (isEqual(prev, data) ? prev : data));
      message.success('刷新成功');
    } catch (err) {
      console.error('手动刷新失败', err);
    }
  };

  // 搜索 + 排序
  const filteredData = useMemo(() => {
    let data = [...tableData];

    if (searchText) {
      const txt = searchText.toLowerCase();
      data = data.filter((item) => {
        const name = (item.Names?.[0] || '').toLowerCase();
        const image = (item.Image || '').toLowerCase();
        return name.includes(txt) || image.includes(txt);
      });
    }

    if (sortField && sortOrder) {
      data.sort((a, b) => {
        let aVal = '';
        let bVal = '';
        if (sortField === 'Names') {
          aVal = (a.Names?.[0] || '').toLowerCase();
          bVal = (b.Names?.[0] || '').toLowerCase();
        } else {
          aVal = String(a[sortField as keyof Container] || '').toLowerCase();
          bVal = String(b[sortField as keyof Container] || '').toLowerCase();
        }
        if (aVal < bVal) return sortOrder === 'ascend' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'ascend' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [tableData, searchText, sortField, sortOrder]);

  // 单个重启
  const handleRestart = async (containerName: string, nodeIp: string) => {
    if (!containerName || !nodeIp) {
      message.warning('容器信息不完整');
      return;
    }
    Modal.confirm({
      title: '确认重启容器',
      content: `是否重启容器：${containerName}？`,
      onOk: async () => {
        try {
          setRestartLoading((prev) => ({ ...prev, [containerName]: true }));
          await restartContainer({ containerName, nodeIp });
          message.success('重启成功');
        } catch (error: any) {
          handleRequestError(error);
        } finally {
          setRestartLoading((prev) => ({ ...prev, [containerName]: false }));
        }
      },
    });
  };

  // 批量重启
  const handleBatchRestart = async () => {
    if (selectedRows.length === 0) {
      message.warning('请选择容器');
      return;
    }
    Modal.confirm({
      title: `确认批量重启 ${selectedRows.length} 个容器？`,
      onOk: async () => {
        try {
          setBatchRestartLoading(true);
          const items = selectedRows
            .map((item) => ({
              containerName: item.Names?.[0]?.replace(/^\//, '') || '',
              nodeIp: item.nodeIp || '',
            }))
            .filter((i) => i.containerName && i.nodeIp);
          await batchRestartContainers({ containerItems: items });
          message.success('批量重启成功');
          setSelectedRows([]);
        } catch (error: any) {
          handleRequestError(error);
        } finally {
          setBatchRestartLoading(false);
        }
      },
    });
  };

  // 详情浮层
  const renderDetailContent = (record: Container) => (
    <div style={{ width: 380, fontSize: 12 }}>
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="容器ID">{record.Id}</Descriptions.Item>
        <Descriptions.Item label="容器Name">
          {record.Names?.[0]?.replace(/^\//, '') || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="镜像">{record.Image}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag
            color={
              CONTAINER_STATE_MAP[
                record.State as keyof typeof CONTAINER_STATE_MAP
              ]?.color || 'default'
            }
          >
            {CONTAINER_STATE_MAP[
              record.State as keyof typeof CONTAINER_STATE_MAP
            ]?.text || record.State}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="运行状态">{record.Status}</Descriptions.Item>
        <Descriptions.Item label="节点IP">{record.nodeIp}</Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {new Date(record.Created * 1000).toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label="启动命令">{record.Command}</Descriptions.Item>
      </Descriptions>
    </div>
  );

  const columns = [
    {
      title: '容器名称',
      dataIndex: 'Names',
      key: 'Names',
      width: 150,
      sorter: true,
      render: (names: string[]) => names?.[0]?.replace(/^\//g, '') || '-',
    },
    {
      title: '镜像',
      dataIndex: 'Image',
      key: 'Image',
      width: 220,
      sorter: true,
    },
    {
      title: '状态',
      dataIndex: 'State',
      key: 'State',
      width: 100,
      sorter: true,
      render: (text: string) => {
        const s = CONTAINER_STATE_MAP[
          text as keyof typeof CONTAINER_STATE_MAP
        ] || {
          color: 'default',
          text: '未知',
        };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '运行信息',
      dataIndex: 'Status',
      key: 'Status',
      width: 150,
    },
    {
      title: '节点IP',
      dataIndex: 'nodeIp',
      key: 'nodeIp',
      width: 140,
    },
    {
      title: '操作',
      width: 240,
      render: (_: any, record: Container) => {
        const name = record.Names?.[0]?.replace(/^\//g, '') || '';
        return (
          <Space size="small">
            <Popover
              content={renderDetailContent(record)}
              trigger="hover"
              placement="right"
              arrow
            >
              <Button size="small" type="text">
                详情
              </Button>
            </Popover>

            <Button
              type="primary"
              size="small"
              danger
              loading={restartLoading[name]}
              onClick={() => handleRestart(name, record.nodeIp || '')}
            >
              重启
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer title="容器管理">
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="选择节点"
          style={{ width: 320 }}
          mode="multiple"
          allowClear
          value={selectedNodeIps}
          onChange={(val) => {
            if (val.includes('all')) {
              setSelectedNodeIps(['all']);
            } else {
              setSelectedNodeIps(val);
            }
          }}
          options={[
            { label: '全部节点', value: 'all' },
            ...nodeList.map((n) => ({ label: n.ip, value: n.ip })),
          ]}
        />

        <Input
          placeholder="搜索容器名称/镜像"
          style={{ width: 280 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        <Button onClick={handleManualRefresh} type="default">
          手动刷新
        </Button>
      </Space>

      <ProTable<Container>
        columns={columns}
        actionRef={actionRef}
        dataSource={filteredData}
        rowKey="Id"
        search={false}
        sort={{
          field: sortField,
          order: sortOrder,
        }}
        onSort={(s) => {
          setSortField(s.field);
          setSortOrder(s.order);
        }}
        pagination={{
          ...pagination,
          total: filteredData.length,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (current, pageSize) => setPagination({ current, pageSize }),
        }}
        bordered
        rowSelection={{ onChange: (_, rows) => setSelectedRows(rows) }}
        toolBarRender={() => [
          <Button
            key="batch"
            type="primary"
            danger
            loading={batchRestartLoading}
            onClick={handleBatchRestart}
          >
            批量重启
          </Button>,
        ]}
      />
    </PageContainer>
  );
};

export default ContainerManage;
