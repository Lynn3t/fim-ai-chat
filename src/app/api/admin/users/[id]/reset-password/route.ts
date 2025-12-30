import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, type AuthUser } from '@/lib/auth-middleware'
import { handleApiError, AppError } from '@/lib/error-handler'
import bcrypt from 'bcryptjs'

// 管理员重置用户密码
async function resetPasswordHandler(
  request: NextRequest,
  user: AuthUser,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json()
    const { newPassword } = data
    const { id: targetUserId } = await params

    if (!newPassword || newPassword.length < 6) {
      throw AppError.badRequest('密码长度至少需要6个字符')
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!user) {
      throw AppError.notFound('用户不存在')
    }

    // 对新密码进行哈希处理
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 更新用户密码
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        password: hashedPassword
      }
    })

    return NextResponse.json({
      success: true,
      message: '密码已成功重置'
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/users/[id]/reset-password')
  }
}

export const POST = withAdminAuth(resetPasswordHandler)
