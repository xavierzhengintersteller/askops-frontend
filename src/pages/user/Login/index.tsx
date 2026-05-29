import { fetchPermissionMenu, login } from '@/services/auth';
import { history, useModel } from '@umijs/max';
import { Button, Form, Input } from 'antd';
export default function Login() {
  const { setInitialState } = useModel('@@initialState');

  const onFinish = async (values: any) => {
    const res = await login(values);

    const { accessToken, refreshToken } = res.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    const menuRes = await fetchPermissionMenu();
    const { leftMenuTree, permissionCodes } = menuRes.data;

    localStorage.setItem('menuTree', JSON.stringify(leftMenuTree));
    localStorage.setItem('permissionCodes', JSON.stringify(permissionCodes));

    setInitialState((s) => ({
      ...s,
      currentUser: { token: accessToken },
      menuTree: leftMenuTree,
      permissionCodes,
    }));

    history.push('/');
    window.location.reload();
  };

  return (
    <div style={{ width: 300, margin: '100px auto' }}>
      <Form onFinish={onFinish}>
        <Form.Item name="username">
          <Input />
        </Form.Item>

        <Form.Item name="password">
          <Input.Password />
        </Form.Item>

        <Button type="primary" htmlType="submit">
          登录
        </Button>
      </Form>
    </div>
  );
}
