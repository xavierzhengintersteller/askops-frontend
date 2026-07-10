import { message } from 'antd';
import { request } from 'umi';

// 单条容器记录（匹配后端列表records结构）
export interface Container {
  nodeIp: string;
  containerId: string;
  shortId: string;
  containerName: string;
  image: string;
  imageId: string | null;
  state: string;
  status: string;
  createdAt: string;
  lastSeenTime: string;
  ports: any[] | null;
  command: string;
}
export interface ContainerQueryDTO {
  nodeIps?: string[];
  manual: boolean;
  pageNum: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}
// 容器列表分页外层响应
export interface ContainerPageResp {
  code: number;
  message: string;
  data: {
    records: Container[];
    total: number;
    pageNum: number;
    pageSize: number;
    pages: number;
  };
}

// 容器详情原始Podman结构
export interface ContainerDetailRaw {
  Id: string;
  Created: string;
  Name: string;
  State: {
    Status: string;
    Running: boolean;
    StartedAt: string;
  };
  Image: string;
  Config: {
    Cmd: string[];
    Env: string[];
  };
}

export interface DetailResp {
  code: number;
  message: string;
  data: ContainerDetailRaw;
}

// 单重启入参（后端接口接收containerId）
export interface RestartContainerParams {
  containerId: string;
  nodeIp: string;
}

// 批量提交入参
export interface BatchRestartSubmitReq {
  containerItems: Array<{
    containerId: string;
    nodeIp: string;
  }>;
}

// 同步批量接口返回结构（和你给出的示例一致）
export interface BatchRestartSyncResp {
  total: number;
  success: number;
  fail: number;
  results: Array<{
    containerName: string;
    nodeIp: string;
    success: boolean;
    message: string;
  }>;
}

/**
 * 分页查询容器列表 GET /containers @ModelAttribute
 */
export async function getContainers(params: ContainerQueryDTO) {
  return request.get('/containers', {
    params,
    // axios 原生配置，无需引入 qs
    paramsSerializer: {
      indexes: null, // 数组拼接成 nodeIps=xx&nodeIps=yy，适配后端 @ModelAttribute List
    },
  });
}

// ===================== 2. 获取容器详情 =====================
export async function getContainerDetail(nodeIp: string, containerId: string) {
  const res = await request<DetailResp>('/api/containers/container/detail', {
    method: 'GET',
    params: { nodeIp, containerId },
  });
  if (res.code !== 0) {
    message.error(res.message);
    return null;
  }
  return res.data;
}

// ===================== 3. 单个容器重启 =====================
export async function restartContainer(req: RestartContainerParams) {
  return request('/api/containers/restart', {
    method: 'POST',
    data: req,
  });
}

// ===================== 4. 同步批量重启（无SSE，直接返回结果） =====================
export async function batchRestartContainers(req: BatchRestartSubmitReq) {
  return request<BatchRestartSyncResp>('/api/containers/restart-batch', {
    method: 'POST',
    data: req,
  });
}

// ===================== 获取节点列表 =====================
export async function getNodeList() {
  const res = await request('/api/containers/nodes', { method: 'GET' });
  if (res.code !== 0) message.warning(res.message);
  return res;
}
