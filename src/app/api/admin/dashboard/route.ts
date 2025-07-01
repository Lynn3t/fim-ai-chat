import { NextRequest, NextResponse } from 'next/server'
import { getSystemStats } from '@/lib/db/admin'
import { checkUserPermission } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminUserId = searchParams.get('adminUserId')

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
