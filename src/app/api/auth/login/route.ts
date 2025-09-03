import { NextRequest, NextResponse } from 'next/server'
import { loginUser, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { username, password } = data

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    const result = await loginUser(username, password)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }

    // 生成JWT令牌
    const token = generateToken(result.user!.id);
    
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: result.user!.id,
        username: result.user!.username,
        email: result.user!.email,
        role: result.user!.role,
        isActive: result.user!.isActive,
        canShareAccessCode: result.user!.canShareAccessCode,
      },
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
