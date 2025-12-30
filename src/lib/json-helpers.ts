/**
 * JSON 字段辅助函数
 * SQLite 不支持原生 JSON 类型，需要手动序列化/反序列化
 */

/**
 * 安全解析 JSON 字符串
 */
export function safeJsonParse<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue
  
  try {
    return JSON.parse(value) as T
  } catch (error) {
    console.error('JSON parse error:', error)
    return defaultValue
  }
}

/**
 * 安全序列化为 JSON 字符串
 */
export function safeJsonStringify<T>(value: T): string {
  try {
    return JSON.stringify(value)
  } catch (error) {
    console.error('JSON stringify error:', error)
    return JSON.stringify(null)
  }
}

/**
 * UserPermission.permissions 字段辅助函数
 */
export const PermissionsHelper = {
  parse: (value: string | null | undefined): string[] => {
    return safeJsonParse<string[]>(value, [])
  },
  
  stringify: (permissions: string[]): string => {
    return safeJsonStringify(permissions)
  },
  
  hasPermission: (permissionsJson: string | null | undefined, permission: string): boolean => {
    const permissions = PermissionsHelper.parse(permissionsJson)
    return permissions.includes(permission)
  },
  
  addPermission: (permissionsJson: string | null | undefined, permission: string): string => {
    const permissions = PermissionsHelper.parse(permissionsJson)
    if (!permissions.includes(permission)) {
      permissions.push(permission)
    }
    return PermissionsHelper.stringify(permissions)
  },
  
  removePermission: (permissionsJson: string | null | undefined, permission: string): string => {
    const permissions = PermissionsHelper.parse(permissionsJson)
    const filtered = permissions.filter(p => p !== permission)
    return PermissionsHelper.stringify(filtered)
  }
}

/**
 * Message.tokenUsage 字段辅助函数
 */
export interface TokenUsageData {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

export const TokenUsageHelper = {
  parse: (value: string | null | undefined): TokenUsageData | null => {
    return safeJsonParse<TokenUsageData | null>(value, null)
  },
  
  stringify: (tokenUsage: TokenUsageData | null): string => {
    return safeJsonStringify(tokenUsage)
  }
}

/**
 * 使用示例：
 * 
 * // 读取权限
 * const user = await prisma.user.findUnique({ include: { permissions: true } })
 * const permissions = PermissionsHelper.parse(user.permissions?.permissions)
 * 
 * // 检查权限
 * if (PermissionsHelper.hasPermission(user.permissions?.permissions, 'admin_panel')) {
 *   // 用户有管理面板权限
 * }
 * 
 * // 添加权限
 * const newPermissions = PermissionsHelper.addPermission(
 *   user.permissions?.permissions,
 *   'manage_users'
 * )
 * await prisma.userPermission.update({
 *   where: { userId: user.id },
 *   data: { permissions: newPermissions }
 * })
 * 
 * // 解析 token 使用情况
 * const message = await prisma.message.findUnique({ where: { id: messageId } })
 * const tokenUsage = TokenUsageHelper.parse(message.tokenUsage)
 * console.log(`Used ${tokenUsage?.totalTokens} tokens`)
 */
