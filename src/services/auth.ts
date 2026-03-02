import { request } from '@umijs/max';

export async function login(data: { username: string; password: string }) {
  return request('/api/auth/login', {
    method: 'POST',
    data,
  });
}

export async function updateRefreshToken(data: { refreshToken: string }) {
  // 调用刷新 token 接口
  const response = await request('/api/auth/token/refresh', {
    method: 'POST',
    params: data, // 匹配后端 @RequestParam 传参
  });

  // 重点：把后端返回的 data 字段（新token）赋值给 accessToken
  // 日志中 response 结构是 {code:0, message:'success', data:'新token'}
  return {
    accessToken: response.data, // 这里是核心修复！
  };
}
