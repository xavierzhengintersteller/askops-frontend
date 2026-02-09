import type { RequestConfig } from '@umijs/max';
import { message } from 'antd';
import { history } from 'umi';

// 运行时配置

// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
// 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate
// src/app.tsx
export async function getInitialState() {
  const token = localStorage.getItem('token');
  if (!token) {
    history.push('/user/login');
    return null;
  }

  // 替换为真实 API 调用
  try {
    const userInfo = await fetch('/api/auth/login').then((res) => res.json());
    return { currentUser: userInfo };
  } catch (error) {
    return null;
  }
}

export const request: RequestConfig = {
  // 全局请求前拦截
  requestInterceptors: [
    (url, options) => {
      const token = localStorage.getItem('token'); // 或从 initialState 获取
      return {
        url,
        options: {
          ...options,
          headers: {
            ...options.headers,
            Authorization: token ? `Bearer ${token}` : '',
          },
        },
      };
    },
  ],

  // 全局响应拦截
  responseInterceptors: [
    async (response) => {
      if (response.status === 401) {
        message.warning('未登录或登录过期，请重新登录');
        history.push('/login'); // 跳转登录页
        return Promise.reject({ message: 'Unauthorized', response });
      }
      return response;
    },
  ],
};
