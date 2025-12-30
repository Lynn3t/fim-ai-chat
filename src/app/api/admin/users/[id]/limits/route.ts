import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import { handleApiError, AppError } from '@/lib/error-handler'

async function getUserLimitsHandler(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params

    const userPermission = await prisma.userPermission.findUnique({
      where: { userId: targetUserId }
    })

    return NextResponse.json(userPermission || { userId: targetUserId })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/users/[id]/limits')
  }
}

export const GET = withAdminAuth(getUserLimitsHandler)

async function updateUserLimitsHandler(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {
      limitType,
      limitPeriod,
      tokenLimit,
      costLimit,
      resetUsage
    } = await request.json()

    const { id: targetUserId } = await params

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!user) {
      throw AppError.notFound('用户不存在')
    }

    // 准备更新数据
    const updateData: any = {
      limitType: limitType || 'none',
      limitPeriod: limitPeriod || 'monthly',
    }

    // 根据限制类型设置相应字段
    if (limitType === 'token') {
      updateData.tokenLimit = tokenLimit
      updateData.costLimit = null
    } else if (limitType === 'cost') {
      updateData.costLimit = costLimit
      updateData.tokenLimit = null
    } else {
      // 如果是 none，清除所有限制
      updateData.tokenLimit = null
      updateData.costLimit = null
    }

    // 如果需要重置使用量
    if (resetUsage) {
      updateData.tokenUsed = 0
      updateData.lastResetAt = new Date()
    }

    // 创建或更新用户权限
    const permission = await prisma.userPermission.upsert({
      where: { userId: targetUserId },
      update: updateData,
      create: {
        userId: targetUserId,
        ...updateData,
      },
    })

    return NextResponse.json(permission)
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/users/[id]/limits')
  }
}

export const POST = withAdminAuth(updateUserLimitsHandler)
