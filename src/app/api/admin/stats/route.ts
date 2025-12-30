import { NextRequest, NextResponse } from 'next/server'
import {
  getTokenUsageLeaderboard,
  getModelUsageStats
} from '@/lib/db/token-usage'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import { handleApiError } from '@/lib/error-handler'

async function handleGet(request: NextRequest, user: AuthUser) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '10')

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
    return handleApiError(error, 'GET /api/admin/stats')
  }
}

export const GET = withAdminAuth(handleGet)
