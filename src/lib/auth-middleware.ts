/**
 * 认证和授权中间件
 * 用于保护 API 路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';
import { prisma } from './prisma';
import { handleApiError, AppError, ErrorCode } from './error-handler';
import logger from './logger';

/**
 * 用户角色类型
 */
export type Role = 'ADMIN' | 'USER' | 'GUEST';

/**
 * JWT 载荷接口
 */
export interface JWTPayload {
  userId: string;
}

/**
 * 认证用户信息
 */
export interface AuthUser {
  userId: string;
  username: string;
  role: Role;
  isActive: boolean;
  email?: string | null;
}

/**
 * 认证选项
 */
export interface AuthOptions {
  /** 允许的角色列表 */
  roles?: Role[];
  /** 是否要求用户处于激活状态，默认 true */
  requireActive?: boolean;
  /** 是否允许可选认证（未登录也可访问），默认 false */
  optional?: boolean;
}

/**
 * 从请求中提取 Bearer Token
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * 获取当前认证用户
 * @param request NextRequest 对象
 * @returns 用户信息或 null
 */
export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
  const token = extractBearerToken(request);

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    username: user.username || '',
    role: user.role as Role,
    isActive: user.isActive,
    email: user.email,
  };
}

/**
 * 认证处理函数类型
 */
type AuthenticatedHandler = (
  request: NextRequest,
  user: AuthUser,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse>;

/**
 * 可选认证处理函数类型
 */
type OptionalAuthHandler = (
  request: NextRequest,
  user: AuthUser | null,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse>;

/**
 * 认证中间件
 * @param handler 请求处理函数
 * @param options 认证选项
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options: AuthOptions = {}
) {
  const {
    roles,
    requireActive = true,
    optional = false,
  } = options;

  return async (
    request: NextRequest,
    context?: { params?: Record<string, string> }
  ): Promise<NextResponse> => {
    try {
      const user = await getCurrentUser(request);

      // 可选认证模式
      if (optional && !user) {
        return await (handler as OptionalAuthHandler)(request, null, context);
      }

      // 必须认证
      if (!user) {
        throw new AppError(ErrorCode.UNAUTHORIZED, '请先登录', 401);
      }

      // 检查用户是否激活
      if (requireActive && !user.isActive) {
        throw new AppError(ErrorCode.FORBIDDEN, '账户已被禁用', 403);
      }

      // 检查角色权限
      if (roles && roles.length > 0 && !roles.includes(user.role)) {
        logger.warn('Permission denied', {
          userId: user.userId,
          requiredRoles: roles,
          userRole: user.role,
          path: request.nextUrl.pathname,
        }, 'AUTH');

        throw new AppError(ErrorCode.FORBIDDEN, '权限不足', 403);
      }

      // 记录认证成功
      logger.debug('User authenticated', {
        userId: user.userId,
        role: user.role,
        path: request.nextUrl.pathname,
      }, 'AUTH');

      return await handler(request, user, context);
    } catch (error) {
      return handleApiError(error, `${request.method} ${request.nextUrl.pathname}`);
    }
  };
}

/**
 * 仅管理员访问
 */
export function requireAdmin(handler: AuthenticatedHandler) {
  return withAuth(handler, { roles: ['ADMIN'] });
}

/**
 * 管理员认证装饰器（requireAdmin 的别名，保持与旧 API 兼容）
 */
export const withAdminAuth = requireAdmin;

/**
 * 管理员或普通用户访问
 */
export function requireUser(handler: AuthenticatedHandler) {
  return withAuth(handler, { roles: ['ADMIN', 'USER'] });
}

/**
 * 任何已登录用户（包括访客）
 */
export function requireAuth(handler: AuthenticatedHandler) {
  return withAuth(handler, { roles: ['ADMIN', 'USER', 'GUEST'] });
}

/**
 * 可选认证（未登录也可访问）
 */
export function optionalAuth(handler: OptionalAuthHandler) {
  return withAuth(handler as AuthenticatedHandler, { optional: true });
}

/**
 * 检查用户是否有特定权限
 */
export async function hasPermission(
  userId: string,
  action: 'chat' | 'create_invite' | 'create_access' | 'admin_panel' | 'manage_users'
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        isActive: true,
        canShareAccessCode: true,
        permissions: true,
      },
    });

    if (!user || !user.isActive) {
      return false;
    }

    const role = user.role as Role;

    switch (action) {
      case 'chat':
        // 所有激活用户都可以聊天
        return true;

      case 'create_invite':
        // 管理员和普通用户可以创建邀请码
        return role === 'ADMIN' || role === 'USER';

      case 'create_access':
        // 有权限的用户可以创建访问码
        return role === 'ADMIN' || (role === 'USER' && user.canShareAccessCode);

      case 'admin_panel':
        // 仅管理员可以访问管理面板
        return role === 'ADMIN';

      case 'manage_users':
        // 仅管理员可以管理用户
        return role === 'ADMIN';

      default:
        return false;
    }
  } catch (error) {
    logger.error('Permission check failed', error, 'AUTH');
    return false;
  }
}

