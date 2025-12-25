import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import logger from '@/lib/logger';

/**
 * 安全的错误记录器 - 使用logger替代
 */
function logError(error: unknown, context?: string) {
  logger.error('API error', error, context)
}

/**
 * 从请求中获取用户ID
 */
export async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // 首先尝试从Authorization头部获取JWT令牌
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
      const decoded = verifyToken(token);

      if (decoded && decoded.userId) {
        // 验证用户是否存在且活跃
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, isActive: true, role: true },
        });

        if (user && user.isActive) {
          return user.id;
        }
      }
    }

    // JWT验证失败，直接返回null，不再回退到查询参数方法
    return null;
  } catch (error) {
    logError(error, 'getUserFromRequest');
    return null;
  }
}

/**
 * 验证用户权限
 */
export async function verifyUserPermission(
  userId: string,
  requiredRole?: 'ADMIN' | 'USER' | 'GUEST'
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, isActive: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.isActive) {
      return { success: false, error: 'User account is inactive' };
    }

    if (requiredRole) {
      const roleHierarchy = { ADMIN: 3, USER: 2, GUEST: 1 };
      const userLevel = roleHierarchy[user.role];
      const requiredLevel = roleHierarchy[requiredRole];

      if (userLevel < requiredLevel) {
        return { success: false, error: 'Insufficient permissions' };
      }
    }

    return { success: true, user };
  } catch (error) {
    logError(error, 'verifyUserPermission');
    return { success: false, error: 'Permission verification failed' };
  }
}

/**
 * 创建安全的错误响应
 */
export function createSafeErrorResponse(
  error: string,
  status: number = 400,
  details?: unknown
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 安全的详细信息处理
  const safeDetails = isDevelopment ? details : undefined;

  // 避免暴露敏感信息
  const safeError = error.includes('password') || error.includes('secret') || error.includes('token')
    ? 'Invalid request'
    : error;

  return NextResponse.json(
    {
      success: false,
      error: safeError,
      details: safeDetails,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(), // 添加请求ID用于追踪
    },
    { status }
  );
}

/**
 * API错误处理装饰器
 */
export function withErrorHandler(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      logError(error, 'withErrorHandler');

      // 根据错误类型返回适当的响应
      if (error instanceof Error) {
        // 处理特定类型的错误
        if (error.message.includes('prisma') || error.message.includes('database')) {
          return createSafeErrorResponse('Database operation failed', 500);
        }

        if (error.message.includes('validation') || error.message.includes('schema')) {
          return createSafeErrorResponse('Invalid request data', 400);
        }

        if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
          return createSafeErrorResponse('Authentication required', 401);
        }

        if (error.message.includes('permission') || error.message.includes('forbidden')) {
          return createSafeErrorResponse('Insufficient permissions', 403);
        }

        if (error.message.includes('not found')) {
          return createSafeErrorResponse('Resource not found', 404);
        }
      }

      // 默认错误响应
      return createSafeErrorResponse('Internal server error', 500);
    }
  };
}

/**
 * 需要认证的API装饰器
 */
export function withAuth(
  handler: (request: NextRequest, userId: string) => Promise<NextResponse>,
  requiredRole?: 'ADMIN' | 'USER' | 'GUEST'
) {
  return withErrorHandler(async (request: NextRequest) => {
    const userId = await getUserFromRequest(request);

    if (!userId) {
      return createSafeErrorResponse('Authentication required', 401);
    }

    const permission = await verifyUserPermission(userId, requiredRole);
    if (!permission.success) {
      return createSafeErrorResponse(permission.error || 'Insufficient permissions', 403);
    }

    return handler(request, userId);
  });
}

/**
 * 管理员权限装饰器
 */
export function withAdminAuth(
  handler: (request: NextRequest, userId: string) => Promise<NextResponse>
) {
  return withAuth(handler, 'ADMIN');
}

/**
 * 过滤敏感信息
 */
export function sanitizeProvider(provider: any) {
  if (!provider) return provider;

  const { apiKey, apiSecret, accessToken, refreshToken, ...sanitized } = provider;
  return sanitized;
}

/**
 * 过滤敏感信息（数组）
 */
export function sanitizeProviders(providers: any[]) {
  return providers.map(sanitizeProvider);
}

/**
 * 过滤用户敏感信息
 */
export function sanitizeUser(user: any) {
  if (!user) return user;

  const { password, ...sanitized } = user;
  return sanitized;
}

/**
 * 过滤用户敏感信息（数组）
 */
export function sanitizeUsers(users: any[]) {
  return users.map(sanitizeUser);
}

/**
 * 标准化API响应
 */
export function createApiResponse<T>(
  data: T,
  status: number = 200,
  message?: string
): NextResponse {
  return NextResponse.json(
    {
      success: status < 400,
      data,
      message,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
    { status }
  );
}

/**
 * 标准化错误响应
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  details?: any
): NextResponse {
  return createSafeErrorResponse(error, status, details);
}

/**
 * 验证请求体
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  requiredFields: string[]
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const body = await request.json();

    for (const field of requiredFields) {
      if (!(field in body) || body[field] === undefined || body[field] === null) {
        return {
          success: false,
          error: `Missing required field: ${field}`,
        };
      }
    }

    return { success: true, data: body };
  } catch (error) {
    logError(error, 'validateRequestBody');
    return {
      success: false,
      error: 'Invalid JSON body',
    };
  }
}

/**
 * 限流检查（改进实现）
 */
/**
 * 限流检查（改进实现）
 * 注意：此实现在 Serverless 环境（如 Vercel）中可能无法跨请求持久化。
 * 生产环境建议使用 Redis 或 Upstash。
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_MAP_SIZE = 10000; // 防止内存泄漏

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();

  // 如果 Map 过大，清理过期记录
  if (rateLimitMap.size > MAX_MAP_SIZE) {
    cleanupRateLimitRecords();
    // 如果清理后仍然过大，清空整个 Map (极端情况保护)
    if (rateLimitMap.size > MAX_MAP_SIZE) {
      rateLimitMap.clear();
      logger.warn('Rate limit map cleared due to size limit', undefined, 'RATE_LIMIT');
    }
  }

  let record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + windowMs };
    rateLimitMap.set(identifier, record);
  }

  record.count++;

  const allowed = record.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - record.count);

  return {
    allowed,
    remaining,
    resetTime: record.resetTime,
  };
}

/**
 * 清理过期的限流记录
 */
export function cleanupRateLimitRecords() {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}
