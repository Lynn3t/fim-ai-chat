import { prisma } from '@/lib/prisma'
import { getUserAllowedModels } from '@/lib/auth'

export interface ChatPermissionCheck {
  canChat: boolean
  canSaveToDatabase: boolean
  allowedModels: string[]
  error?: string
}

/**
 * 检查用户的聊天权限
 */
export async function checkChatPermissions(
  userId: string,
  modelId: string
): Promise<ChatPermissionCheck> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { permissions: true },
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

    // 检查token限制（仅对普通用户）
    if (user.role === 'USER' && user.permissions?.tokenLimit) {
      const tokenUsage = await prisma.tokenUsage.aggregate({
        where: { userId },
        _sum: { totalTokens: true },
      })

      const usedTokens = tokenUsage._sum.totalTokens || 0
      if (usedTokens >= user.permissions.tokenLimit) {
        return {
          canChat: false,
          canSaveToDatabase: false,
          allowedModels,
          error: 'Token使用量已达上限',
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
    console.error('Error checking chat permissions:', error)
    return {
      canChat: false,
      canSaveToDatabase: false,
      allowedModels: [],
      error: '权限检查失败',
    }
  }
}

/**
 * 检查访客的宿主用户权限
 */
export async function checkGuestHostPermissions(guestUserId: string): Promise<{
  hostActive: boolean
  hostCanShare: boolean
  error?: string
}> {
  try {
    const guest = await prisma.user.findUnique({
      where: { id: guestUserId },
      include: {
        hostUser: true,
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
    console.error('Error checking guest host permissions:', error)
    return {
      hostActive: false,
      hostCanShare: false,
      error: '权限检查失败',
    }
  }
}

/**
 * 获取用户的聊天配置
 */
export async function getUserChatConfig(userId: string): Promise<{
  role: string
  canSaveToDatabase: boolean
  allowedModels: string[]
  tokenLimit?: number
  tokenUsed?: number
  hostUserId?: string
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { permissions: true },
  })

  if (!user) {
    throw new Error('用户不存在')
  }

  const allowedModels = await getUserAllowedModels(userId)
  
  let tokenUsed = 0
  if (user.permissions?.tokenLimit) {
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
