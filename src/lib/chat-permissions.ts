import { prisma } from '@/lib/prisma'
import { getUserAllowedModels } from '@/lib/auth'
import type { UserRole } from '@prisma/client'
import { updateUserTokenUsage, checkAndResetLimits } from '@/lib/db/token-usage'
import logger from '@/lib/logger'

export interface ChatPermissionCheck {
  canChat: boolean
  canSaveToDatabase: boolean
  allowedModels: string[]
  error?: string
}

/**
 * 检查用户的聊天权限 - 优化版本
 */
export async function checkChatPermissions(
  userId: string,
  modelId: string
): Promise<ChatPermissionCheck> {
  try {
    // 单次查询获取用户信息、权限和设置
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: true,
        settings: true,
        hostUser: {
          select: {
            id: true,
            isActive: true,
            canShareAccessCode: true,
          }
        }
      },
    })

    if (!user) {
      return {
        canChat: false,
        canSaveToDatabase: false,
        allowedModels: [],
        error: '用户不存在',
      }
    }

    if (!user.isActive) {
      return {
        canChat: false,
        canSaveToDatabase: false,
        allowedModels: [],
        error: '用户已被封禁',
      }
    }

    // 获取用户允许使用的模型
    const allowedModels = await getUserAllowedModels(userId)

    // 检查模型权限
    if (!allowedModels.includes(modelId)) {
      return {
        canChat: false,
        canSaveToDatabase: false,
        allowedModels,
        error: '没有权限使用该模型',
      }
    }

    // 检查用户权限配置
    if (user.permissions) {
      // 先检查是否需要重置限制
      await checkAndResetLimits(userId)

      // 检查token限制
      if (user.permissions.limitType === 'token' && user.permissions.tokenLimit) {
        if (user.permissions.tokenUsed >= user.permissions.tokenLimit) {
          return {
            canChat: false,
            canSaveToDatabase: false,
            allowedModels,
            error: `Token使用量已达上限（${user.permissions.tokenUsed}/${user.permissions.tokenLimit}）`,
          }
        }
      }
      
      // 检查成本限制 - 优化查询，只获取必要的成本数据
      if (user.permissions.limitType === 'cost' && user.permissions.costLimit) {
        const periodStart = user.permissions.lastResetAt;
        const costStats = await prisma.tokenUsage.aggregate({
          where: {
            userId,
            createdAt: { gte: periodStart },
            cost: { gt: 0 } // 只查询有成本的记录
          },
          _sum: { cost: true }
        });
        
        const totalCost = costStats._sum.cost || 0;
        
        if (totalCost >= user.permissions.costLimit) {
          return {
            canChat: false,
            canSaveToDatabase: false,
            allowedModels,
            error: `成本使用已达上限（$${totalCost.toFixed(2)}/$${user.permissions.costLimit.toFixed(2)}）`,
          }
        }
      }
    }

    // 确定是否可以保存到数据库
    const canSaveToDatabase = user.role !== 'GUEST'

    return {
      canChat: true,
      canSaveToDatabase,
      allowedModels,
    }

  } catch (error) {
    logger.error('Error checking chat permissions', error, 'PERMISSIONS')
    return {
      canChat: false,
      canSaveToDatabase: false,
      allowedModels: [],
      error: '权限检查失败',
    }
  }
}

/**
 * 检查访客的宿主用户权限 - 优化版本
 */
export async function checkGuestHostPermissions(guestUserId: string): Promise<{
  hostActive: boolean
  hostCanShare: boolean
  error?: string
}> {
  try {
    // 优化查询，只获取必要字段
    const guest = await prisma.user.findUnique({
      where: { id: guestUserId },
      select: {
        role: true,
        hostUser: {
          select: {
            isActive: true,
            canShareAccessCode: true,
          }
        }
      },
    })

    if (!guest || guest.role !== 'GUEST') {
      return {
        hostActive: false,
        hostCanShare: false,
        error: '不是有效的访客用户',
      }
    }

    if (!guest.hostUser) {
      return {
        hostActive: false,
        hostCanShare: false,
        error: '找不到宿主用户',
      }
    }

    return {
      hostActive: guest.hostUser.isActive,
      hostCanShare: guest.hostUser.canShareAccessCode,
    }

  } catch (error) {
    logger.error('Error checking guest host permissions', error, 'PERMISSIONS')
    return {
      hostActive: false,
      hostCanShare: false,
      error: '权限检查失败',
    }
  }
}

/**
 * 获取用户的聊天配置 - 优化版本
 */
export async function getUserChatConfig(userId: string): Promise<{
  role: string
  canSaveToDatabase: boolean
  allowedModels: string[]
  tokenLimit?: number
  tokenUsed?: number
  hostUserId?: string
}> {
  // 单次查询获取用户信息、权限和设置
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      permissions: {
        select: {
          tokenLimit: true,
          tokenUsed: true,
        }
      },
      settings: {
        select: {
          messagePageSize: true,
          enableMarkdown: true,
          enableLatex: true,
        }
      }
    },
  })

  if (!user) {
    throw new Error('用户不存在')
  }

  const allowedModels = await getUserAllowedModels(userId)
  
  let tokenUsed = 0
  if (user.permissions?.tokenLimit) {
    // 优化查询，只获取token总数
    const tokenUsage = await prisma.tokenUsage.aggregate({
      where: { userId },
      _sum: { totalTokens: true },
    })
    tokenUsed = tokenUsage._sum.totalTokens || 0
  }

  return {
    role: user.role,
    canSaveToDatabase: user.role !== 'GUEST',
    allowedModels,
    tokenLimit: user.permissions?.tokenLimit || undefined,
    tokenUsed,
    hostUserId: user.hostUserId || undefined,
  }
}
