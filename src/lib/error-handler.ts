/**
 * 统一错误处理器
 * 安全地处理 API 错误，避免泄露敏感信息
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import logger from './logger';

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT = 'CONFLICT',
}

/**
 * HTTP 状态码映射
 */
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.RATE_LIMIT]: 429,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_API_ERROR]: 502,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.CONFLICT]: 409,
};

/**
 * 自定义应用错误类
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode?: number,
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode ?? ERROR_STATUS_MAP[code] ?? 500;
    this.details = details;

    // 保持正确的原型链
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * 创建验证错误
   */
  static validation(message: string, details?: unknown): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }

  /**
   * 创建未授权错误
   */
  static unauthorized(message: string = '请先登录'): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message, 401);
  }

  /**
   * 创建禁止访问错误
   */
  static forbidden(message: string = '权限不足'): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message, 403);
  }

  /**
   * 创建未找到错误
   */
  static notFound(message: string = '资源不存在'): AppError {
    return new AppError(ErrorCode.NOT_FOUND, message, 404);
  }

  /**
   * 创建限流错误
   */
  static rateLimit(message: string = '请求过于频繁，请稍后重试'): AppError {
    return new AppError(ErrorCode.RATE_LIMIT, message, 429);
  }

  /**
   * 创建数据库错误
   */
  static database(message: string = '数据库操作失败'): AppError {
    return new AppError(ErrorCode.DATABASE_ERROR, message, 500);
  }

  /**
   * 创建外部 API 错误
   */
  static externalApi(message: string = '外部服务暂时不可用'): AppError {
    return new AppError(ErrorCode.EXTERNAL_API_ERROR, message, 502);
  }

  /**
   * 创建内部错误
   */
  static internal(message: string = '服务器内部错误'): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, 500);
  }

  /**
   * 创建请求错误
   */
  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(ErrorCode.BAD_REQUEST, message, 400, details);
  }

  /**
   * 创建冲突错误
   */
  static conflict(message: string): AppError {
    return new AppError(ErrorCode.CONFLICT, message, 409);
  }
}

/**
 * 错误响应接口
 */
interface ErrorResponse {
  code: ErrorCode;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  details?: unknown;
  debug?: string;
}

/**
 * 判断是否为开发环境
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 处理 Zod 验证错误
 */
function handleZodError(error: ZodError): NextResponse<ErrorResponse> {
  const errors = error.errors.map(e => ({
    field: e.path.join('.'),
    message: e.message
  }));

  return NextResponse.json(
    {
      code: ErrorCode.VALIDATION_ERROR,
      message: '请求参数验证失败',
      errors
    },
    { status: 400 }
  );
}

/**
 * 处理 Prisma 错误
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse<ErrorResponse> {
  // P2002: 唯一约束冲突
  if (error.code === 'P2002') {
    const target = (error.meta?.target as string[])?.join(', ') || '字段';
    return NextResponse.json(
      {
        code: ErrorCode.CONFLICT,
        message: `${target} 已存在，请使用其他值`
      },
      { status: 409 }
    );
  }

  // P2025: 记录不存在
  if (error.code === 'P2025') {
    return NextResponse.json(
      {
        code: ErrorCode.NOT_FOUND,
        message: '请求的资源不存在'
      },
      { status: 404 }
    );
  }

  // P2003: 外键约束失败
  if (error.code === 'P2003') {
    return NextResponse.json(
      {
        code: ErrorCode.BAD_REQUEST,
        message: '关联的资源不存在或已被删除'
      },
      { status: 400 }
    );
  }

  // 其他 Prisma 错误
  return NextResponse.json(
    {
      code: ErrorCode.DATABASE_ERROR,
      message: '数据库操作失败',
      ...(isDevelopment() && { debug: `Prisma Error: ${error.code}` })
    },
    { status: 500 }
  );
}

/**
 * 处理自定义应用错误
 */
function handleAppError(error: AppError): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    code: error.code,
    message: error.message
  };

  // 仅在开发环境中包含详细信息
  if (isDevelopment() && error.details) {
    response.details = error.details;
  }

  return NextResponse.json(response, { status: error.statusCode });
}

/**
 * 处理未知错误
 */
function handleUnknownError(error: unknown): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    code: ErrorCode.INTERNAL_ERROR,
    message: '服务器内部错误，请稍后重试'
  };

  // 仅在开发环境中包含调试信息
  if (isDevelopment() && error instanceof Error) {
    response.debug = error.message;
  }

  return NextResponse.json(response, { status: 500 });
}

/**
 * 统一 API 错误处理函数
 * @param error 错误对象
 * @param context 可选的上下文信息，用于日志记录
 */
export function handleApiError(error: unknown, context?: string): NextResponse<ErrorResponse> {
  // 记录完整错误到服务端日志
  logger.error('API Error', {
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error
  }, 'API');

  // Zod 验证错误
  if (error instanceof ZodError) {
    return handleZodError(error);
  }

  // Prisma 数据库错误
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  // Prisma 验证错误
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        code: ErrorCode.VALIDATION_ERROR,
        message: '数据验证失败',
        ...(isDevelopment() && { debug: 'Prisma validation error' })
      },
      { status: 400 }
    );
  }

  // 自定义应用错误
  if (error instanceof AppError) {
    return handleAppError(error);
  }

  // 处理 JWT 错误
  if (error instanceof Error) {
    if (error.name === 'TokenExpiredError') {
      return NextResponse.json(
        {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Token 已过期，请重新登录'
        },
        { status: 401 }
      );
    }

    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Token 无效'
        },
        { status: 401 }
      );
    }
  }

  // 未知错误
  return handleUnknownError(error);
}

/**
 * 创建成功响应
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

/**
 * 创建无内容响应
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * 创建创建成功响应
 */
export function createdResponse<T>(data: T): NextResponse<T> {
  return NextResponse.json(data, { status: 201 });
}

export default {
  handleApiError,
  successResponse,
  noContentResponse,
  createdResponse,
  AppError,
  ErrorCode,
};
