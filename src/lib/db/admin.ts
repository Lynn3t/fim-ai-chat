import { prisma } from '@/lib/prisma'
import type { User, UserPermission } from '@prisma/client'

export interface UserWithStats extends User {
  permissions?: UserPermission | null
  _count?: {
    conversations: number
    messages: number
    tokenUsage: number
    generatedInvites: number
    generatedAccessCodes: number
  }
  tokenStats?: {
    totalTokens: number
    totalCost: number
  }
}

/**
 * 获取所有用户列表（管理员功能）
 */
export async function getAllUsers(options: {
  includeStats?: boolean
  role?: 'ADMIN' | 'USER' | 'GUEST'
  isActive?: boolean
  limit?: number
  offset?: number
} = {}): Promise<UserWithStats[]> {
  const { includeStats = false, role, isActive, limit = 50, offset = 0 } = options

  const whereClause: any = {}
  if (role) whereClause.role = role
  if (isActive !== undefined) whereClause.isActive = isActive

  const users = await prisma.user.findMany({
    where: whereClause,
    include: {
      permissions: true,
      ...(includeStats && {
        _count: {
          select: {
            conversations: true,
            messages: true,
            tokenUsage: true,
            generatedInvites: true,
            generatedAccessCodes: true,
          },
        },
      }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  if (includeStats) {
    // 获取token统计
    const userIds = users.map(u => u.id)
    const tokenStats = await prisma.tokenUsage.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _sum: {
        totalTokens: true,
        cost: true,
      },
    })

    const tokenStatsMap = new Map(
      tokenStats.map(stat => [
        stat.userId,
        {
          totalTokens: stat._sum.totalTokens || 0,
          totalCost: stat._sum.cost || 0,
        },
      ])
    )

    return users.map(user => ({
      ...user,
      tokenStats: tokenStatsMap.get(user.id) || { totalTokens: 0, totalCost: 0 },
    }))
  }

  return users
}

/**
 * 更新用户状态（封禁/解封）
 */
export async function updateUserStatus(
  userId: string,
  isActive: boolean
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { isActive },
  })
}

/**
 * 更新用户访问码分发权限
 */
export async function updateUserAccessCodePermission(
  userId: string,
  canShareAccessCode: boolean
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { canShareAccessCode },
  })
}

/**
 * 更新用户权限配置
 */
export async function updateUserPermissions(
  userId: string,
  data: {
    allowedModelIds?: string
    tokenLimit?: number
    canShareAccess?: boolean
    isActive?: boolean
  }
): Promise<UserPermission> {
  return prisma.userPermission.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      allowedModelIds: data.allowedModelIds || null,
      tokenLimit: data.tokenLimit || null,
      canShareAccess: data.canShareAccess ?? true,
      isActive: data.isActive ?? true,
    },
  })
}

/**
 * 删除用户（软删除，设为非活跃状态）
 */
export async function deleteUser(userId: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  })
}

/**
 * 获取系统统计信息
 */
export async function getSystemStats(): Promise<{
  userCount: {
    total: number
    admin: number
    user: number
    guest: number
    active: number
    inactive: number
  }
  tokenUsage: {
    totalTokens: number
    totalCost: number
    todayTokens: number
    todayCost: number
  }
  codeUsage: {
    totalInviteCodes: number
    usedInviteCodes: number
    totalAccessCodes: number
    activeAccessCodes: number
  }
  modelUsage: {
    totalModels: number
    activeModels: number
    totalProviders: number
    activeProviders: number
  }
}> {
  // 用户统计
  const userStats = await prisma.user.groupBy({
    by: ['role', 'isActive'],
    _count: { id: true },
  })

  const userCount = {
    total: 0,
    admin: 0,
    user: 0,
    guest: 0,
    active: 0,
    inactive: 0,
  }

  userStats.forEach(stat => {
    userCount.total += stat._count.id
    if (stat.role === 'ADMIN') userCount.admin += stat._count.id
    if (stat.role === 'USER') userCount.user += stat._count.id
    if (stat.role === 'GUEST') userCount.guest += stat._count.id
    if (stat.isActive) userCount.active += stat._count.id
    else userCount.inactive += stat._count.id
  })

  // Token使用统计
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalTokenStats, todayTokenStats] = await Promise.all([
    prisma.tokenUsage.aggregate({
      _sum: { totalTokens: true, cost: true },
    }),
    prisma.tokenUsage.aggregate({
      where: { createdAt: { gte: today } },
      _sum: { totalTokens: true, cost: true },
    }),
  ])

  const tokenUsage = {
    totalTokens: totalTokenStats._sum.totalTokens || 0,
    totalCost: totalTokenStats._sum.cost || 0,
    todayTokens: todayTokenStats._sum.totalTokens || 0,
    todayCost: todayTokenStats._sum.cost || 0,
  }

  // 邀请码和访问码统计
  const [inviteCodeStats, accessCodeStats] = await Promise.all([
    prisma.inviteCode.aggregate({
      _count: { id: true },
      where: { isUsed: true },
    }),
    prisma.accessCode.aggregate({
      _count: { id: true },
      where: { isActive: true },
    }),
  ])

  const totalInviteCodes = await prisma.inviteCode.count()
  const totalAccessCodes = await prisma.accessCode.count()

  const codeUsage = {
    totalInviteCodes,
    usedInviteCodes: inviteCodeStats._count.id,
    totalAccessCodes,
    activeAccessCodes: accessCodeStats._count.id,
  }

  // 优化的模型和提供商统计 - 使用单个查询
  const [modelCounts, providerCounts] = await Promise.all([
    prisma.model.aggregate({
      _count: {
        id: true,
      },
      where: {},
    }),
    prisma.provider.aggregate({
      _count: {
        id: true,
      },
      where: {},
    }),
  ]);

  const [activeModelCount, activeProviderCount] = await Promise.all([
    prisma.model.count({
      where: { isEnabled: true },
    }),
    prisma.provider.count({
      where: { isEnabled: true },
    }),
  ]);

  const modelUsage = {
    totalModels: modelCounts._count.id,
    activeModels: activeModelCount,
    totalProviders: providerCounts._count.id,
    activeProviders: activeProviderCount,
  }

  return {
    userCount,
    tokenUsage,
    codeUsage,
    modelUsage,
  }
}
