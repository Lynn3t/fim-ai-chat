/**
 * 用户角色类型定义
 * 替代 Prisma enum，因为 SQLite 不支持原生 enum
 */

export const UserRole = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  GUEST: 'GUEST',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * 角色显示名称映射
 */
export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: '管理员',
  [UserRole.USER]: '普通用户',
  [UserRole.GUEST]: '访客',
};

/**
 * 验证角色值是否有效
 */
export function isValidUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

/**
 * 获取角色显示名称
 */
export function getUserRoleLabel(role: UserRole): string {
  return UserRoleLabels[role] || role;
}

/**
 * 角色权限等级
 */
export const RolePriority: Record<UserRole, number> = {
  [UserRole.ADMIN]: 3,
  [UserRole.USER]: 2,
  [UserRole.GUEST]: 1,
};

/**
 * 检查角色权限等级
 */
export function hasHigherRole(role1: UserRole, role2: UserRole): boolean {
  return RolePriority[role1] > RolePriority[role2];
}
