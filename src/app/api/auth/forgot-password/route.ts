import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { handleApiError, AppError } from '@/lib/error-handler'

const schema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  verificationType: z.enum(['password', 'email']),
  password: z.string().optional(),
  email: z.string().email().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = schema.safeParse(body)

    if (!validation.success) {
      throw AppError.validation('输入验证失败', validation.error.errors)
    }

    const { username, verificationType, password, email } = validation.data

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      throw AppError.notFound('用户不存在')
    }

    // 根据验证类型进行验证
    let isVerified = false

    if (verificationType === 'password' && password) {
      if (!user.password) {
        throw AppError.badRequest('此账户没有设置密码，请使用邮箱验证')
      }
      const passwordMatch = await bcrypt.compare(password, user.password)
      isVerified = passwordMatch
    } else if (verificationType === 'email' && email) {
      if (!user.email) {
        throw AppError.badRequest('此账户没有关联邮箱，请使用密码验证')
      }
      isVerified = user.email.toLowerCase() === email.toLowerCase()
    }

    if (!isVerified) {
      throw AppError.badRequest(verificationType === 'password' ? '密码不正确' : '邮箱不匹配')
    }

    // 生成重置令牌
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1小时有效期

    // 保存重置令牌到数据库
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    })

    return NextResponse.json({
      success: true,
      resetToken,
      message: '验证成功，请设置新密码'
    })

  } catch (error) {
    return handleApiError(error, 'POST /api/auth/forgot-password')
  }
}
