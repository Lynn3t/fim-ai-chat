import { NextRequest, NextResponse } from 'next/server'
import { getUserTokenStats } from '@/lib/db/token-usage'
import { getUserInviteCodes, getUserAccessCodes } from '@/lib/db/codes'
import { getUserAllowedModels } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: true,
        settings: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 获取用户的token统计
    const tokenStats = await getUserTokenStats(userId)

    // 获取用户创建的邀请码和访问码
    const [inviteCodes, accessCodes] = await Promise.all([
      getUserInviteCodes(userId),
      getUserAccessCodes(userId),
    ])

    // 获取用户允许使用的模型
    const allowedModels = await getUserAllowedModels(userId)
    const models = await prisma.model.findMany({
      where: { 
        id: { in: allowedModels },
        isEnabled: true,
      },
      include: { provider: true },
      orderBy: [
        { provider: { order: 'asc' } },
        { order: 'asc' },
      ],
    })

    // 如果是访客，获取宿主用户的token统计
    let hostTokenStats = null
    if (user.role === 'GUEST' && user.hostUserId) {
      hostTokenStats = await getUserTokenStats(user.hostUserId)
    }

    const dashboard = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        canShareAccessCode: user.canShareAccessCode,
        createdAt: user.createdAt,
      },
      permissions: user.permissions,
      settings: user.settings,
      tokenStats,
      hostTokenStats,
      inviteCodes: inviteCodes.map(code => ({
        id: code.id,
        code: code.code,
        isUsed: code.isUsed,
        maxUses: code.maxUses,
        currentUses: code.currentUses,
        expiresAt: code.expiresAt,
        createdAt: code.createdAt,
      })),
      accessCodes: accessCodes.map(code => ({
        id: code.id,
        code: code.code,
        isActive: code.isActive,
        maxUses: code.maxUses,
        currentUses: code.currentUses,
        allowedModelIds: code.allowedModelIds,
        expiresAt: code.expiresAt,
        createdAt: code.createdAt,
      })),
      allowedModels: models,
    }

    return NextResponse.json(dashboard)

  } catch (error) {
    console.error('Error fetching user dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user dashboard' },
      { status: 500 }
    )
  }
}
