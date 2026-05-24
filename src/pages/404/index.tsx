import { useNavigate } from '@umijs/max';
import { Button, Result } from 'antd';

export default function Page404() {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="抱歉，您访问的页面不存在"
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          返回首页
        </Button>
      }
    />
  );
}
