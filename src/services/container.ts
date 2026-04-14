import { message } from 'antd';
import { request } from 'umi';
export interface Container {
  Id: string;
  Names?: string[];
  Image: string;
  State: string;
  Status: string;
  nodeIp?: string;
  Created: number;
  Command: string;
}

export interface ContainerResponse {
  code: number;
  message: string;
  data: Container[] | string | null;
}

// 重启参数
export interface RestartContainerParams {
  containerName: string;
  nodeIp: string;
}

// 批量重启
export interface BatchRestartContainerRequest {
  containerItems: {
    containerName: string;
    nodeIp: string;
  }[];
}

export interface BatchRestartContainerResponse {
  total: number;
  success: number;
  fail: number;
  results: {
    containerName: string;
    nodeIp: string;
    success: boolean;
    message?: string;
  }[];
}

// ==========================
// 获取容器列表（支持多选节点 + manual）
// ==========================
export async function getContainers(
  nodeIps?: string[],
  manual: boolean = false,
) {
  const params = nodeIps?.length
    ? { nodeIps: nodeIps.join(','), manual }
    : { manual };

  const response = await request<ContainerResponse>(
    '/api/containers/containers',
    {
      method: 'GET',
      params,
    },
  );

  // 无可用节点提示
  if (response?.code === 100001) {
    // message.warning(response.message);
    return [];
  }

  // 解析字符串格式数据
  if (response?.data && typeof response.data === 'string') {
    try {
      return JSON.parse(response.data);
    } catch (e) {
      console.error('解析容器列表失败', e);
      return [];
    }
  }

  return response?.data || [];
}

// ==========================
// 获取节点列表
// ==========================
export async function getNodeList() {
  const res = await request('/api/agent/nodes', {
    method: 'GET',
  });

  // ✅ 全局统一：只要不是 0，都提示 message
  if (res.code !== 0) {
    message.warning(res.message);
  }

  return res;
}

// ==========================
// 重启单个容器
// ==========================
export async function restartContainer(params: RestartContainerParams) {
  return request('/api/containers/restart', {
    method: 'POST',
    data: params,
  });
}

// ==========================
// 批量重启
// ==========================
export async function batchRestartContainers(
  params: BatchRestartContainerRequest,
) {
  return request('/api/containers/batch-restart', {
    method: 'POST',
    data: params,
  });
}
