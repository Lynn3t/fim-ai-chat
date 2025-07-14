import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkUserPermission } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const adminUserId = searchParams.get('adminUserId')

    if (!adminUserId) {
      return NextResponse.json(
        { error: 'adminUserId is required' },
        { status: 400 }
      )
    }

    // 检查管理员权限
    const hasPermission = await checkUserPermission(adminUserId, 'admin_panel')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const userId = params.id
    
    const userPermission = await prisma.userPermission.findUnique({
      where: { userId }
    })

    return NextResponse.json(userPermission || { userId })

  } catch (error) {
    console.error('Error fetching user limits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user limits' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { 
      adminUserId, 
      limitType,
      limitPeriod,
      tokenLimit,
      costLimit,
      resetUsage
    } = await request.json()

    if (!adminUserId) {
      return NextResponse.json(
        { error: 'adminUserId is required' },
        { status: 400 }
      )
    }

    // 检查管理员权限
    const hasPermission = await checkUserPermission(adminUserId, 'admin_panel')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const userId = params.id

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId }
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
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
    })

    return NextResponse.json(permission)

  } catch (error) {
    console.error('Error updating user limits:', error)
    return NextResponse.json(
      { error: 'Failed to update user limits' },
      { status: 500 }
    )
  }
} 