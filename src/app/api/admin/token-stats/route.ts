import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/api-utils'
import { 
  getTokenUsageLeaderboard, 
  getModelUsageStats 
} from '@/lib/db/token-usage'

async function handleGet(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log('GET /api/admin/token-stats params:', { userId, action, startDate, endDate, limit })

    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    // 获取所有模型价格配置
    if (action === 'pricing') {
      try {
        console.log('Fetching models for pricing data')
        
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
        
        console.log(`Found ${models.length} models for pricing data`)
        
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
      } catch (error) {
        console.error('Error fetching models for pricing:', error)
        throw error
      }
    }
    // 获取用户列表及其限制配置
    else if (action === 'user-limits') {
      try {
        console.log('Fetching user limits data')
        
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
        
        console.log(`Found ${userLimits.length} user limits records`)
        return NextResponse.json(userLimits)
      } catch (error) {
        console.error('Error fetching user limits:', error)
        throw error
      }
    }
    // 获取模型使用统计
    else if (action === 'models') {
      try {
        console.log('Fetching models usage stats')
        const modelStats = await getModelUsageStats(start, end)
        console.log(`Found ${modelStats.length} model usage stats records`)
        return NextResponse.json(modelStats)
      } catch (error) {
        console.error('Error fetching model usage stats:', error)
        throw error
      }
    }
    // 获取用户使用排行榜
    else if (action === 'users') {
      try {
        console.log('Fetching user usage leaderboard')
        const leaderboard = await getTokenUsageLeaderboard(start, end, limit)
        console.log(`Found ${leaderboard.length} user usage records`)
        return NextResponse.json(leaderboard)
      } catch (error) {
        console.error('Error fetching user usage leaderboard:', error)
        throw error
      }
    } else {
      return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error fetching token statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch token statistics', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handleGet) 