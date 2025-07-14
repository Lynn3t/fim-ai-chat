import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkUserPermission } from '@/lib/auth'
import { 
  getTokenUsageLeaderboard, 
  getModelUsageStats 
} from '@/lib/db/token-usage'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminUserId = searchParams.get('adminUserId')
    const action = searchParams.get('action')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '10')

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

    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    // 获取所有模型价格配置
    if (action === 'pricing') {
      const modelPricing = await prisma.modelPricing.findMany({
        include: {
          model: {
            select: {
              id: true,
              modelId: true,
              name: true,
              providerId: true,
              provider: {
                select: {
                  id: true,
                  name: true,
                  displayName: true
                }
              }
            }
          }
        }
      })
      
      return NextResponse.json(modelPricing)
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
    else {
      const leaderboard = await getTokenUsageLeaderboard(start, end, limit)
      return NextResponse.json(leaderboard)
    }

  } catch (error) {
    console.error('Error fetching token statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch token statistics' },
      { status: 500 }
    )
  }
} 