import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/api-utils'

export const GET = withAdminAuth(async () => {
  try {
    // 测试数据库连接
    const userCount = await prisma.user.count()
    const providerCount = await prisma.provider.count()
    const modelCount = await prisma.model.count()

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      data: {
        users: userCount,
        providers: providerCount,
        models: modelCount,
      },
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
})
