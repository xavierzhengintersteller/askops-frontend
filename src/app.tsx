import { updateRefreshToken } from '@/services/auth';
import type {
  RequestConfig,
  RequestOptionsInit,
  ResponseError,
} from '@umijs/max';
import { history } from 'umi';

export async function getInitialState() {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    history.push('/user/login');
    return null;
  }

  try {
    const userInfo = await fetch('/api/auth/login').then((res) => res.json());
    return { currentUser: userInfo };
  } catch (error) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    history.push('/user/login');
    return null;
  }
}

export const request: RequestConfig = {
  requestInterceptors: [
    (url, options) => {
      const token = localStorage.getItem('accessToken');
      console.log('请求拦截器 - 携带的 token:', token);
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

  responseInterceptors: [
    async (response) => {
      const { data: responseData, status, config } = response;
      console.log('响应拦截器 - 原始响应:', { responseData, status });

      const isUnauthorized =
        status === 401 ||
        (responseData &&
          responseData.code === 401 &&
          /token invalid|token expired/i.test(responseData.message));

      if (isUnauthorized) {
        const refreshToken = localStorage.getItem('refreshToken');
        console.log('响应拦截器 - 获取到的 refreshToken:', refreshToken);

        if (!refreshToken) {
          console.warn('响应拦截器 - 无 refreshToken，直接跳转登录');
          // message.warning('登录已过期，请重新登录');
          localStorage.clear();
          history.push('/user/login');
          return Promise.reject({
            message: '无刷新令牌',
            response,
          } as ResponseError);
        }

        try {
          console.log('响应拦截器 - 开始调用刷新 token 接口');
          // 调用修复后的 updateRefreshToken
          const refreshRes = await updateRefreshToken({ refreshToken });
          console.log('响应拦截器 - 刷新 token 接口返回:', refreshRes);

          const newAccessToken = refreshRes?.accessToken;
          if (!newAccessToken) {
            throw new Error('刷新 token 失败：未返回新的 accessToken');
          }

          localStorage.setItem('accessToken', newAccessToken);
          // message.success('登录状态已刷新，正在重试请求...', 1);

          const { request } = await import('umi');
          const originalRequest = { ...config } as RequestOptionsInit;
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${newAccessToken}`,
          };
          console.log('响应拦截器 - 重新发起原请求:', originalRequest.url);

          const retryRes = await request(
            originalRequest.url as string,
            originalRequest,
          );
          return retryRes;
        } catch (refreshError) {
          console.error('响应拦截器 - 刷新 token 失败:', refreshError);
          // message.error('登录已过期，请重新登录');
          localStorage.clear();
          history.push('/user/login');
          return Promise.reject({
            message: '刷新 token 失败',
            error: refreshError,
            response,
          } as ResponseError);
        }
      }

      return response;
    },
  ],

  errorConfig: {
    errorHandler: (error: ResponseError) => {
      if (
        error.message.includes('刷新 token 失败') ||
        error.message.includes('无刷新令牌')
      ) {
        return;
      }
      console.error('请求错误兜底:', error);
    },
  },
};
