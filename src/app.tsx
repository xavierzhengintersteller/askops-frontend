import RightContent from '@/layouts/components/RightContent';
import { updateRefreshToken } from '@/services/auth';
import type {
  RequestConfig,
  ResponseError,
  RunTimeLayoutConfig,
} from '@umijs/max';
import { history } from '@umijs/max';
import { message } from 'antd';

// ================= refresh token =================

let isRefreshing = false;
let queue: ((token: string) => void)[] = [];

const resolveQueue = (token: string) => {
  queue.forEach((cb) => cb(token));
  queue = [];
};

// ================= 菜单过滤 =================

function filterMenu(menuList: any[] = [], permissions: string[]) {
  return menuList
    .map((menu) => {
      const children = filterMenu(menu.children || [], permissions);

      const hasPermission =
        !menu.permissionCode || permissions.includes(menu.permissionCode);

      if (!hasPermission && children.length === 0) {
        return null;
      }

      return {
        path: menu.path,
        name: menu.permissionName,
        icon: menu.icon,
        children,
      };
    })
    .filter(Boolean);
}

// ================= getInitialState =================

export async function getInitialState() {
  const token = localStorage.getItem('accessToken');

  return {
    currentUser: token
      ? {
          token,
          username: localStorage.getItem('username'),
        }
      : null,
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

        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${newToken}`,
        };

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

// ================= layout =================

// ================= layout =================

export const layout: RunTimeLayoutConfig = ({ initialState }: any) => {
  return {
    title: 'AskOps',

    layout: 'mix',

    fixedHeader: true,

    fixSiderbar: true,

    splitMenus: false,

    siderWidth: 208,

    // ===== 右上角用户区域 =====
    rightContentRender: () => <RightContent />,

    menu: {
      locale: false,

      request: async () => {
        return filterMenu(
          initialState?.menuTree || [],
          initialState?.permissionCodes || [],
        );
      },
    },

    // ===== 登录页隐藏 layout =====

    menuRender: (props: any, defaultDom: any) => {
      if (props.location.pathname === '/user/login') {
        return false;
      }

      return defaultDom;
    },

    headerRender: (props: any, defaultDom: any) => {
      if (props.location.pathname === '/user/login') {
        return false;
      }

      return defaultDom;
    },

    footerRender: (props: any, defaultDom: any) => {
      if (props.location.pathname === '/user/login') {
        return false;
      }

      return defaultDom;
    },

    onPageChange: () => {
      const token = localStorage.getItem('accessToken');

      const pathname = history.location.pathname;

      if (!token && pathname !== '/user/login') {
        history.push('/user/login');
      }
    },
  };
};
