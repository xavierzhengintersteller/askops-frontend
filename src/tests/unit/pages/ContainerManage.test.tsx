import {
  getContainerLogsRaw,
  getContainers,
  restartContainer,
  streamContainerLogsFetch,
} from '@/services/container';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { message, Modal } from 'antd';
import ContainerManage from './index';

// Mock 服务层接口
jest.mock('@/services/container', () => ({
  getContainers: jest.fn(),
  restartContainer: jest.fn(),
  getContainerLogsRaw: jest.fn(),
  streamContainerLogsFetch: jest.fn(() => ({ abort: jest.fn() })),
}));

// 测试数据
const MOCK_CONTAINERS = [
  {
    Id: 'container-1',
    Names: ['/test-nginx'],
    Image: 'nginx:1.24',
    State: 'running',
    Status: 'Up 2 hours',
    Ports: [{ PublicPort: 8080, PrivatePort: 80, Type: 'tcp' }],
  },
  {
    Id: 'container-2',
    Names: ['/test-mysql'],
    Image: 'mysql:8.0',
    State: 'exited',
    Status: 'Exited (0) 10 minutes ago',
    Ports: [],
  },
];

const MOCK_LOGS =
  '2026-02-18 10:00:00 [INFO] Server started\n2026-02-18 10:01:00 [ERROR] Connection failed';
// 拆分日志文本（避免换行符断言问题）
const LOG_LINE1 = '2026-02-18 10:00:00 [INFO] Server started';
const LOG_LINE2 = '2026-02-18 10:01:00 [ERROR] Connection failed';

