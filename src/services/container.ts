import { request } from '@umijs/max';

export interface Container {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  State: string;
  Status: string;
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
  data: string; // JSON string
}

/** 获取容器列表 GET /api/containers/containers */
export async function getContainers(options?: { [key: string]: any }) {
  const response = await request<ContainerResponse>(
    '/api/containers/containers',
    {
      method: 'GET',
      ...(options || {}),
    },
  );

  // Parse the data field if it's a JSON string
  if (response?.data && typeof response.data === 'string') {
    try {
      response.data = JSON.parse(response.data);
    } catch (e) {
      console.error('Failed to parse container data:', e);
      response.data = [];
    }
  }

  return response?.data || [];
}

/** 重启容器 POST /api/containers/restart/{name} */
export async function restartContainer(
  name: string,
  options?: { [key: string]: any },
) {
  return request<any>(`/api/containers/restart/${name}`, {
    method: 'POST',
    ...(options || {}),
  });
}

/** 获取容器日志 POST /api/containers/{name}/logs/stream */
export async function getContainerLogs(
  name: string,
  params?: {
    tail?: number;
    follow?: boolean;
  },
  options?: { [key: string]: any },
) {
  return request<string>(`/api/containers/${name}/logs/stream`, {
    method: 'GET',
    params: params || {},
    ...(options || {}),
  });
}
