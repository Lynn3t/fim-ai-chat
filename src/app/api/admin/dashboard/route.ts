import { NextRequest, NextResponse } from 'next/server'
import { getSystemStats } from '@/lib/db/admin'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import { handleApiError } from '@/lib/error-handler'

async function handleGet(request: NextRequest, user: AuthUser) {
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
    return handleApiError(error, 'GET /api/admin/dashboard')
  }
}

export const GET = withAdminAuth(handleGet)
