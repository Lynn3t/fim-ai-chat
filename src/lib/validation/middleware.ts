/**
 * 请求验证中间件
 * 用于验证 API 请求的输入数据
 */

import { NextRequest } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

/**
 * 验证请求体
 * @param request NextRequest 对象
 * @param schema Zod 验证 schema
 * @returns 验证后的数据
 * @throws ZodError 如果验证失败
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ZodError([{
        code: 'custom',
        path: [],
        message: '无效的 JSON 格式'
      }]);
    }
    throw error;
  }
}

/**
 * 验证 URL 查询参数
 * @param request NextRequest 对象
 * @param schema Zod 验证 schema
 * @returns 验证后的数据
 * @throws ZodError 如果验证失败
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): T {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    // 处理多值参数
    if (params[key]) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  }

  return schema.parse(params);
}

/**
 * 验证路由参数
 * @param params 路由参数对象
 * @param schema Zod 验证 schema
 * @returns 验证后的数据
 * @throws ZodError 如果验证失败
 */
export function validateParams<T>(
  params: Record<string, string>,
  schema: ZodSchema<T>
): T {
  return schema.parse(params);
}

/**
 * 安全地验证请求体（不抛出异常）
 * @param request NextRequest 对象
 * @param schema Zod 验证 schema
 * @returns 包含验证结果的对象
 */
export async function safeValidateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: ZodError }> {
  try {
    const data = await validateRequest(request, schema);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * 安全地验证查询参数（不抛出异常）
 * @param request NextRequest 对象
 * @param schema Zod 验证 schema
 * @returns 包含验证结果的对象
 */
export function safeValidateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: ZodError } {
  try {
    const data = validateQuery(request, schema);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * 验证并提取分页参数
 * @param request NextRequest 对象
 * @returns 分页参数
 */
export function extractPagination(request: NextRequest): { page: number; pageSize: number; offset: number } {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20', 10) || 20));
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

/**
 * 验证并提取排序参数
 * @param request NextRequest 对象
 * @param allowedFields 允许排序的字段列表
 * @param defaultField 默认排序字段
 * @param defaultOrder 默认排序方向
 * @returns 排序参数
 */
export function extractSorting(
  request: NextRequest,
  allowedFields: string[],
  defaultField: string = 'createdAt',
  defaultOrder: 'asc' | 'desc' = 'desc'
): { field: string; order: 'asc' | 'desc' } {
  const { searchParams } = new URL(request.url);

  let field = searchParams.get('sortBy') || searchParams.get('orderBy') || defaultField;
  const order = (searchParams.get('order') || searchParams.get('sortOrder') || defaultOrder) as 'asc' | 'desc';

  // 验证字段是否允许
  if (!allowedFields.includes(field)) {
    field = defaultField;
  }

  // 验证排序方向
  const validOrder = order === 'asc' || order === 'desc' ? order : defaultOrder;

  return { field, order: validOrder };
}
