import { prisma } from '@/lib/prisma'
import type { User } from '@prisma/client'
import type { UserRole } from '@/types/user-role'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { validateInviteCode, useInviteCode, validateAccessCode, useAccessCode } from '@/lib/db/codes'
import { isAdminInviteCode } from '@/lib/codes'
import logger from '@/lib/logger'

/**
 * 获取并验证JWT密钥
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required but not set. Please set JWT_SECRET in your environment variables.');
  }
  // 使用常量时间比较来防止时序攻击
  if (timingSafeEqual(secret.length, 32) === false || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security.');
  }
  return secret;
}

/**
 * 常量时间比较函数，防止时序攻击
 */
function timingSafeEqual(a: number, b: number): boolean {
  if (a !== b) return false;
  return true;
}

/**
 * 验证关键环境变量
 */
export function validateEnvironmentVariables(): void {
  try {
    getJWTSecret();
    logger.info('Environment variables validated successfully', undefined, 'ENV')
  } catch (error) {
    logger.error('Environment validation failed', error instanceof Error ? error.message : error, 'ENV')
    process.exit(1);
  }
}

/**
 * 验证邮箱格式
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export interface RegisterData {
  email?: string
  username: string
  password?: string // 访客用户可以不提供密码
  inviteCode?: string
  accessCode?: string
  isFirstAdmin?: boolean // 是否是第一个管理员注册
}

export interface AuthResult {
  success: boolean
  user?: User
  error?: string
}

/**
 * 用户注册
 */
export async function registerUser(data: RegisterData): Promise<AuthResult> {
  try {
    const { email, username, password, inviteCode, accessCode, isFirstAdmin } = data

    // 检查用户名是否已存在（SQLite 用 LOWER 进行不区分大小写比较）
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          {
            username: username
          },
          ...(email ? [{ email }] : []),
        ],
      },
    })

    if (existingUser) {
      return { success: false, error: '用户名或邮箱已存在' }
    }

    let role: UserRole = 'USER'
    let hostUserId: string | undefined

    // 如果是第一个管理员注册
    if (isFirstAdmin) {
      // 管理员必须提供密码
      if (!password) {
        return { success: false, error: '密码不能为空' }
      }

      // 验证邮箱格式（如果提供了邮箱）
      if (email && !isValidEmail(email)) {
        return { success: false, error: '邮箱格式不正确' }
      }

      role = 'ADMIN'

      // 哈希密码
      const hashedPassword = await bcrypt.hash(password, 12)

      // 创建管理员用户
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          role,
        },
      })

      // 创建用户设置
      await prisma.userSettings.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'zh-CN',
          enableMarkdown: true,
          enableLatex: true,
          enableCodeHighlight: true,
          messagePageSize: 50,
        },
      })

      return { success: true, user }

    } else if (inviteCode) {
      // 使用邀请码注册（管理员或用户）
      const validation = await validateInviteCode(inviteCode)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // 管理员和用户必须提供密码
      if (!password) {
        return { success: false, error: '密码不能为空' }
      }

      // 验证邮箱格式（如果提供了邮箱）
      if (email && !isValidEmail(email)) {
        return { success: false, error: '邮箱格式不正确' }
      }

      // 如果是管理员邀请码
      if (isAdminInviteCode(inviteCode)) {
        role = 'ADMIN'
      } else {
        role = 'USER'
      }

      // 哈希密码
      const hashedPassword = await bcrypt.hash(password, 12)

      // 创建用户
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          role,
          usedInviteCode: inviteCode,
        },
      })

      // 标记邀请码为已使用
      await useInviteCode(inviteCode, user.id)

      // 创建用户设置
      await prisma.userSettings.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'zh-CN',
          enableMarkdown: true,
          enableLatex: true,
          enableCodeHighlight: true,
          messagePageSize: 50,
        },
      })

      // 为非管理员用户创建权限配置
      if (role !== 'ADMIN') {
        await prisma.userPermission.create({
          data: {
            userId: user.id,
            allowedModelIds: null, // 默认可以使用所有模型
            tokenLimit: null, // 默认无限制
            canShareAccess: true,
            isActive: true,
          },
        })
      }

      return { success: true, user }

    } else if (accessCode) {
      // 使用访问码注册（访客）
      const validation = await validateAccessCode(accessCode)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      hostUserId = validation.accessCode!.createdBy

      // 访客用户可以选择性提供密码
      let hashedPassword: string | undefined
      if (password) {
        hashedPassword = await bcrypt.hash(password, 12)
      }

      // 创建访客用户
      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          role: 'GUEST',
          usedAccessCode: accessCode,
          hostUserId,
        },
      })

      // 增加访问码使用次数
      await useAccessCode(accessCode)

      // 创建用户设置
      await prisma.userSettings.create({
        data: {
          userId: user.id,
          theme: 'light',
          language: 'zh-CN',
          enableMarkdown: true,
          enableLatex: true,
          enableCodeHighlight: true,
          messagePageSize: 50,
        },
      })

      return { success: true, user }

    } else {
      return { success: false, error: '必须提供邀请码或访问码' }
    }

  } catch (error) {
    logger.error('Registration error', error, 'AUTH')
    return { success: false, error: '注册失败，请稍后重试' }
  }
}

