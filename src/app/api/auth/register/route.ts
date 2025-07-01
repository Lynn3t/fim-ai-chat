import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/auth'

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

    if (!inviteCode && !accessCode) {
      return NextResponse.json(
        { error: 'Either invite code or access code is required' },
        { status: 400 }
      )
    }

    // 如果使用邀请码注册（管理员或用户），密码是必需的
    if (inviteCode && !password) {
      return NextResponse.json(
        { error: 'Password is required for invite code registration' },
        { status: 400 }
      )
    }

    const result = await registerUser({
      email,
      username,
      password,
      inviteCode,
      accessCode,
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
