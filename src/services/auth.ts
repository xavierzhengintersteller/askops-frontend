import { request } from '@umijs/max';

export async function login(data: { username: string; password: string }) {
  return request('/api/auth/login', {
    method: 'POST',
    data,
  });
}
