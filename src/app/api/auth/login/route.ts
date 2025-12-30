import { NextRequest, NextResponse } from 'next/server'
import { loginUser, generateToken } from '@/lib/auth'
import { handleApiError, AppError } from '@/lib/error-handler'
import { validateRequest, loginSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    // 验证输入
    const { username, password } = await validateRequest(request, loginSchema)

    const result = await loginUser(username, password)

    if (!result.success) {
      throw AppError.unauthorized(result.error || '用户名或密码错误')
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
    return handleApiError(error, 'POST /api/auth/login')
  }
}
