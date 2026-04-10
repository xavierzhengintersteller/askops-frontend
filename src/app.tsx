import { updateRefreshToken } from '@/services/auth';
import type { RequestConfig, ResponseError } from '@umijs/max';
import { message } from 'antd';
import { history } from 'umi';

// 防重复刷新锁
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addSubscriber = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

// ==============================================
// 全局初始化
// ==============================================
export async function getInitialState() {
  try {
    console.log('【初始化】从 localStorage 读取登录状态');

    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const menuTreeStr = localStorage.getItem('menuTree');
    const permissionCodesStr = localStorage.getItem('permissionCodes');

    if (!token) {
      console.log('【初始化】无 accessToken，跳转到登录');
      history.push('/user/login');
      return {
        currentUser: null,
        menuTree: [],
        permissionCodes: [],
      };
    }

    const menuTree = menuTreeStr ? JSON.parse(menuTreeStr) : [];
    const permissionCodes = permissionCodesStr
      ? JSON.parse(permissionCodesStr)
      : [];

    console.log('【初始化】已加载用户、菜单、权限');
    return {
      currentUser: { token, refreshToken },
      menuTree,
      permissionCodes,
    };
  } catch (err) {
    console.error('【初始化异常】', err);
    localStorage.clear();
    history.push('/user/login');
    return {
      currentUser: null,
      menuTree: [],
      permissionCodes: [],
    };
  }
}

// ==============================================
// 请求配置
// ==============================================
export const request: RequestConfig = {
  requestInterceptors: [
    (url, options) => {
      const token = localStorage.getItem('accessToken');
      console.log(`【请求】${url}`, token ? '携带token' : '无token');
      if (token) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return { url, options };
    },
  ],

  responseInterceptors: [
    (response) => {
      const { status } = response;
      const url = response.config?.url;
      console.log(`【响应】${url} 状态码：${status}`);
      return response;
    },
  ],

  errorConfig: {
    errorHandler: async (err: ResponseError) => {
      const { response, config } = err;
      // 1. 非401错误，正常打印日志
      if (!response || response.status !== 401) {
        console.error('【请求异常】', err);
        // 仅对非401业务错误弹窗
        if (!err.message.includes('401')) {
          message.error(err.message || '请求失败');
        }
        return;
      }

      const url = config?.url || '';
      // 2. 登录/刷新接口401，直接跳转登录
      if (url.includes('/auth/login') || url.includes('/auth/token/refresh')) {
        console.warn('【401】登录/刷新接口401，跳转登录');
        message.error('登录已过期，请重新登录');
        localStorage.clear();
        history.push('/user/login');
        return;
      }

      console.warn('【401】token 已过期，开始自动刷新');
      const refreshToken = localStorage.getItem('refreshToken');

      // 3. 无refreshToken，跳转登录
      if (!refreshToken) {
        console.error('【401】无 refreshToken，跳转登录');
        message.error('登录已过期，请重新登录');
        localStorage.clear();
        history.push('/user/login');
        return;
      }

      // 4. 正在刷新，加入队列
      if (isRefreshing) {
        return new Promise((resolve) => {
          addSubscriber((token) => {
            config.headers.Authorization = `Bearer ${token}`;
            import('umi').then(({ request }) => {
              resolve(request(config.url!, config));
            });
          });
        });
      }

      // 5. 开始刷新token
      isRefreshing = true;
      // 静默刷新，不弹错误
      message.loading({
        content: '登录状态刷新中...',
        key: 'refresh',
        duration: 0,
      });

      try {
        console.log('【刷新】调用刷新token接口');
        const refreshRes = await updateRefreshToken(refreshToken);
        const newToken = refreshRes.data;

        if (!newToken) {
          throw new Error('刷新失败：未获取到新accessToken');
        }

        localStorage.setItem('accessToken', newToken);
        console.log('【刷新】已更新本地 accessToken', newToken);

        onRefreshed(newToken);
        config.headers.Authorization = `Bearer ${newToken}`;

        // 刷新成功，关闭loading
        message.destroy('refresh');

        // 动态导入request，重试请求
        const { request: umiRequest } = await import('umi');
        return umiRequest(config.url!, config);
      } catch (e) {
        console.error('【刷新异常】刷新token失败：', e);
        // 刷新失败，关闭loading，提示用户
        message.destroy('refresh');
        message.error('登录已过期，请重新登录');
        localStorage.clear();
        history.push('/user/login');
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    },
  },
};
