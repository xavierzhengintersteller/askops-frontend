import { PageContainer } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { useRequest } from 'ahooks';
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Table,
  Transfer,
  TreeSelect,
} from 'antd';
import { useState } from 'react';

// 递归转换成 TreeSelect 要求的标准树结构
const convertPermTree = (list: any[]): any[] => {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    return {
      title: item.permissionName,
      value: String(item.id),
      children: convertPermTree(item.children),
    };
  });
};

export default function AdminRole() {
  const [form] = Form.useForm();

  const [permVisible, setPermVisible] = useState(false);
  const [groupVisible, setGroupVisible] = useState(false);
  const [addRoleVisible, setAddRoleVisible] = useState(false);

  const [currentRole, setCurrentRole] = useState<{
    id: string;
    roleName: string;
    roleCode: string;
  } | null>(null);

  // 权限选中值
  const [permKeys, setPermKeys] = useState<string[]>([]);
  const [groupKeys, setGroupKeys] = useState<string[]>([]);

  // 角色列表
  const {
    data: roleList,
    loading,
    refresh,
  } = useRequest(() => request('/api/admin/role/detail/list'));

  // 权限树 + 前端结构转换
  const { data: permTree } = useRequest(async () => {
    const res = await request('/api/admin/permission/list');
    return convertPermTree(res.data || []);
  });

  // 所有组
  const { data: allGroup } = useRequest(() =>
    request('/api/admin/role-group/list'),
  );

  // 打开分配权限弹窗 + 回显已选权限
  const openPermModal = async (record: any) => {
    setCurrentRole({ ...record, id: String(record.id) });
    const res = await request(
      `/api/admin/role/permission/ids?roleId=${record.id}`,
    );
    setPermKeys((res.data || []).map(String));
    setPermVisible(true);
  };

  // 保存权限
  const savePerm = async () => {
    await request('/api/admin/role-permission/assign', {
      method: 'POST',
      data: {
        roleId: Number(currentRole!.id),
        permissionIds: permKeys.map(Number),
      },
    });
    message.success('权限分配成功');
    setPermVisible(false);
    refresh();
  };

  // 打开分配组
  const openGroupModal = async (record: any) => {
    setCurrentRole({ ...record, id: String(record.id) });
    const res = await request(
      `/api/admin/role-group/by-role?roleId=${record.id}`,
    );
    setGroupKeys((res.data || []).map(String));
    setGroupVisible(true);
  };

  // 保存组
  const saveGroup = async () => {
    await request('/api/admin/role-group/assign', {
      method: 'POST',
      data: {
        roleId: Number(currentRole!.id),
        groupIds: groupKeys.map(Number),
      },
    });
    message.success('组分配成功');
    setGroupVisible(false);
    refresh();
  };

  // 删除角色
  const deleteRole = async (id: string) => {
    await request(`/api/admin/role/delete/${id}`, { method: 'POST' });
    message.success('删除成功');
    refresh();
  };

  // 新增角色
  const handleAddRole = async () => {
    const values = await form.validateFields();
    await request('/api/admin/role/add', {
      method: 'POST',
      data: values,
    });
    message.success('新增角色成功');
    setAddRoleVisible(false);
    form.resetFields();
    refresh();
  };

  const columns = [
    { title: '角色名', dataIndex: 'roleName' },
    { title: '编码', dataIndex: 'roleCode' },
    {
      title: '拥有权限',
      render: (_, r) => <span>{r.permissionNames?.join('、') || '无'}</span>,
    },
    {
      title: '可访问组',
      render: (_, r) => <span>{r.groupNames?.join('、') || '无'}</span>,
    },
    {
      title: '操作',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="link" onClick={() => openPermModal(r)}>
            分配权限
          </Button>
          <Button type="link" onClick={() => openGroupModal(r)}>
            分配组
          </Button>
          <Popconfirm
            title="确定删除该角色？关联权限和组会被清空"
            onConfirm={() => deleteRole(String(r.id))}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const groupData =
    allGroup?.data?.map((g: any) => ({
      key: String(g.groupId),
      title: g.groupName,
    })) || [];

  return (
    <PageContainer
      title="角色管理"
      extra={
        <Button type="primary" onClick={() => setAddRoleVisible(true)}>
          + 新增角色
        </Button>
      }
    >
      <Table
        rowKey={(record) => String(record.id)}
        loading={loading}
        dataSource={roleList?.data}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      {/* 分配权限弹窗 TreeSelect 完美版 */}
      <Modal
        open={permVisible}
        title="分配权限"
        width={700}
        onCancel={() => setPermVisible(false)}
        onOk={savePerm}
      >
        <TreeSelect
          showSearch
          style={{ width: '100%' }}
          value={permKeys}
          placeholder="请选择权限"
          allowClear
          multiple
          treeDefaultExpandAll
          onChange={setPermKeys}
          treeData={permTree || []}
          styles={{
            popup: {
              root: { maxHeight: 1500, overflow: 'auto' },
            },
          }}
        />
      </Modal>

      {/* 分配组弹窗 */}
      <Modal
        open={groupVisible}
        title="分配可访问组"
        width={600}
        onCancel={() => setGroupVisible(false)}
        onOk={saveGroup}
      >
        <Transfer
          dataSource={groupData}
          targetKeys={groupKeys}
          onChange={setGroupKeys}
          render={(item) => item.title}
          titles={['全部组', '已分配组']}
        />
      </Modal>

      {/* 新增角色弹窗 */}
      <Modal
        open={addRoleVisible}
        title="新增角色"
        onCancel={() => setAddRoleVisible(false)}
        onOk={handleAddRole}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="roleName"
            label="角色名称"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="roleCode"
            label="角色编码"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
