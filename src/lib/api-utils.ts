import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 从请求中获取用户ID
 */
export async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // 从查询参数中获取userId（临时方案，实际项目应该使用JWT或session）
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || searchParams.get('adminUserId');
    
    if (!userId) {
      return null;
    }

    // 验证用户是否存在且活跃
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, role: true },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Error getting user from request:', error);
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
    console.error('Error verifying user permission:', error);
    return { success: false, error: 'Permission verification failed' };
  }
}

/**
 * API错误处理装饰器
 */
export function withErrorHandler(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      console.error('API Error:', error);
      
      // 不要在生产环境中暴露详细错误信息
      const isDevelopment = process.env.NODE_ENV === 'development';
      const errorMessage = isDevelopment 
        ? (error as Error).message 
        : 'Internal server error';

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
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
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const permission = await verifyUserPermission(userId, requiredRole);
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 403 }
      );
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
  
  const { apiKey, ...sanitized } = provider;
  return sanitized;
}

/**
 * 过滤敏感信息（数组）
 */
export function sanitizeProviders(providers: any[]) {
  return providers.map(sanitizeProvider);
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
  return NextResponse.json(
    {
      success: false,
      error,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
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
    return {
      success: false,
      error: 'Invalid JSON body',
    };
  }
}

/**
 * 限流检查（简单实现）
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  
  let record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + windowMs };
    rateLimitMap.set(key, record);
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
