import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import {
  getTokenUsageLeaderboard,
  getModelUsageStats
} from '@/lib/db/token-usage'
import { handleApiError, AppError } from '@/lib/error-handler'

async function handleGet(request: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '10')

    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    // 获取所有模型价格配置
    if (action === 'pricing') {
      const models = await prisma.model.findMany({
        select: {
          id: true,
          modelId: true,
          name: true,
          providerId: true,
          pricingType: true,
          inputPrice: true,
          outputPrice: true,
          usagePrice: true,
          provider: {
            select: {
              id: true,
              name: true,
              displayName: true
            }
          }
        },
        orderBy: [
          { provider: { name: 'asc' } },
          { order: 'asc' },
          { name: 'asc' }
        ]
      })

      // 格式化响应以与前端组件兼容
      const formattedModels = models.map(model => ({
        id: model.id,
        modelId: model.id,
        model: {
          id: model.id,
          modelId: model.modelId,
          name: model.name,
          providerId: model.providerId,
          provider: model.provider
        },
        pricingType: model.pricingType,
        inputPrice: model.inputPrice,
        outputPrice: model.outputPrice,
        usagePrice: model.usagePrice,
      }))

      return NextResponse.json(formattedModels)
    }
    // 获取用户列表及其限制配置
    else if (action === 'user-limits') {
      const userLimits = await prisma.userPermission.findMany({
        where: {
          OR: [
            { limitType: { not: 'none' } },
            { tokenLimit: { not: null } },
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              isActive: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })

      return NextResponse.json(userLimits)
    }
    // 获取模型使用统计
    else if (action === 'models') {
      const modelStats = await getModelUsageStats(start, end)
      return NextResponse.json(modelStats)
    }
    // 获取用户使用排行榜
    else if (action === 'users') {
      const leaderboard = await getTokenUsageLeaderboard(start, end, limit)
      return NextResponse.json(leaderboard)
    } else {
      throw AppError.badRequest('无效的 action 参数')
    }

  } catch (error) {
    return handleApiError(error, 'GET /api/admin/token-stats')
  }
}

export const GET = withAdminAuth(handleGet)
