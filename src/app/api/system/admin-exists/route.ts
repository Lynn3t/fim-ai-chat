import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandler, createApiResponse } from '@/lib/api-utils'

export const GET = withErrorHandler(async (request: NextRequest) => {
  // 检查是否已有管理员用户
  const adminCount = await prisma.user.count({
    where: { role: 'ADMIN' },
  })

  return createApiResponse({
    hasAdmin: adminCount > 0,
    adminCount,
  })
})
