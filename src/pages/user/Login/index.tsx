import { fetchPermissionMenu, login } from '@/services/auth';
import { useModel } from '@umijs/max';
import { Button, Form, Input, message } from 'antd';
import { useState } from 'react';
import { history } from 'umi';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { setInitialState } = useModel('@@initialState');

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await login(values);
      const { accessToken, refreshToken, permissionVersion } = res.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('permissionVersion', permissionVersion);

      // ✅ 登录成功后拉取菜单
      const menuRes = await fetchPermissionMenu();
      const { leftMenuTree, permissionCodes } = menuRes.data;

      localStorage.setItem('menuTree', JSON.stringify(leftMenuTree));
      localStorage.setItem('permissionCodes', JSON.stringify(permissionCodes));

      setInitialState({
        currentUser: res.data,
        menuTree: leftMenuTree,
        permissionCodes,
      });

      message.success('登录成功');
      history.push('/');
    } catch (error) {
      message.error(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto' }}>
      <Form onFinish={onFinish}>
        <Form.Item name="username" rules={[{ required: true }]}>
          <Input placeholder="用户名" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true }]}>
          <Input.Password placeholder="密码" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            登录
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
