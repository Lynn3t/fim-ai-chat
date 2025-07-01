import { NextRequest, NextResponse } from 'next/server'
import { 
  getTokenUsageLeaderboard, 
  getModelUsageStats 
} from '@/lib/db/token-usage'
import { checkUserPermission } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // 检查管理员权限
    const hasPermission = await checkUserPermission(userId, 'admin_panel')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    if (type === 'models') {
      // 获取模型使用统计
      const modelStats = await getModelUsageStats(start, end)
      return NextResponse.json(modelStats)
    } else {
      // 获取用户使用排行榜
      const leaderboard = await getTokenUsageLeaderboard(start, end, limit)
      return NextResponse.json(leaderboard)
    }

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
