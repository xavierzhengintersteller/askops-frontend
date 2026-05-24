import Guide from '@/components/Guide';
import { trim } from '@/utils/format';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import styles from './index.less';

import { getDashboardStats } from '@/services/dashboard';
import { useRequest } from 'ahooks';
import { Card, Col, Row, Space, Statistic, Tag } from 'antd';

const HomePage: React.FC = () => {
  const { name } = useModel('global');

  // 请求统计数据
  const { data: stats } = useRequest(getDashboardStats, {
    initialData: {
      agentTotal: 0,
      agentOnline: 0,
      agentOffline: 0,
      containerTotal: 0,
    },
  });

  // 🔥 核心修复：如果 stats 为 undefined，给一个默认值
  const data = stats || {
    agentTotal: 0,
    agentOnline: 0,
    agentOffline: 0,
    containerTotal: 0,
  };

  return (
    <PageContainer ghost>
      <div className={styles.container}>
        <Guide name={trim(name)} />

        <div className={styles.cardWrapper}>
          <Row gutter={[16, 16]}>
            {/* 1. 真实业务卡片 */}
            <Col xs={24} sm={12} md={6}>
              <Card
                className={styles.dashCard}
                title="系统运行状态"
                bordered={false}
                hoverable
              >
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: '100%' }}
                >
                  <Statistic title="Agent 总数" value={data.agentTotal} />
                  <Statistic
                    title="在线 Agent"
                    value={data.agentOnline}
                    prefix={<Tag color="green">正常</Tag>}
                  />
                  <Statistic
                    title="离线 Agent"
                    value={data.agentOffline}
                    prefix={<Tag color="red">离线</Tag>}
                  />
                  <Statistic title="容器总数" value={data.containerTotal} />
                </Space>
              </Card>
            </Col>

            {/* 2. TODO 待开发 */}
            <Col xs={24} sm={12} md={6}>
              <Card
                className={styles.dashCard}
                title="容器监控"
                bordered={false}
                hoverable
              >
                <Statistic title="状态" value="待开发" />
                <div style={{ marginTop: 10 }}>
                  <Tag color="orange">即将上线</Tag>
                </div>
              </Card>
            </Col>

            {/* 3. TODO 待开发 */}
            <Col xs={24} sm={12} md={6}>
              <Card
                className={styles.dashCard}
                title="操作日志"
                bordered={false}
                hoverable
              >
                <Statistic title="状态" value="待开发" />
                <div style={{ marginTop: 10 }}>
                  <Tag color="orange">即将上线</Tag>
                </div>
              </Card>
            </Col>

            {/* 4. TODO 待开发 */}
            <Col xs={24} sm={12} md={6}>
              <Card
                className={styles.dashCard}
                title="批量操作"
                bordered={false}
                hoverable
              >
                <Statistic title="状态" value="待开发" />
                <div style={{ marginTop: 10 }}>
                  <Tag color="orange">即将上线</Tag>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </PageContainer>
  );
};

export default HomePage;
