import { NextRequest, NextResponse } from 'next/server'
import { registerUser, generateToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleApiError, AppError } from '@/lib/error-handler'
import { validateRequest, registerSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    // 验证输入
    const data = await validateRequest(request, registerSchema)
    const { email, username, password, inviteCode, accessCode } = data

    // 检查是否已有管理员用户
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    })

    // 如果还没有管理员，则允许注册第一个管理员账户，无需邀请码或访问码
    const isFirstAdmin = adminCount === 0

    if (!isFirstAdmin && !inviteCode && !accessCode) {
      throw AppError.badRequest('需要提供邀请码或访问码')
    }

    // 如果使用邀请码注册（管理员或用户），密码是必需的
    if ((inviteCode || isFirstAdmin) && !password) {
      throw AppError.badRequest('密码不能为空')
    }

    const result = await registerUser({
      email: email ?? undefined,
      username,
      password: password ?? undefined,
      inviteCode: inviteCode ?? undefined,
      accessCode: accessCode ?? undefined,
      isFirstAdmin,
    })

    if (!result.success) {
      throw AppError.badRequest(result.error || '注册失败')
    }

    // 生成JWT token
    const token = generateToken(result.user!.id)

    return NextResponse.json({
      success: true,
      user: {
        id: result.user!.id,
        username: result.user!.username,
        email: result.user!.email,
        role: result.user!.role,
      },
      token,
    }, { status: 201 })

  } catch (error) {
    return handleApiError(error, 'POST /api/auth/register')
  }
}
