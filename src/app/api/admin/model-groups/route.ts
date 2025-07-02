import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createApiResponse, createErrorResponse } from '@/lib/api-utils'
import { 
  getUserModelGroupOrders, 
  updateUserModelGroupOrders,
  initializeDefaultGroupOrders 
} from '@/lib/db/modelGroupOrder'

// 获取用户的模型分组排序配置
export const GET = withAuth(async (request: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId') || userId

    // 获取分组排序配置
    let groupOrders = await getUserModelGroupOrders(targetUserId)

    // 如果没有配置，初始化默认配置
    if (groupOrders.length === 0) {
      await initializeDefaultGroupOrders(targetUserId)
      groupOrders = await getUserModelGroupOrders(targetUserId)
    }

    return createApiResponse(groupOrders, 200, '获取分组排序配置成功')
  } catch (error) {
    console.error('Error fetching model group orders:', error)
    return createErrorResponse('获取分组排序配置失败', 500)
  }
})

// 更新用户的模型分组排序配置
export const PUT = withAuth(async (request: NextRequest, authUserId: string) => {
  try {
    const { userId, groupOrders } = await request.json()

    // 使用认证的用户ID，或者验证权限
    const targetUserId = userId || authUserId;

    if (!targetUserId || !Array.isArray(groupOrders)) {
      return createErrorResponse('参数错误：需要userId和groupOrders数组', 400)
    }

    console.log('Updating group orders for user:', targetUserId, 'orders:', groupOrders);

    // 验证groupOrders格式
    for (const item of groupOrders) {
      if (!item.groupName || typeof item.order !== 'number') {
        return createErrorResponse('参数错误：groupOrders格式不正确', 400)
      }
    }

    const success = await updateUserModelGroupOrders(targetUserId, groupOrders)

    if (success) {
      console.log('Group orders updated successfully');
      return createApiResponse({ success: true }, 200, '分组排序更新成功')
    } else {
      console.error('Failed to update group orders in database');
      return createErrorResponse('分组排序更新失败', 500)
    }
  } catch (error) {
    console.error('Error updating model group orders:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return createErrorResponse(`分组排序更新失败: ${errorMessage}`, 500)
  }
})

// 重置用户的分组排序为默认配置
export const POST = withAuth(async (request: NextRequest, authUserId: string) => {
  try {
    const { userId } = await request.json()

    // 使用认证的用户ID
    const targetUserId = userId || authUserId;

    if (!targetUserId) {
      return createErrorResponse('参数错误：需要userId', 400)
    }

    const success = await initializeDefaultGroupOrders(targetUserId)

    if (success) {
      const groupOrders = await getUserModelGroupOrders(targetUserId)
      return createApiResponse(groupOrders, 200, '分组排序重置成功')
    } else {
      return createErrorResponse('分组排序重置失败', 500)
    }
  } catch (error) {
    console.error('Error resetting model group orders:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return createErrorResponse(`分组排序重置失败: ${errorMessage}`, 500)
  }
})
