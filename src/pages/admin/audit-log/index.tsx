import { CopyOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { useRequest } from 'ahooks';
import {
  Button,
  Descriptions,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Table,
} from 'antd';
import { useState } from 'react';

// JSON 独立弹窗组件（移除Ctrl+A逻辑，仅保留标题复制）
const JsonViewModal = ({
  open,
  jsonStr,
  onClose,
}: {
  open: boolean;
  jsonStr: string;
  onClose: () => void;
}) => {
  const formatJson = (str?: string) => {
    if (!str) return '无';
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  // 一键复制
  const handleCopy = () => {
    const text = formatJson(jsonStr);
    navigator.clipboard.writeText(text).then(() => {
      message.success('复制成功');
    });
  };

  const formatted = formatJson(jsonStr);

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          完整JSON查看
          <CopyOutlined
            onClick={handleCopy}
            style={{
              fontSize: 16,
              cursor: 'pointer',
            }}
          />
        </div>
      }
      width={920}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <pre
        style={{
          maxHeight: '72vh',
          overflow: 'auto',
          padding: 14,
          background: '#f7f8fa',
          borderRadius: 4,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {formatted}
      </pre>
    </Modal>
  );
};

export default function AdminAuditLog() {
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [searchParams, setSearchParams] = useState({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentLogId, setCurrentLogId] = useState<number | null>(null);
  const [jsonModalVisible, setJsonModalVisible] = useState(false);
  const [currentJson, setCurrentJson] = useState('');

  // 下拉选项
  const { data: optionData } = useRequest(async () => {
    const res = await request('/api/admin/audit-log/options');
    return res.data;
  });
  const statusOptions =
    optionData?.statuses?.map((v) => ({ label: v, value: v })) || [];
  const apiEndpointOptions =
    optionData?.apiEndpoints?.map((v) => ({ label: v, value: v })) || [];

  // 列表数据
  const { data: tableResult, loading } = useRequest(
    async () => {
      const res = await request('/api/admin/audit-log/page', {
        params: {
          pageNum: pagination.current,
          pageSize: pagination.pageSize,
          ...searchParams,
        },
      });
      return res.data;
    },
    { refreshDeps: [pagination, searchParams] },
  );

  // 查询重置
  const handleSearch = (values: any) => {
    setSearchParams(values);
    setPagination((p) => ({ ...p, current: 1 }));
  };

  // 表格排序、分页变化
  const handleTableChange = (newPagination, filters, sorter) => {
    setPagination(newPagination);

    // 构造排序参数
    const sortParams = {};
    if (sorter.field && sorter.order) {
      sortParams.sortField = sorter.field;
      sortParams.sortOrder = sorter.order === 'ascend' ? 'ascend' : 'descend';
    }

    setSearchParams({
      ...searchParams,
      ...sortParams,
    });
  };

  const handleReset = () => {
    form.resetFields();
    setSearchParams({});
  };

  // 双击表格行打开详情
  const onDoubleClickRow = (record: any) => {
    setCurrentLogId(record.id);
    setDetailVisible(true);
  };

  // 打开JSON弹窗
  const openJsonWin = (json?: string) => {
    setCurrentJson(json ?? '无数据');
    setJsonModalVisible(true);
  };

  // 复制单项JSON
  const copyJsonValue = (str?: string) => {
    let text = '无';
    if (str) {
      try {
        text = JSON.stringify(JSON.parse(str), null, 2);
      } catch {
        text = str;
      }
    }
    navigator.clipboard.writeText(text).then(() => message.success('复制成功'));
  };

  // 详情接口
  const { data: detailData, loading: detailLoading } = useRequest(
    async () => {
      if (!currentLogId) return null;
      const res = await request(`/api/admin/audit-log/${currentLogId}`);
      return res.data;
    },
    { ready: detailVisible && !!currentLogId },
  );

  // 格式化展示文本
  const formatPreview = (str?: string) => {
    if (!str) return '无';
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  const columns = [
    { title: '用户ID', dataIndex: 'userId', width: 100, sorter: true },
    { title: '模块', dataIndex: 'module', width: 140, sorter: true },
    { title: '操作', dataIndex: 'operation', width: 140, sorter: true },
    { title: '请求IP', dataIndex: 'requestIp', width: 150, sorter: true },
    { title: '请求路径', dataIndex: 'requestPath', width: 260, sorter: true },
    {
      title: '状态',
      dataIndex: 'status',
      sorter: true,
      width: 120,
      render: (text: string) => {
        if (text === 'SUCCESS')
          return <span style={{ color: '#00b42a' }}>成功</span>;
        if (text === 'PARTIAL_FAIL')
          return <span style={{ color: '#ff7d00' }}>部分失败</span>;
        if (text === 'FAIL')
          return <span style={{ color: '#ff4d4f' }}>失败</span>;
        return text;
      },
    },
    { title: '操作时间', dataIndex: 'createTime', width: 180, sorter: true },
  ];

  return (
    <PageContainer title="审计日志">
      <Form
        form={form}
        layout="inline"
        onFinish={handleSearch}
        style={{ marginBottom: 16 }}
      >
        <Form.Item name="requestPath" label="请求路径">
          <Select
            placeholder="请求路径"
            allowClear
            style={{ width: 280 }}
            options={apiEndpointOptions}
          />
        </Form.Item>
        <Form.Item name="requestIp" label="IP">
          <Input
            placeholder="请输入请求IP（支持模糊）"
            allowClear
            style={{ width: 160 }}
          />
        </Form.Item>
        <Form.Item name="status" label="状态">
          <Select
            placeholder="请选择状态"
            allowClear
            style={{ width: 130 }}
            options={statusOptions}
          />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            查询
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Form>

      <Table
        rowKey={(r) => String(r.id)}
        loading={loading}
        dataSource={tableResult?.records || []}
        columns={columns}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: tableResult?.total || 0,
          showSizeChanger: true,
          showTotal: (t: number) => `共 ${t} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
        onRow={(record) => ({
          onDoubleClick: () => onDoubleClickRow(record),
          style: { cursor: 'pointer' },
        })}
      />

      {/* 主详情弹窗 */}
      <Modal
        title="审计日志详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={950}
        footer={null}
        destroyOnClose
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载详情中...</div>
        ) : (
          <div style={{ maxHeight: '70vh', overflow: 'auto', paddingRight: 8 }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="日志ID">
                {detailData?.id}
              </Descriptions.Item>
              <Descriptions.Item label="链路ID">
                {detailData?.traceId}
              </Descriptions.Item>
              <Descriptions.Item label="用户ID">
                {detailData?.userId}
              </Descriptions.Item>
              <Descriptions.Item label="超级管理员">
                {detailData?.superAdmin ? '是' : '否'}
              </Descriptions.Item>
              <Descriptions.Item label="模块">
                {detailData?.module}
              </Descriptions.Item>
              <Descriptions.Item label="操作类型">
                {detailData?.operation}
              </Descriptions.Item>
              <Descriptions.Item label="请求路径">
                {detailData?.requestPath}
              </Descriptions.Item>
              <Descriptions.Item label="请求方法">
                {detailData?.requestMethod}
              </Descriptions.Item>
              <Descriptions.Item label="请求IP">
                {detailData?.requestIp}
              </Descriptions.Item>
              <Descriptions.Item label="HTTP状态码">
                {detailData?.httpCode}
              </Descriptions.Item>
              <Descriptions.Item label="耗时(ms)">
                {detailData?.costTime}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {detailData?.status}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {detailData?.createTime}
              </Descriptions.Item>
              <Descriptions.Item label="异常信息" span={2}>
                {detailData?.errorMsg || '无'}
              </Descriptions.Item>
            </Descriptions>

            {/* 请求参数 标题带复制 */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h4 style={{ margin: 0 }}>请求参数</h4>
                <CopyOutlined
                  onClick={() => copyJsonValue(detailData?.requestParams)}
                  style={{ cursor: 'pointer', fontSize: 16 }}
                />
              </div>
              <pre
                onDoubleClick={() => openJsonWin(detailData?.requestParams)}
                style={{
                  background: '#f7f8fa',
                  padding: 10,
                  borderRadius: 4,
                  maxHeight: 160,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  cursor: 'pointer',
                  marginTop: 8,
                }}
              >
                {formatPreview(detailData?.requestParams)}
              </pre>
            </div>

            {/* 返回结果 标题带复制 */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h4 style={{ margin: 0 }}>返回结果</h4>
                <CopyOutlined
                  onClick={() => copyJsonValue(detailData?.responseResult)}
                  style={{ cursor: 'pointer', fontSize: 16 }}
                />
              </div>
              <pre
                onDoubleClick={() => openJsonWin(detailData?.responseResult)}
                style={{
                  background: '#f7f8fa',
                  padding: 10,
                  borderRadius: 4,
                  maxHeight: 160,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  cursor: 'pointer',
                  marginTop: 8,
                }}
              >
                {formatPreview(detailData?.responseResult)}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      {/* JSON弹窗 */}
      <JsonViewModal
        open={jsonModalVisible}
        jsonStr={currentJson}
        onClose={() => setJsonModalVisible(false)}
      />
    </PageContainer>
  );
}
