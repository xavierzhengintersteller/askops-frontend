import { request } from '@umijs/max';
// 用户列表项类型（完全和你的 API 对应）
export interface UserItem {
  userId: number;
  username: string;
  enabled: boolean;
  roleNames: string[];
  roleIds: number[];
  groups: {
    groupId: number;
    groupName: string;
  }[];
  agents: {
    agentId: number;
    ip: string;
    name: string;
    port: number;
    groupId: number;
  }[];
}

// 接口返回格式
export interface UserListResponse {
  code: number;
  message: string;
  data: UserItem[];
}

// 角色类型
export interface RoleItem {
  id: number;
  roleName: string;
  roleCode: string;
}
// 获取用户列表（带类型）
export async function listUser(): Promise<UserListResponse> {
  return request('/api/admin/user/list');
}
// 新增用户
export async function addUser(data: AddUserParams) {
  return request('/api/admin/user/add', {
    method: 'POST',
    data,
  });
}

// 类型
export interface AddUserParams {
  username: string;
  password: string;
  roleIds: number[];
}

// 获取角色列表
export async function listRole(): Promise<{
  code: number;
  message: string;
  data: RoleItem[];
}> {
  return request('/api/admin/role/list');
}
// 拉黑/解禁用户
export async function blacklistUser(data: BlacklistUserDTO) {
  return request('/api/admin/user/blacklist', {
    method: 'POST',
    data,
  });
}

// 删除用户
export async function deleteUser(id: number) {
  return request(`/api/admin/user/delete/${id}`, {
    method: 'POST',
  });
}

// 重置密码
export async function updateUserPassword(data: UpdateUserPwdDTO) {
  return request('/api/admin/user/update-password', {
    method: 'POST',
    data,
  });
}
// 对应类型
export interface BlacklistUserDTO {
  userId: number;
  enabled: boolean;
}

export interface UpdateUserPwdDTO {
  userId: number;
  newPassword: string;
}
// 给用户分配角色（新增）
export async function assignUserRole(data: AssignRoleDTO) {
  return request('/api/admin/user/assign-role', {
    method: 'POST',
    data,
  });
}

// 类型
export interface AssignRoleDTO {
  userId: number;
  roleIds: number[];
}
