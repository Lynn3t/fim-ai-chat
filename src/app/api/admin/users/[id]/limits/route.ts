import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/api-utils'

async function getUserLimitsHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  const targetUserId = params.id
  
  const userPermission = await prisma.userPermission.findUnique({
    where: { userId: targetUserId }
  })

  return NextResponse.json(userPermission || { userId: targetUserId })
}

export const GET = withAdminAuth(getUserLimitsHandler)

async function updateUserLimitsHandler(
  request: NextRequest,
  userId: string,
  { params }: { params: { id: string } }
) {
  const { 
    limitType,
    limitPeriod,
    tokenLimit,
    costLimit,
    resetUsage
  } = await request.json()

  const targetUserId = params.id

  // 检查用户是否存在
  const user = await prisma.user.findUnique({
    where: { id: targetUserId }
  })

  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    )
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
}

export const POST = withAdminAuth(updateUserLimitsHandler) 