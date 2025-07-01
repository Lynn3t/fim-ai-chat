import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 检查是否已有管理员用户
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    })

    return NextResponse.json({
      hasAdmin: adminCount > 0,
      adminCount,
    })

  } catch (error) {
    console.error('Error checking admin existence:', error)
    return NextResponse.json(
      { error: 'Failed to check admin existence' },
      { status: 500 }
    )
  }
}
