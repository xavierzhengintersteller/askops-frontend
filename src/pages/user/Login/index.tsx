import { login } from '@/services/auth';
import { Button, Form, Input, message } from 'antd';
// src/pages/Login.tsx
import { useModel } from '@umijs/max';
import { useState } from 'react';
import { history } from 'umi';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { setInitialState } = useModel('@@initialState'); // 更新全局状态

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await login(values);

      // 存储 token 到 localStorage
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      // 更新全局状态（可选，如用户信息）
      setInitialState({
        currentUser: res.user,
      });

      // 跳转到首页
      history.push('/homeee');
      message.success('登录成功');
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
