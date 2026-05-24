import { updateRefreshToken } from '@/services/auth';
import type { RequestConfig, ResponseError } from '@umijs/max';
import { history } from '@umijs/max';
import { message } from 'antd';

// ================= refresh token =================
let isRefreshing = false;
let queue: ((t: string) => void)[] = [];

const resolveQueue = (token: string) => {
  queue.forEach((cb) => cb(token));
  queue = [];
};

// ================= 菜单过滤（提前定义，解决 ESLint 错误） =================
function filterMenu(menuList: any[] = [], permissions: string[]) {
  return menuList
    .map((menu) => {
      const children = filterMenu(menu.children || [], permissions);
      const hasPermission =
        !menu.permissionCode || permissions.includes(menu.permissionCode);
      if (!hasPermission && children.length === 0) return null;
      return {
        path: menu.path,
        name: menu.permissionName,
        icon: menu.icon,
        children,
      };
    })
    .filter((m): m is any => m !== null);
}

// ================= getInitialState =================
export async function getInitialState() {
  const token = localStorage.getItem('accessToken');

  return {
    currentUser: token ? { token } : null,
    menuTree: JSON.parse(localStorage.getItem('menuTree') || '[]'),
    permissionCodes: JSON.parse(
      localStorage.getItem('permissionCodes') || '[]',
    ),
  };
}

// ================= request =================
export const request: RequestConfig = {
  requestInterceptors: [
    (url, options) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return { url, options };
    },
  ],

  errorConfig: {
    errorHandler: async (err: ResponseError) => {
      const { response, config } = err;

      if (!response || response.status !== 401) {
        message.error(err.message || '请求失败');
        return;
      }

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        localStorage.clear();
        history.push('/user/login');
        return;
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${token}`,
            };
            import('@umijs/max').then(({ request }) => {
              resolve(request(config.url!, config));
            });
          });
        });
      }

      isRefreshing = true;

      try {
        const res = await updateRefreshToken(refreshToken);
        const newToken = res.data;

        localStorage.setItem('accessToken', newToken);
        resolveQueue(newToken);

        const { request } = await import('@umijs/max');
        return request(config.url!, config);
      } catch (e) {
        localStorage.clear();
        history.push('/user/login');
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    },
  },
};

// ================= layout（完全修复版） =================
export const layout = ({ initialState }: any) => {
  return {
    // 登录页关闭布局
    layout: (location: any) => {
      if (location?.pathname === '/user/login') return false;
      return 'mix';
    },

    menu: {
      locale: false,
      request: async () => {
        return filterMenu(
          initialState?.menuTree || [],
          initialState?.permissionCodes || [],
        );
      },
    },

    // 修复：onPageChange 直接接收 location，不是 { location }
    onPageChange: (location: any) => {
      const token = localStorage.getItem('accessToken');
      if (!token && location?.pathname !== '/user/login') {
        history.push('/user/login');
      }
    },
  };
};
