import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},

  request: {
    timeout: 10000,
  },

  layout: {
    title: 'AskOps',
  },

  proxy: {
    '/api': {
      target: 'http://192.168.2.13:8082',
      changeOrigin: true,
    },
  },
});
