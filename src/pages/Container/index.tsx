import {
  batchRestartContainers,
  BatchRestartSyncResp,
  Container,
  getContainerDetail,
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
  Table,
  Tag,
} from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';

// 和后端 DTO 对齐的查询参数类型
interface ContainerQueryDTO {
  nodeIps?: string[];
  manual: boolean;
  pageNum: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

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
  const [batchTaskLoading, setBatchTaskLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Container[]>([]);
  const [tableData, setTableData] = useState<Container[]>([]);
  const [tableTotal, setTableTotal] = useState(0);
  // 本地搜索文本（前端内存过滤）
  const [searchText, setSearchText] = useState('');

  // 分页状态（对应后端 pageNum / pageSize）
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  // 排序状态（转后端 asc / desc）
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>(
    undefined,
  );

  // 节点筛选
  const [nodeList, setNodeList] = useState<{ ip: string; port: number }[]>([]);
  const [selectedNodeIps, setSelectedNodeIps] = useState<string[]>(['all']);

  // 批量弹窗
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchRestartSyncResp | null>(
    null,
  );

  // 拉取节点下拉列表
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

  // 核心：请求后端分页接口，接收 isManual 控制 manual 字段
  const loadContainerList = async (isManual = false) => {
    try {
      // 组装后端完整 DTO 参数
      const queryParams: ContainerQueryDTO = {
        manual: isManual,
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        sortField,
        sortOrder:
          sortOrder === 'ascend'
            ? 'asc'
            : sortOrder === 'descend'
            ? 'desc'
            : undefined,
        nodeIps: selectedNodeIps.includes('all') ? undefined : selectedNodeIps,
      };
      const pageData = await getContainers(queryParams);
      setTableData(pageData.records || []);
      setTableTotal(pageData.total || 0);
    } catch (err) {
      console.error('获取容器失败', err);
      message.error('查询容器列表失败');
    }
  };

  // 页面初始化 + 30s 轮询刷新（不强制同步DB）
  useEffect(() => {
    loadContainerList();
    const timer = setInterval(() => loadContainerList(), 30000);
    return () => clearInterval(timer);
  }, []);

  // 切换节点筛选，重置页码并重新请求后端
  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    loadContainerList();
  }, [selectedNodeIps]);

  // 手动刷新：携带 manual=true 强制同步DB
  const handleManualRefresh = async () => {
    await loadContainerList(true);
    message.success('刷新成功，已同步最新容器数据');
  };

  // 仅前端本地文本模糊搜索，分页/排序/节点全部交给后端处理
  const filteredData = useMemo(() => {
    let data = [...tableData];
    if (searchText) {
      const txt = searchText.toLowerCase();
      data = data.filter((item) => {
        const name = item.containerName.toLowerCase();
        const image = item.image.toLowerCase();
        const cid = item.containerId.toLowerCase();
        return name.includes(txt) || image.includes(txt) || cid.includes(txt);
      });
    }
    return data;
  }, [tableData, searchText]);

  // 单行重启容器
  const handleRestart = async (record: Container) => {
    const { containerId, nodeIp, containerName } = record;
    if (!containerId || !nodeIp) {
      message.warning('容器信息不完整');
      return;
    }
    Modal.confirm({
      title: '确认重启容器',
      content: `是否重启容器【${containerName}】短ID:${record.shortId}`,
      onOk: async () => {
        try {
          setRestartLoading((prev) => ({ ...prev, [containerId]: true }));
          await restartContainer({ containerId, nodeIp });
          message.success({
            content: `容器【${containerName}】重启成功`,
            duration: 2,
          });
          await loadContainerList();
        } catch (error: any) {
          handleRequestError(error);
        } finally {
          setRestartLoading((prev) => ({ ...prev, [containerId]: false }));
        }
      },
    });
  };

  // 批量重启容器
  const handleBatchRestart = async () => {
    if (selectedRows.length === 0) {
      message.warning('请先勾选需要重启的容器');
      return;
    }
    Modal.confirm({
      title: `确认批量重启 ${selectedRows.length} 个容器`,
      onOk: async () => {
        try {
          setBatchTaskLoading(true);
          const containerItems = selectedRows.map((item) => ({
            containerId: item.containerId,
            nodeIp: item.nodeIp,
          }));
          const data = await batchRestartContainers({ containerItems });
          setBatchResult(data);
          setBatchModalVisible(true);
          setSelectedRows([]);

          if (data.success === data.total) {
            message.success(`全部${data.total}个容器重启成功`);
          } else if (data.fail === data.total) {
            message.error(`全部${data.total}个容器重启失败`);
          } else {
            message.info(
              `批量执行完成：成功${data.success}个，失败${data.fail}个`,
            );
          }
          setTimeout(() => loadContainerList(), 500);
        } catch (error: any) {
          handleRequestError(error);
        } finally {
          setBatchTaskLoading(false);
        }
      },
    });
  };

  // 悬浮预览弹窗内容
  const renderDetailContent = (record: Container) => {
    const showFullDetail = async () => {
      const detail = await getContainerDetail(
        record.nodeIp,
        record.containerId,
      );
      if (!detail) return;
      Modal.info({
        width: 800,
        title: `容器详情 ${record.containerName}(${record.shortId})`,
        content: (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="完整容器ID">
              {detail.Id}
            </Descriptions.Item>
            <Descriptions.Item label="容器名称">
              {detail.Name.replace(/^\//, '')}
            </Descriptions.Item>
            <Descriptions.Item label="镜像">{detail.Image}</Descriptions.Item>
            <Descriptions.Item label="运行状态">
              {detail.State.Status}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {detail.Created}
            </Descriptions.Item>
            <Descriptions.Item label="启动命令">
              {detail.Config.Cmd.join(' ')}
            </Descriptions.Item>
          </Descriptions>
        ),
      });
    };
    return (
      <div style={{ width: 420, fontSize: 12 }}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="完整ID">
            {record.containerId}
          </Descriptions.Item>
          <Descriptions.Item label="短ID">{record.shortId}</Descriptions.Item>
          <Descriptions.Item label="容器名称">
            {record.containerName}
          </Descriptions.Item>
          <Descriptions.Item label="镜像">{record.image}</Descriptions.Item>
          <Descriptions.Item label="节点IP">{record.nodeIp}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag
              color={
                CONTAINER_STATE_MAP[
                  record.state as keyof typeof CONTAINER_STATE_MAP
                ]?.color
              }
            >
              {
                CONTAINER_STATE_MAP[
                  record.state as keyof typeof CONTAINER_STATE_MAP
                ]?.text
              }
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="运行描述">
            {record.status}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {record.createdAt}
          </Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <Button size="small" onClick={showFullDetail}>
            查看完整Podman详情
          </Button>
        </div>
      </div>
    );
  };

  const columns = [
    {
      title: '容器短ID',
      dataIndex: 'shortId',
      key: 'shortId',
      width: 130,
      sorter: true,
    },
    {
      title: '容器名称',
      dataIndex: 'containerName',
      key: 'containerName',
      width: 160,
      sorter: true,
    },
    {
      title: '镜像',
      dataIndex: 'image',
      key: 'image',
      width: 240,
      sorter: true,
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      width: 100,
      sorter: true,
      render: (text: string) => {
        const s = CONTAINER_STATE_MAP[
          text as keyof typeof CONTAINER_STATE_MAP
        ] || { color: 'default', text: '未知' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '运行信息',
      dataIndex: 'status',
      key: 'status',
      width: 160,
    },
    {
      title: '节点IP',
      dataIndex: 'nodeIp',
      key: 'nodeIp',
      width: 140,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: true,
    },
    {
      title: '操作',
      width: 220,
      render: (_: any, record: Container) => (
        <Space size="small">
          <Popover
            content={renderDetailContent(record)}
            trigger="hover"
            placement="right"
            arrow
          >
            <Button size="small" type="text">
              预览
            </Button>
          </Popover>
          <Button
            type="primary"
            danger
            size="small"
            loading={restartLoading[record.containerId]}
            onClick={() => handleRestart(record)}
          >
            重启
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="容器管理">
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="选择节点"
          style={{ width: 320 }}
          mode="multiple"
          allowClear
          value={selectedNodeIps}
          onChange={(val) =>
            setSelectedNodeIps(val.includes('all') ? ['all'] : val)
          }
          options={[
            { label: '全部节点', value: 'all' },
            ...nodeList.map((n) => ({ label: n.ip, value: n.ip })),
          ]}
        />
        <Input
          placeholder="搜索容器ID/名称/镜像"
          style={{ width: 300 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
        <Button onClick={handleManualRefresh}>手动刷新</Button>
      </Space>

      <ProTable<Container>
        columns={columns}
        actionRef={actionRef}
        dataSource={filteredData}
        rowKey="containerId"
        search={false}
        sort={{
          field: sortField,
          order: sortOrder,
        }}
        // 表头排序：更新状态 + 重置第一页 + 请求后端
        onSort={async (sortParams) => {
          setSortField(sortParams.field as string);
          setSortOrder(sortParams.order);
          setPagination((prev) => ({ ...prev, current: 1 }));
          await loadContainerList();
        }}
        pagination={{
          ...pagination,
          total: tableTotal,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          // 切换页码/每页条数，请求后端
          onChange: async (current, pageSize) => {
            setPagination({ current, pageSize });
            await loadContainerList();
          },
        }}
        bordered
        rowSelection={{ onChange: (_, rows) => setSelectedRows(rows) }}
        toolBarRender={() => [
          <Button
            key="batch"
            type="primary"
            danger
            loading={batchTaskLoading}
            onClick={handleBatchRestart}
          >
            批量重启选中容器
          </Button>,
        ]}
      />

      <Modal
        open={batchModalVisible}
        title="批量重启执行结果"
        width={720}
        footer={
          <Button onClick={() => setBatchModalVisible(false)}>关闭</Button>
        }
        onCancel={() => setBatchModalVisible(false)}
      >
        {batchResult ? (
          <>
            <div
              style={{
                marginBottom: 16,
                padding: '12px 16px',
                background: '#fafafa',
                borderRadius: 6,
                display: 'flex',
                gap: 24,
                alignItems: 'center',
              }}
            >
              <Tag color="green">成功 {batchResult.success}</Tag>
              <Tag color="red">失败 {batchResult.fail}</Tag>
              <span>共 {batchResult.total} 个容器</span>
            </div>
            <Table
              size="small"
              bordered
              rowKey="containerName"
              dataSource={batchResult.results}
              pagination={false}
              scroll={{ y: 350 }}
              columns={[
                { title: '容器名称', dataIndex: 'containerName', width: 360 },
                { title: '节点IP', dataIndex: 'nodeIp', width: 140 },
                {
                  title: '执行结果',
                  width: 100,
                  render: (_, row) => (
                    <Tag color={row.success ? 'success' : 'error'}>
                      {row.success ? '成功' : '失败'}
                    </Tag>
                  ),
                },
              ]}
            />
          </>
        ) : (
          <div>批量执行结果加载中，请稍候...</div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default ContainerManage;