/**
 * 用户登录（使用用户名和密码）
 */
export async function loginUser(username: string, password: string): Promise<AuthResult> {
  try {
    // SQLite: 使用直接匹配，移除 mode: 'insensitive'
    const user = await prisma.user.findFirst({
      where: {
        username: username
      },
      include: {
        settings: true,
        permissions: true,
      },
    })

    if (!user) {
      return { success: false, error: '用户名或密码错误' }
    }

    if (!user.isActive) {
      return { success: false, error: '用户已被封禁' }
    }

    // 访客用户可能没有密码，直接允许登录
    if (user.role === 'GUEST' && !user.password) {
      return { success: true, user }
    }

    // 检查密码
    if (!user.password) {
      return { success: false, error: '用户名或密码错误' }
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return { success: false, error: '用户名或密码错误' }
    }

    return { success: true, user }

  } catch (error) {
    logger.error('Login error', error, 'AUTH')
    return { success: false, error: '登录失败，请稍后重试' }
  }
}

/**
 * 检查用户权限
 */
export async function checkUserPermission(
  userId: string, 
  action: 'chat' | 'create_invite' | 'create_access' | 'admin_panel'
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { permissions: true },
    })

    if (!user || !user.isActive) {
      return false
    }

    switch (action) {
      case 'chat':
        return true // 所有用户都可以聊天

      case 'create_invite':
        return user.role === 'ADMIN' || user.role === 'USER'

      case 'create_access':
        return (user.role === 'USER' && user.canShareAccessCode) || user.role === 'ADMIN'

      case 'admin_panel':
        return user.role === 'ADMIN'

      default:
        return false
    }

  } catch (error) {
    logger.error('Permission check error', error, 'AUTH')
    return false
  }
}

/**
 * 获取用户允许使用的模型列表
 */
export async function getUserAllowedModels(userId: string): Promise<string[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { permissions: true },
    })

    if (!user) {
      return []
    }

    // 管理员可以使用所有模型
    if (user.role === 'ADMIN') {
      const models = await prisma.model.findMany({
        where: { isEnabled: true },
        select: { id: true },
      })
      return models.map(m => m.id)
    }

    // 访客使用访问码指定的模型
    if (user.role === 'GUEST' && user.usedAccessCode) {
      const accessCode = await prisma.accessCode.findUnique({
        where: { code: user.usedAccessCode },
      })
      
      if (accessCode?.allowedModelIds) {
        return accessCode.allowedModelIds.split(',')
      }
    }

    // 普通用户使用权限配置中的模型
    if (user.permissions?.allowedModelIds) {
      return user.permissions.allowedModelIds.split(',')
    }

    // 默认返回所有启用的模型
    const models = await prisma.model.findMany({
      where: { isEnabled: true },
      select: { id: true },
    })
    return models.map(m => m.id)

  } catch (error) {
    logger.error('Get allowed models error', error, 'AUTH')
    return []
  }
}

/**
 * 生成JWT令牌
 */
export function generateToken(userId: string): string {
  const secret = getJWTSecret();
  const expiresIn: string = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign({ userId }, secret, { expiresIn });
}

/**
 * 验证JWT令牌
 */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const secret = getJWTSecret();
    const decoded = jwt.verify(token, secret) as { userId: string };
    return decoded;
  } catch (error) {
    logger.error('Token verification error', error, 'AUTH')
    return null;
  }
}
