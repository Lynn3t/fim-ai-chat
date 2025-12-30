/**
 * 验证 Schemas
 * 集中管理所有 API 请求的验证规则
 */

import { z } from 'zod';

// ================================
// 基础验证规则
// ================================

/**
 * 用户名验证
 * - 3-50 个字符
 * - 只能包含字母、数字、下划线和中文
 */
export const usernameSchema = z
  .string()
  .min(3, '用户名至少需要 3 个字符')
  .max(50, '用户名不能超过 50 个字符')
  .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文');

/**
 * 密码验证
 * - 8-100 个字符
 */
export const passwordSchema = z
  .string()
  .min(8, '密码至少需要 8 个字符')
  .max(100, '密码不能超过 100 个字符');

/**
 * 强密码验证
 * - 8-100 个字符
 * - 必须包含大小写字母和数字
 */
export const strongPasswordSchema = z
  .string()
  .min(8, '密码至少需要 8 个字符')
  .max(100, '密码不能超过 100 个字符')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    '密码必须包含大小写字母和数字'
  );

/**
 * 邮箱验证
 */
export const emailSchema = z
  .string()
  .email('邮箱格式不正确')
  .max(100, '邮箱不能超过 100 个字符');

/**
 * 用户角色验证
 */
export const roleSchema = z.enum(['ADMIN', 'USER', 'GUEST']);

/**
 * CUID 格式验证
 */
export const cuidSchema = z
  .string()
  .min(1, 'ID 不能为空')
  .max(100, 'ID 格式无效');

/**
 * UUID 格式验证
 */
export const uuidSchema = z.string().uuid('无效的 ID 格式');

// ================================
// 认证相关 Schemas
// ================================

/**
 * 登录请求验证
 */
export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, '密码不能为空'),
});

/**
 * 注册请求验证
 */
export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema.optional().nullable(),
  password: passwordSchema.optional().nullable(),
  inviteCode: z.string().max(20).optional().nullable(),
  accessCode: z.string().max(20).optional().nullable(),
  isFirstAdmin: z.boolean().optional().default(false),
});

/**
 * Token 刷新请求验证
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, '刷新令牌不能为空'),
});

/**
 * 修改密码请求验证
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '当前密码不能为空'),
  newPassword: passwordSchema,
});

/**
 * 重置密码请求验证
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, '重置令牌不能为空'),
  newPassword: passwordSchema,
});

/**
 * 找回用户名请求验证
 */
export const recoverUsernameSchema = z.object({
  email: emailSchema,
});

// ================================
// 用户管理 Schemas
// ================================

/**
 * 创建用户请求验证
 */
export const createUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema.optional().nullable(),
  password: passwordSchema,
  role: roleSchema.default('USER'),
});

/**
 * 更新用户状态请求验证
 */
export const updateUserStatusSchema = z.object({
  userId: cuidSchema,
  isActive: z.boolean(),
  action: z.literal('updateStatus'),
});

/**
 * 更新用户权限请求验证
 */
export const updateUserPermissionsSchema = z.object({
  userId: cuidSchema,
  allowedModelIds: z.string().optional().nullable(),
  tokenLimit: z.number().int().positive().optional().nullable(),
  canShareAccess: z.boolean().optional(),
  isActive: z.boolean().optional(),
  action: z.literal('updatePermissions'),
});

/**
 * 更新访问码权限请求验证
 */
export const updateAccessCodePermissionSchema = z.object({
  userId: cuidSchema,
  canShareAccessCode: z.boolean(),
  action: z.literal('updateAccessCodePermission'),
});

/**
 * 删除用户请求验证
 */
export const deleteUserSchema = z.object({
  userId: cuidSchema,
});

// ================================
// 对话相关 Schemas
// ================================

/**
 * 创建对话请求验证
 */
export const createConversationSchema = z.object({
  providerId: z.string().min(1, '提供商 ID 不能为空'),
  modelId: z.string().min(1, '模型 ID 不能为空'),
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过 200 个字符'),
});

