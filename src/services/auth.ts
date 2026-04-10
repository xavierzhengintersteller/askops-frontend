import { request } from '@umijs/max';

export async function login(data: { username: string; password: string }) {
  return request('/api/auth/login', {
    method: 'POST',
    data,
  });
}

export async function oldversion_updateRefreshToken(data: {
  refreshToken: string;
}) {
  // 调用刷新 token 接口
  const response = await request('/api/auth/token/refresh', {
    method: 'POST',
    params: data, // 匹配后端 @RequestParam 传参
  });
  return {
    accessToken: response.data, // 这里是核心修复！
  };
}
export async function updateRefreshToken(refreshToken: string) {
  return request('/api/auth/token/refresh', {
    method: 'POST',
    params: { refreshToken },
  });
}
// 获取用户菜单和权限
export async function fetchPermissionMenu() {
  return request('/api/user/permission-menu', {
    method: 'GET',
  });
}
