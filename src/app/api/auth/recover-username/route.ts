import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError, AppError } from '@/lib/error-handler'
import { validateRequest, recoverUsernameSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const { email } = await validateRequest(request, recoverUsernameSchema)

    // 查找与邮箱关联的用户
    const user = await prisma.user.findFirst({
      where: { email }
    })

    if (!user || !user.username) {
      throw AppError.notFound('未找到与该邮箱关联的用户')
    }

    return NextResponse.json({
      success: true,
      username: user.username,
      message: '已找到与该邮箱关联的用户名'
    })

  } catch (error) {
    return handleApiError(error, 'POST /api/auth/recover-username')
  }
}
