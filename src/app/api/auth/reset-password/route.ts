import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { handleApiError, AppError } from '@/lib/error-handler'

const schema = z.object({
  resetToken: z.string().min(1, '重置令牌不能为空'),
  newPassword: z.string().min(6, '新密码至少需要6个字符')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = schema.safeParse(body)

    if (!validation.success) {
      throw AppError.validation('输入验证失败', validation.error.errors)
    }

    const { resetToken, newPassword } = validation.data

    // 查找具有此重置令牌的用户
    const user = await prisma.user.findFirst({
      where: {
        resetToken,
        resetTokenExpiry: {
          gt: new Date() // 令牌尚未过期
        }
      }
    })

    if (!user) {
      throw AppError.badRequest('无效或已过期的重置令牌')
    }

    // 哈希新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 更新用户密码并清除重置令牌
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    })

    return NextResponse.json({
      success: true,
      message: '密码已成功重置'
    })

  } catch (error) {
    return handleApiError(error, 'POST /api/auth/reset-password')
  }
}
