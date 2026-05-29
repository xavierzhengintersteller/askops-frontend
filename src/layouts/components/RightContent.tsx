import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Avatar, Dropdown, Space } from 'antd';

export default function RightContent() {
  const logout = () => {
    // 清理本地 token
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    // 跳转登录页
    history.push('/user/login');
  };

  const items: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout,
    },
  ];

  return (
    <Dropdown menu={{ items }} placement="bottomRight">
      <Space style={{ cursor: 'pointer' }}>
        <Avatar icon={<UserOutlined />} />
        admin
      </Space>
    </Dropdown>
  );
}
