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

/** 使用 Server-Sent Events 订阅容器实时日志 */
export function streamContainerLogs(
  name: string,
  onMessage: (data: string) => void,
  onError?: (err: any) => void,
) {
  const url = `/api/containers/${name}/logs/stream`;
  const es = new EventSource(url);
  es.onmessage = (e) => {
    onMessage(e.data);
  };
  es.onerror = (err) => {
    if (onError) onError(err);
  };
  return es;
}

/** 使用 fetch + ReadableStream 来订阅实时日志（允许自定义 headers，例如 Authorization） */
export function streamContainerLogsFetch(
  name: string,
  onMessage: (data: string) => void,
  onError?: (err: any) => void,
) {
  const url = `/api/containers/${name}/logs/stream`;
  const controller = new AbortController();
  const token = localStorage.getItem('token');

  fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        // try to parse error body
        try {
          const errBody = await res.json();
          if (onError) onError(errBody);
        } catch (e) {
          if (onError) onError(new Error(`HTTP ${res.status}`));
        }
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // split by newline and emit lines
        const parts = buffer.split(/\r?\n/);
        buffer = parts.pop() || '';
        for (const part of parts) {
          if (part) onMessage(part);
        }
      }
      if (buffer) onMessage(buffer);
    })
    .catch((err) => {
      if (err.name === 'AbortError') return;
      if (onError) onError(err);
    });

  return {
    abort: () => controller.abort(),
  };
}

/** 获取容器最近固定行数的日志 GET /api/containers/{name}/logs/raws */
export async function getContainerLogsRaw(
  name: string,
  options?: { [key: string]: any },
) {
  const res = await request<any>(`/api/containers/${name}/logs/raws`, {
    method: 'GET',
    ...(options || {}),
  });

  // Normalize response to a single text string
  try {
    if (!res) return '';

    // If backend returns plain string
    if (typeof res === 'string') return res;

    // If backend returns { code, message, data }
    const payload = res.data ?? res;

    // If data is an array
    if (Array.isArray(payload)) {
      // payload might be an array with a single JSON-string element
      if (payload.length === 1 && typeof payload[0] === 'string') {
        const first = payload[0];
        // try parse if it's a JSON string representing array
        if (first.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(first);
            if (Array.isArray(parsed)) return parsed.join('');
          } catch (e) {
            // fallback: return the first string
            return first;
          }
        }
        // otherwise join array elements
        return payload.join('');
      }

      // If payload is array of strings
      if (payload.every((p) => typeof p === 'string')) {
        return payload.join('');
      }
    }

    // If data is a JSON string
    if (typeof payload === 'string') {
      // try parse
      try {
        const parsed = JSON.parse(payload);
        if (Array.isArray(parsed)) return parsed.join('');
        if (typeof parsed === 'string') return parsed;
      } catch (e) {
        return payload;
      }
    }

    // Fallback: stringify entire response
    return JSON.stringify(res);
  } catch (e) {
    console.error('Failed to normalize raw logs response', e);
    return '';
  }
}
