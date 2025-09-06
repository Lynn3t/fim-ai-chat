import { z } from 'zod'

// 用户名验证
export const usernameSchema = z.string()
  .min(3, '用户名至少需要3个字符')
  .max(50, '用户名不能超过50个字符')
  .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文')

// 邮箱验证
export const emailSchema = z.string()
  .email('邮箱格式不正确')
  .max(100, '邮箱不能超过100个字符')

// 密码验证
export const passwordSchema = z.string()
  .min(8, '密码至少需要8个字符')
  .max(100, '密码不能超过100个字符')

// 角色验证
export const roleSchema = z.enum(['ADMIN', 'USER', 'GUEST'])

// 用户ID验证
export const userIdSchema = z.string()
  .min(1, '用户ID不能为空')
  .max(100, '用户ID不能超过100个字符')

// 分页参数验证
export const paginationSchema = z.object({
  limit: z.number()
    .int('limit必须是整数')
    .min(1, 'limit至少为1')
    .max(100, 'limit不能超过100')
    .default(50),
  offset: z.number()
    .int('offset必须是整数')
    .min(0, 'offset不能为负数')
    .default(0)
})

// 创建用户验证
export const createUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema.optional().nullable(),
  password: passwordSchema,
  role: roleSchema.default('USER')
})

// 更新用户状态验证
export const updateUserStatusSchema = z.object({
  userId: userIdSchema,
  isActive: z.boolean(),
  action: z.literal('updateStatus')
})

// 更新访问码权限验证
export const updateAccessCodePermissionSchema = z.object({
  userId: userIdSchema,
  canShareAccessCode: z.boolean(),
  action: z.literal('updateAccessCodePermission')
})

// 更新用户权限验证
export const updateUserPermissionsSchema = z.object({
  userId: userIdSchema,
  allowedModelIds: z.string().optional().nullable(),
  tokenLimit: z.number().int().positive().optional().nullable(),
  canShareAccess: z.boolean().optional(),
  isActive: z.boolean().optional(),
  action: z.literal('updatePermissions')
})

// 删除用户验证
export const deleteUserSchema = z.object({
  userId: userIdSchema
})

// 对话ID验证
export const conversationIdSchema = z.string()
  .min(1, '对话ID不能为空')
  .max(100, '对话ID不能超过100个字符')

// 消息内容验证
export const messageContentSchema = z.string()
  .min(1, '消息内容不能为空')
  .max(10000, '消息内容不能超过10000个字符')

// 创建对话验证
export const createConversationSchema = z.object({
  providerId: z.string().min(1, '提供商ID不能为空'),
  modelId: z.string().min(1, '模型ID不能为空'),
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符')
})

// 更新对话验证
export const updateConversationSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符').optional(),
  isArchived: z.boolean().optional(),
  isPinned: z.boolean().optional()
})

// 数据库重置验证
export const databaseResetSchema = z.object({
  confirmText: z.literal('RESET DATABASE'),
  resetToken: z.string().min(1, '重置令牌不能为空')
})

// 邀请码验证
export const inviteCodeSchema = z.string()
  .min(1, '邀请码不能为空')
  .max(20, '邀请码不能超过20个字符')

// 访问码验证
export const accessCodeSchema = z.string()
  .min(1, '访问码不能为空')
  .max(20, '访问码不能超过20个字符')

// 注册用户验证
export const registerUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema.optional().nullable(),
  password: passwordSchema.optional().nullable(),
  inviteCode: inviteCodeSchema.optional().nullable(),
  accessCode: accessCodeSchema.optional().nullable(),
  isFirstAdmin: z.boolean().optional().default(false)
})

// 登录验证
export const loginUserSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, '密码不能为空')
})

// 验证函数
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const error = result.error.errors[0]
    throw new Error(`${error.path.join('.')}: ${error.message}`)
  }
  return result.data
}

// 查询参数验证
export function validateQueryParams<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): T {
  const data: Record<string, string> = {}
  for (const [key, value] of searchParams.entries()) {
    data[key] = value
  }
  return validateSchema(schema, data)
}

// 分页查询验证
export function validatePagination(searchParams: URLSearchParams) {
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  return validateSchema(paginationSchema, { limit, offset })
}