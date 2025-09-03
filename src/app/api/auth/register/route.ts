import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { email, username, password, inviteCode, accessCode } = data

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    // 检查是否已有管理员用户
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    })

    // 如果还没有管理员，则允许注册第一个管理员账户，无需邀请码或访问码
    const isFirstAdmin = adminCount === 0

    if (!isFirstAdmin && !inviteCode && !accessCode) {
      return NextResponse.json(
        { error: 'Either invite code or access code is required' },
        { status: 400 }
      )
    }

    // 如果使用邀请码注册（管理员或用户），密码是必需的
    if ((inviteCode || isFirstAdmin) && !password) {
      return NextResponse.json(
        { error: 'Password is required for registration' },
        { status: 400 }
      )
    }

    const result = await registerUser({
      email,
      username,
      password,
      inviteCode,
      accessCode,
      isFirstAdmin, // 传递参数给注册函数
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: result.user!.id,
        username: result.user!.username,
        email: result.user!.email,
        role: result.user!.role,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