/**
 * 检查用户是否可以访问特定模型
 */
export async function canAccessModel(userId: string, modelId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        isActive: true,
        usedAccessCode: true,
        permissions: {
          select: {
            allowedModelIds: true,
            isActive: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return false;
    }

    // 管理员可以访问所有模型
    if (user.role === 'ADMIN') {
      return true;
    }

    // 检查用户权限中的模型限制
    if (user.permissions?.isActive && user.permissions.allowedModelIds) {
      const allowedIds = user.permissions.allowedModelIds.split(',');
      return allowedIds.includes(modelId);
    }

    // 访客用户检查访问码权限
    if (user.role === 'GUEST' && user.usedAccessCode) {
      const accessCode = await prisma.accessCode.findUnique({
        where: { code: user.usedAccessCode },
        select: { allowedModelIds: true },
      });

      if (accessCode?.allowedModelIds) {
        const allowedIds = accessCode.allowedModelIds.split(',');
        return allowedIds.includes(modelId);
      }
    }

    // 默认允许访问所有启用的模型
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      select: { isEnabled: true },
    });

    return model?.isEnabled ?? false;
  } catch (error) {
    logger.error('Model access check failed', error, 'AUTH');
    return false;
  }
}

/**
 * 检查用户 Token 使用限制
 */
export async function checkTokenLimit(
  userId: string,
  estimatedTokens: number
): Promise<{ allowed: boolean; remaining?: number; message?: string }> {
  try {
    const permission = await prisma.userPermission.findUnique({
      where: { userId },
      select: {
        limitType: true,
        limitPeriod: true,
        tokenLimit: true,
        tokenUsed: true,
        lastResetAt: true,
        isActive: true,
      },
    });

    // 无权限配置或限制类型为 none，允许使用
    if (!permission || permission.limitType === 'none') {
      return { allowed: true };
    }

    if (!permission.isActive) {
      return { allowed: false, message: '权限已被禁用' };
    }

    if (!permission.tokenLimit) {
      return { allowed: true };
    }

    // 检查是否需要重置计数
    const now = new Date();
    const lastReset = new Date(permission.lastResetAt);
    let shouldReset = false;

    switch (permission.limitPeriod) {
      case 'daily':
        shouldReset = now.getDate() !== lastReset.getDate() ||
                     now.getMonth() !== lastReset.getMonth() ||
                     now.getFullYear() !== lastReset.getFullYear();
        break;
      case 'weekly':
        const weekDiff = Math.floor((now.getTime() - lastReset.getTime()) / (7 * 24 * 60 * 60 * 1000));
        shouldReset = weekDiff >= 1;
        break;
      case 'monthly':
        shouldReset = now.getMonth() !== lastReset.getMonth() ||
                     now.getFullYear() !== lastReset.getFullYear();
        break;
    }

    if (shouldReset) {
      await prisma.userPermission.update({
        where: { userId },
        data: { tokenUsed: 0, lastResetAt: now },
      });
      return {
        allowed: true,
        remaining: permission.tokenLimit - estimatedTokens,
      };
    }

    const remaining = permission.tokenLimit - permission.tokenUsed;

    if (remaining < estimatedTokens) {
      return {
        allowed: false,
        remaining,
        message: `Token 配额不足，剩余 ${remaining}，需要 ${estimatedTokens}`,
      };
    }

    return { allowed: true, remaining: remaining - estimatedTokens };
  } catch (error) {
    logger.error('Token limit check failed', error, 'AUTH');
    return { allowed: true }; // 检查失败时默认允许
  }
}

export default {
  withAuth,
  requireAdmin,
  requireUser,
  requireAuth,
  optionalAuth,
  getCurrentUser,
  hasPermission,
  canAccessModel,
  checkTokenLimit,
};
