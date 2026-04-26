import { PageContainer } from '@ant-design/pro-components';
import { request, useRequest } from '@umijs/max';
import { Tree } from 'antd';

export default function AdminPermission() {
  const { data, loading } = useRequest(() =>
    request('/api/admin/permission/list'),
  );

  return (
    <PageContainer title="权限管理">
      <Tree
        loading={loading}
        treeData={data?.data}
        fieldNames={{
          title: 'permissionName',
          key: 'id',
          children: 'children',
        }}
        defaultExpandAll
      />
    </PageContainer>
  );
}
