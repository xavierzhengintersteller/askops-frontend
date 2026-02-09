import { defineConfig } from '@umijs/max';

export default defineConfig({
  proxy: {
    '/api': {
      target: 'http://192.168.2.13:8082',
      changeOrigin: true,
      // pathRewrite: { '^/api': '' },
    },
  },

  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {
    timeout: 10000,
  },

  layout: {
    title: '@umijs/max',
  },

  routes: [
    {
      path: '/',
      redirect: '/homeee',
    },
    {
      path: '/user/login',
      component: './user/Login',
      layout: false,
      hideInMenu: true,
    },
    {
      name: '首页',
      path: '/homeee',
      component: './Homeee',
    },
    {
      name: '权限演示',
      path: '/access',
      component: './Access',
    },
    {
      name: 'CRUD 示例',
      path: '/table',
      component: './Table',
    },
  ],

  npmClient: 'npm',
});
