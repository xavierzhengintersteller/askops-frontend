import { message } from 'antd';

/**
 * 统一处理请求错误（401静默、403提示、其他正常提示）
 * @param error 错误对象
 * @returns 是否被静默处理（401会返回true）
 */
export function handleRequestError(error: any) {
  // 401：token过期 → 静默处理，不弹窗
  if (error?.response?.status === 401 || error?.response?.data?.code === 401) {
    console.log('🔒 token 自动刷新中，静默处理');
    return true;
  }

  // 403：无权限
  if (error?.response?.data?.code === 403 || error?.code === 403) {
    message.error('没有权限执行此操作');
    return false;
  }

  // 其他错误
  message.error(error?.message || '操作失败');
  return false;
}
