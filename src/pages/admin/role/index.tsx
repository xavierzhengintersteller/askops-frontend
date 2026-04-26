import { PageContainer } from '@ant-design/pro-components';
import { request, useRequest } from '@umijs/max';
import { Button, Modal, Table, Tree, message } from 'antd';
import { useState } from 'react';

export default function AdminRole() {
  const [visible, setVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  const [permKeys, setPermKeys] = useState([]);

  // 角色列表
  const { data, loading } = useRequest(() => request('/api/admin/role/list'));

  // 权限树
  const { data: permTree } = useRequest(() =>
    request('/api/admin/permission/list'),
  );

  // 打开分配权限
  const openPerm = (r) => {
    setCurrentRole(r);
    setVisible(true);
  };

  // 提交分配权限
  const savePerm = async () => {
    await request('/api/admin/role/assign-permissions', {
      method: 'POST',
      data: { roleId: currentRole.id, permissionIds: permKeys },
    });
    message.success('分配成功');
    setVisible(false);
  };

  const columns = [
    { title: 'ID', dataIndex: 'id' },
    { title: '角色名', dataIndex: 'roleName' },
    { title: '编码', dataIndex: 'roleCode' },
    {
      title: '操作',
      render: (_, r) => <Button onClick={() => openPerm(r)}>分配权限</Button>,
    },
  ];

  return (
    <PageContainer title="角色管理">
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data?.data}
        columns={columns}
      />

      <Modal
        open={visible}
        title="分配权限"
        onCancel={() => setVisible(false)}
        onOk={savePerm}
      >
        <Tree
          checkable
          treeData={permTree?.data}
          fieldNames={{
            title: 'permissionName',
            key: 'id',
            children: 'children',
          }}
          onCheck={(keys) => setPermKeys(keys)}
        />
      </Modal>
    </PageContainer>
  );
}
