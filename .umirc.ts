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
    title: '@umijs/ma2x',
  },

  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      path: '/user/login',
      component: './user/Login',
      layout: false,
      hideInMenu: true,
    },
    {
      name: '首页',
      path: '/home',
      component: './home',
    },
    {
      name: '容器管理',
      path: '/container',
      component: './container',
    },
    {
      name: '系统管理',
      path: '/admin',
      component: './admin',
      routes: [
        { path: '/admin', redirect: '/admin/user' },
        { name: '用户管理', path: '/admin/user', component: './admin/user' },
        { name: '角色管理', path: '/admin/role', component: './admin/role' },
      ],
    },
  ],

  npmClient: 'npm',
});