/**
 * 更新对话请求验证
 */
export const updateConversationSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过 200 个字符').optional(),
  isArchived: z.boolean().optional(),
  isPinned: z.boolean().optional(),
});

/**
 * 对话 ID 参数验证
 */
export const conversationIdSchema = z.object({
  id: cuidSchema,
});

// ================================
// 聊天相关 Schemas
// ================================

/**
 * 消息对象验证
 */
export const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, '消息内容不能为空').max(100000, '消息内容过长'),
});

/**
 * 聊天请求验证
 */
export const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1, '消息不能为空'),
  modelId: z.string().min(1, '模型 ID 不能为空'),
  conversationId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(100000).optional(),
  stream: z.boolean().optional().default(true),
});

// ================================
// 分页和查询 Schemas
// ================================

/**
 * 分页参数验证
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * 搜索查询验证
 */
export const searchQuerySchema = z.object({
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ================================
// 邀请码和访问码 Schemas
// ================================

/**
 * 邀请码验证
 */
export const inviteCodeSchema = z
  .string()
  .min(1, '邀请码不能为空')
  .max(20, '邀请码不能超过 20 个字符');

/**
 * 访问码验证
 */
export const accessCodeSchema = z
  .string()
  .min(1, '访问码不能为空')
  .max(20, '访问码不能超过 20 个字符');

/**
 * 创建邀请码请求验证
 */
export const createInviteCodeSchema = z.object({
  maxUses: z.number().int().min(1).max(100).default(1),
  expiresIn: z.number().int().min(1).optional(), // 小时数
});

/**
 * 创建访问码请求验证
 */
export const createAccessCodeSchema = z.object({
  maxUses: z.number().int().min(1).optional().nullable(),
  expiresIn: z.number().int().min(1).optional(), // 小时数
  allowedModelIds: z.array(z.string()).optional(),
});

// ================================
// 系统管理 Schemas
// ================================

/**
 * 数据库重置请求验证
 */
export const databaseResetSchema = z.object({
  confirmText: z.literal('RESET DATABASE'),
  resetToken: z.string().min(1, '重置令牌不能为空'),
});

/**
 * 系统设置更新请求验证
 */
export const updateSystemSettingsSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'json']).optional(),
  description: z.string().max(500).optional(),
});

// ================================
// Provider 和 Model Schemas
// ================================

/**
 * 创建提供商请求验证
 */
export const createProviderSchema = z.object({
  name: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  baseUrl: z.string().url().optional().nullable(),
  apiKey: z.string().optional().nullable(),
  isEnabled: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
  icon: z.string().max(50).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

/**
 * 更新提供商请求验证
 */
export const updateProviderSchema = createProviderSchema.partial();

/**
 * 创建模型请求验证
 */
export const createModelSchema = z.object({
  providerId: cuidSchema,
  modelId: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  isEnabled: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
  group: z.string().max(50).optional().nullable(),
  maxTokens: z.number().int().positive().optional().nullable(),
  temperature: z.number().min(0).max(2).optional().nullable(),
  topP: z.number().min(0).max(1).optional().nullable(),
  frequencyPenalty: z.number().min(-2).max(2).optional().nullable(),
  presencePenalty: z.number().min(-2).max(2).optional().nullable(),
  pricingType: z.enum(['token', 'request', 'minute']).default('token'),
  inputPrice: z.number().min(0).default(2.0),
  outputPrice: z.number().min(0).default(8.0),
  usagePrice: z.number().min(0).optional().nullable(),
});

/**
 * 更新模型请求验证
 */
export const updateModelSchema = createModelSchema.partial().omit({ providerId: true });

// ================================
// 导出类型
// ================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
export type CreateModelInput = z.infer<typeof createModelSchema>;
export type UpdateModelInput = z.infer<typeof updateModelSchema>;