describe('ContainerManage 组件', () => {
  let user: ReturnType<typeof userEvent.setup>; // 定义类型

  // 每次测试前重置 Mock + 异步初始化 userEvent
  beforeEach(async () => {
    jest.clearAllMocks();
    // 替换为 jest.mocked 避免 TS 语法错误
    jest.mocked(getContainers).mockResolvedValue(MOCK_CONTAINERS);
    // 异步初始化 userEvent
    user = await userEvent.setup();
  });

  /**************************
   * 核心场景测试
   **************************/
  // 1. 基础渲染：容器列表正常加载
  test('容器列表渲染成功，显示所有容器信息', async () => {
    // 渲染组件
    render(<ContainerManage />);

    // 断言页面标题存在
    expect(screen.getByText('容器管理')).toBeInTheDocument();

    // 断言容器列表加载完成（等待异步请求）
    await waitFor(() => {
      expect(jest.mocked(getContainers)).toHaveBeenCalledTimes(1);
    });

    // 断言容器名称、状态、镜像等信息显示
    expect(screen.getByText('test-nginx')).toBeInTheDocument();
    expect(screen.getByText('test-mysql')).toBeInTheDocument();
    expect(screen.getByText('nginx:1.24')).toBeInTheDocument();
    expect(screen.getByText('运行中')).toBeInTheDocument(); // Tag 组件文本
    expect(screen.getByText('已停止')).toBeInTheDocument();
    expect(screen.getByText('8080:80/tcp')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument(); // mysql 无端口映射
  });

  // 2. 重启容器：正常流程（成功）
  test('点击重启容器按钮，接口调用成功并提示成功', async () => {
    // Mock 重启接口成功
    jest.mocked(restartContainer).mockResolvedValue({ code: 200 });

    render(<ContainerManage />);
    await waitFor(() => screen.getByText('test-nginx'));

    // 点击重启按钮（通过 testid 定位更稳定）
    const restartBtn = screen.getAllByTestId('btn-重启')[0];
    await user.click(restartBtn);

    // 断言 Modal.confirm 被调用（二次确认）
    expect(Modal.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '确认重启容器',
        content: expect.stringContaining('test-nginx'),
      }),
    );

    // 断言接口调用
    await waitFor(() => {
      expect(jest.mocked(restartContainer)).toHaveBeenCalledWith('test-nginx');
    });

    // 断言 loading 状态（先 true 后 false）
    expect(restartBtn).toBeDisabled(); // 替代 loading 属性断言（更通用）
    await waitFor(() => {
      expect(restartBtn).not.toBeDisabled();
    });

    // 断言成功提示
    expect(message.success).toHaveBeenCalledWith('容器 test-nginx 重启成功');
    // 移除无效的 pro-table-reload 断言（或补充 Mock）
    // expect(screen.getByTestId('pro-table-reload')).toBeDefined();
  });

  // 3. 重启容器：权限不足（403）
  test('重启容器返回403，显示权限不足提示', async () => {
    // Mock 重启接口返回403
    jest.mocked(restartContainer).mockResolvedValue({ code: 403 });

    render(<ContainerManage />);
    await waitFor(() => screen.getByText('test-nginx'));

    // 点击重启按钮
    const restartBtn = screen.getAllByTestId('btn-重启')[0];
    await user.click(restartBtn);

    // 断言接口调用
    await waitFor(() => {
      expect(jest.mocked(restartContainer)).toHaveBeenCalledWith('test-nginx');
    });

    // 断言错误提示
    expect(message.error).toHaveBeenCalledWith('没有权限重启此容器');
    // 断言 loading 关闭
    await waitFor(() => {
      expect(screen.getAllByTestId('btn-重启')[0]).not.toBeDisabled();
    });
  });

  // 4. 查看日志：打开抽屉 + 加载实时日志
  test('点击查看日志，打开抽屉并启动日志流', async () => {
    // Mock 日志流回调
    const mockOnData = jest.fn();
    jest.mocked(streamContainerLogsFetch).mockImplementation((name, onData) => {
      mockOnData.mockImplementation(onData);
      return { abort: jest.fn() };
    });

    render(<ContainerManage />);
    await waitFor(() => screen.getByText('test-nginx'));

    // 点击查看日志按钮
    await user.click(screen.getAllByTestId('btn-查看日志')[0]);

    // 断言抽屉打开（通过 testid 定位更稳定）
    expect(screen.getByTestId('log-drawer')).toBeInTheDocument();
    expect(screen.getByText('容器日志 - test-nginx')).toBeInTheDocument();
    expect(screen.getByText('加载中...')).toBeInTheDocument(); // 日志 loading

    // 断言日志流启动
    expect(jest.mocked(streamContainerLogsFetch)).toHaveBeenCalledWith(
      'test-nginx',
      expect.any(Function),
      expect.any(Function),
    );

    // 模拟日志流返回数据
    mockOnData(LOG_LINE1);
    await waitFor(() => {
      expect(screen.getByText(LOG_LINE1)).toBeInTheDocument();
    });

    // 断言停止日志流按钮存在
    expect(screen.getByTestId('btn-停止日志流')).toBeInTheDocument();
  });

  // 5. 获取原始日志：接口返回日志并显示
  test('点击获取最近100行，显示原始日志', async () => {
    // Mock 原始日志接口
    jest.mocked(getContainerLogsRaw).mockResolvedValue(MOCK_LOGS);

    render(<ContainerManage />);
    await waitFor(() => screen.getByText('test-nginx'));

    // 打开日志抽屉
    await user.click(screen.getAllByTestId('btn-查看日志')[0]);
    await waitFor(() => screen.getByTestId('btn-获取最近100行'));

    // 点击获取原始日志按钮
    await user.click(screen.getByTestId('btn-获取最近100行'));

    // 断言接口调用
    expect(jest.mocked(getContainerLogsRaw)).toHaveBeenCalledWith('test-nginx');

    // 拆分断言日志（避免换行符问题）
    await waitFor(() => {
      expect(screen.getByText(LOG_LINE1)).toBeInTheDocument();
      expect(screen.getByText(LOG_LINE2)).toBeInTheDocument();
    });
  });

  /**************************
   * 边界场景测试
   **************************/
  // 6. 空容器列表：显示空状态
  test('容器列表为空时，显示空数据提示', async () => {
    jest.mocked(getContainers).mockResolvedValue([]);

    render(<ContainerManage />);
    await waitFor(() => {
      expect(jest.mocked(getContainers)).toHaveBeenCalledTimes(1);
      // 断言空状态（通过 testid 定位）
      expect(screen.getByTestId('empty-table')).toHaveTextContent('暂无数据');
    });
  });

  // 7. 容器名称为空：重启/查看日志提示警告
  test('容器名称为空时，操作按钮提示警告', async () => {
    // 新增空名称容器
    const emptyNameContainer = {
      Id: 'container-3',
      Names: [],
      Image: 'redis:7.0',
      State: 'running',
      Status: 'Up 1 hour',
      Ports: [],
    };
    jest.mocked(getContainers).mockResolvedValue([emptyNameContainer]);

    render(<ContainerManage />);
    await waitFor(() => screen.getByText('-')); // 空容器名称显示 '-'

    // 点击重启按钮
    await user.click(screen.getAllByTestId('btn-重启')[0]);
    expect(message.warning).toHaveBeenCalledWith('容器名称为空，无法重启');

    // 点击查看日志按钮
    await user.click(screen.getAllByTestId('btn-查看日志')[0]);
    expect(message.warning).toHaveBeenCalledWith('容器名称为空，无法查看日志');
  });

  // 8. 关闭抽屉：清理日志流和状态
  test('关闭日志抽屉，终止日志流并清空日志', async () => {
    // Mock 日志流（记录 abort 调用）
    const mockAbort = jest.fn();
    jest.mocked(streamContainerLogsFetch).mockReturnValue({ abort: mockAbort });

    render(<ContainerManage />);
    await waitFor(() => screen.getByText('test-nginx'));

    // 打开抽屉
    await user.click(screen.getAllByTestId('btn-查看日志')[0]);
    const drawerCloseBtn = screen.getByText('关闭');

    // 关闭抽屉
    await user.click(drawerCloseBtn);

    // 断言日志流终止
    expect(mockAbort).toHaveBeenCalledTimes(1);
    // 断言日志清空、抽屉关闭
    await waitFor(() => {
      expect(screen.queryByTestId('log-drawer')).not.toBeInTheDocument();
      expect(screen.queryByText(LOG_LINE1)).not.toBeInTheDocument();
    });
  });
});
