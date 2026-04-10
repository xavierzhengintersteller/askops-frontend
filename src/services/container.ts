import { request } from '@umijs/max';

export interface Container {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  State: string;
  Status: string;
  nodeIp?: string; // 新增：节点IP
  Ports?: Array<{
    PrivatePort: number;
    PublicPort: number;
    Type: string;
  }>;
  Mounts?: any[];
  Created: number;
  Labels?: Record<string, string>;
}

export interface ContainerResponse {
  code: number;
  message: string;
  data: string;
}

// ==========================
// 1. 获取容器列表
// ==========================
export async function getContainers(options?: { [key: string]: any }) {
  const response = await request<ContainerResponse>(
    '/api/containers/containers',
    {
      method: 'GET',
      ...(options || {}),
    },
  );

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
// 2. 单个重启（POST + JSON Body）
// ==========================
export async function restartContainer(data: {
  containerName: string;
  nodeIp: string;
}) {
  return request('/api/containers/restart', {
    method: 'POST',
    data,
  });
}

// ==========================
// 3. 批量重启
// ==========================
export async function batchRestartContainers(data: {
  containerItems: Array<{ containerName: string; nodeIp: string }>;
}) {
  return request('/api/containers/batch-restart', {
    method: 'POST',
    data,
  });
}

// 获取节点列表
export async function getNodeList() {
  return request('/api/agent/nodes', {
    method: 'GET',
  });
}

// 获取容器列表（支持 nodeIp 参数）
// export async function getContainers(nodeIp?: string) {
//   return request('/api/containers/containers', {
//     method: 'GET',
//     params: { nodeIp },
//   });
// }
