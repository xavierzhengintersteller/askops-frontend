import {
  addUser,
  blacklistUser,
  deleteUser,
  listRole,
  listUser,
  updateUserPassword,
  UserItem,
} from '@/services/admin';
import { PlusOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useRequest } from 'ahooks';
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import { useState } from 'react';

export default function AdminUser() {
  const { data, loading, refresh } = useRequest(listUser);
  const { data: roleOptions } = useRequest(listRole);

  // 弹窗控制
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // 提交新增
  const handleAddUser = async () => {
    const values = await form.validateFields();
    await addUser(values);
    message.success('添加成功');
    setAddModalVisible(false);
    form.resetFields();
    refresh();
  };

  // 切换启用/禁用
  const handleStatusChange = async (userId: number, enabled: boolean) => {
    try {
      await blacklistUser({ userId, enabled });
      message.success(enabled ? '已启用' : '已禁用');
      refresh();
    } catch (err) {
      message.error('操作失败');
    }
  };

  // 删除用户
  const handleDelete = async (id: number) => {
    try {
      await deleteUser(id);
      message.success('删除成功');
      refresh();
    } catch (err) {
      message.error('删除失败');
    }
  };

  // 打开重置密码弹窗
  const openResetPwd = (userId: number) => {
    setCurrentUserId(userId);
    setPwdModalVisible(true);
  };

  // 提交重置密码
  const handleResetPwd = async () => {
    try {
      const values = await pwdForm.validateFields();
      await updateUserPassword({
        userId: currentUserId,
        newPassword: values.newPassword,
      });
      message.success('密码重置成功');
      setPwdModalVisible(false);
      pwdForm.resetFields();
      refresh();
    } catch (err) {
      message.error('密码重置失败');
    }
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    {
      title: '角色',
      render: (_, record: UserItem) =>
        record.roleNames?.map((name) => (
          <Tag color="blue" key={name}>
            {name}
          </Tag>
        )) || [],
    },
    {
      title: '所属组',
      render: (_, record: UserItem) =>
        record.groups?.map((g) => (
          <Tag color="green" key={g.groupId}>
            {g.groupName}
          </Tag>
        )) || [],
    },
    {
      title: '可访问Agent',
      render: (_, record: UserItem) =>
        record.agents?.map((a) => (
          <div key={a.agentId}>
            {a.name} ({a.ip})
          </div>
        )) || [],
    },

    // ======================
    // 状态开关：admin 禁用
    // ======================
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, record: UserItem) => {
        const isAdmin = record.username === 'admin';
        return (
          <Switch
            checked={record.enabled}
            checkedChildren="启用"
            unCheckedChildren="禁用"
            onChange={(checked) => handleStatusChange(record.userId, checked)}
            disabled={isAdmin} // 👈 核心
          />
        );
      },
    },

    // ======================
    // 操作列：admin 按钮灰色/隐藏
    // ======================
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record: UserItem) => {
        const isAdmin = record.username === 'admin';
        return (
          <Space>
            {/* 重置密码：admin 禁用 */}
            <Button
              type="text"
              onClick={() => openResetPwd(record.userId)}
              disabled={isAdmin}
            >
              重置密码
            </Button>

            {/* 删除：admin 直接不显示 */}
            {!isAdmin && (
              <Popconfirm
                title="确定删除该用户？"
                onConfirm={() => handleDelete(record.userId)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="text" danger>
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer
      title="用户管理"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddModalVisible(true)}
        >
          新增用户
        </Button>
      }
    >
      <Table
        rowKey="userId"
        loading={loading}
        dataSource={data?.data || []}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      {/* 新增用户弹窗 */}
      <Modal
        title="新增用户"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        onOk={handleAddUser}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item
            name="roleIds"
            label="分配角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={roleOptions?.data?.map((r) => ({
                label: r.roleName,
                value: r.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 重置密码弹窗 */}
      <Modal
        title="重置密码"
        open={pwdModalVisible}
        onCancel={() => setPwdModalVisible(false)}
        onOk={handleResetPwd}
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical">
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[{ required: true, message: '请输入新密码' }]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
