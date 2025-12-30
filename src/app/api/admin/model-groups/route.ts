import { NextRequest, NextResponse } from 'next/server'
import { requireUser, type AuthUser } from '@/lib/auth-middleware'
import { createApiResponse } from '@/lib/api-utils'
import {
  getUserModelGroupOrders,
  updateUserModelGroupOrders,
  initializeDefaultGroupOrders
} from '@/lib/db/modelGroupOrder'
import { handleApiError, AppError } from '@/lib/error-handler'

// 获取用户的模型分组排序配置
export const GET = requireUser(async (request: NextRequest, user: AuthUser) => {
  try {
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId') || user.userId

    // 获取分组排序配置
    let groupOrders = await getUserModelGroupOrders(targetUserId)

    // 如果没有配置，初始化默认配置
    if (groupOrders.length === 0) {
      await initializeDefaultGroupOrders(targetUserId)
      groupOrders = await getUserModelGroupOrders(targetUserId)
    }

    return createApiResponse(groupOrders, 200, '获取分组排序配置成功')
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/model-groups')
  }
})

// 更新用户的模型分组排序配置
export const PUT = requireUser(async (request: NextRequest, user: AuthUser) => {
  try {
    const { userId, groupOrders } = await request.json()

    // 使用认证的用户ID，或者验证权限
    const targetUserId = userId || user.userId;

    if (!targetUserId || !Array.isArray(groupOrders)) {
      throw AppError.badRequest('参数错误：需要userId和groupOrders数组')
    }

    // 验证groupOrders格式
    for (const item of groupOrders) {
      if (!item.groupName || typeof item.order !== 'number') {
        throw AppError.badRequest('参数错误：groupOrders格式不正确')
      }
    }

    const success = await updateUserModelGroupOrders(targetUserId, groupOrders)

    if (success) {
      return createApiResponse({ success: true }, 200, '分组排序更新成功')
    } else {
      throw AppError.internal('分组排序更新失败')
    }
  } catch (error) {
    return handleApiError(error, 'PUT /api/admin/model-groups')
  }
})

// 重置用户的分组排序为默认配置
export const POST = requireUser(async (request: NextRequest, user: AuthUser) => {
  try {
    const { userId } = await request.json()

    // 使用认证的用户ID
    const targetUserId = userId || user.userId;

    if (!targetUserId) {
      throw AppError.badRequest('参数错误：需要userId')
    }

    const success = await initializeDefaultGroupOrders(targetUserId)

    if (success) {
      const groupOrders = await getUserModelGroupOrders(targetUserId)
      return createApiResponse(groupOrders, 200, '分组排序重置成功')
    } else {
      throw AppError.internal('分组排序重置失败')
    }
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/model-groups')
  }
})
