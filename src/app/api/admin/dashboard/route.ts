import { NextRequest, NextResponse } from 'next/server'
import { getSystemStats } from '@/lib/db/admin'
import { withAdminAuth } from '@/lib/api-utils'

async function handleGet(request: NextRequest, userId: string) {
  try {
    const systemStats = await getSystemStats()

    // 转换数据格式以匹配前端期望
    const stats = {
      totalUsers: systemStats.userCount.total,
      activeUsers: systemStats.userCount.active,
      totalTokens: systemStats.tokenUsage.totalTokens,
      totalCost: systemStats.tokenUsage.totalCost,
      todayTokens: systemStats.tokenUsage.todayTokens,
      todayCost: systemStats.tokenUsage.todayCost,
      // 包含完整的系统统计信息
      detailed: systemStats,
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handleGet)
