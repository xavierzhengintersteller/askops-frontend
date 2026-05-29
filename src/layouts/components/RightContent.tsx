import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Avatar, Dropdown, Space } from 'antd';

export default function RightContent() {
  const logout = () => {
    // 清理本地 token
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    localStorage.removeItem('menuTree');
    localStorage.removeItem('permissionCodes');
    // 跳转登录页
    history.push('/user/login');
  };
  const { initialState } = useModel('@@initialState');

  const username = initialState?.currentUser?.username;

  const items: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: logout,
    },
  ];

  return (
    <Dropdown menu={{ items }} placement="bottomRight">
      <Space style={{ cursor: 'pointer' }}>
        <Avatar icon={<UserOutlined />} />
        {username}
      </Space>
    </Dropdown>
  );
}
